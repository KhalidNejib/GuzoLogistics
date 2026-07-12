import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Incident from '../models/Incident.js';
import { z } from 'zod';

const incidentSchema = z.object({
  type: z.enum(['SOS', 'Traffic Accident', 'Merchant Dispute', 'App Malfunction', 'Other']),
  description: z.string().min(5),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

/**
 * @route   POST /api/incidents
 * @desc    File a new incident report or trigger SOS
 * @access  Private (Rider only)
 */
export const createIncident = async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    if (!riderId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const validated = incidentSchema.parse(req.body);

    const incidentData: any = {
      rider: riderId,
      type: validated.type,
      description: validated.description,
    };

    if (validated.location) {
      incidentData.location = {
        type: 'Point',
        coordinates: [validated.location.lng, validated.location.lat]
      };
    }

    const newIncident = new Incident(incidentData);
    await newIncident.save();

    console.info(`🚨 [Incident] Created ${validated.type} for Rider ${riderId}`);

    const io = req.app.get('socketio');
    if (io) {
      const incidentPayload = {
        incidentId: newIncident._id,
        riderId,
        riderName: req.user?.fullName,
        type: validated.type,
        description: validated.description,
        location: validated.location,
        timestamp: new Date().toISOString()
      };

      // 1. Notify the Merchant "Owner" (Parent Fleet)
      import('../models/RiderProfile.js').then(async ({ default: RiderProfile }) => {
        const profile = await RiderProfile.findOne({ user: riderId }).select('merchant').lean() as any;
        if (profile?.merchant) {
          io.to(`merchant:${profile.merchant.toString()}`).emit('emergency_sos', incidentPayload);
        }
      });

      // 2. If SOS, maintain legacy broadcasts to active stakeholders
      if (validated.type === 'SOS') {
        io.to('admin:dispatch').emit('emergency_sos', incidentPayload);

        import('../models/Order.js').then(async ({ default: Order }) => {
          const activeOrders = await Order.find({ 
            rider: riderId, 
            status: { $in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } 
          }).lean();

          const merchantIds = [...new Set(activeOrders.map(o => o.merchant?.toString()))];
          merchantIds.forEach(mId => {
            if (mId) io.to(`merchant:${mId}`).emit('emergency_sos', incidentPayload);
          });
        });
      }
    }

    return res.status(201).json(newIncident);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    console.error('❌ [Incident Error]:', error);
    return res.status(500).json({ error: 'Failed to file incident report' });
  }
};

/**
 * @route   GET /api/incidents
 * @desc    Get all incidents for the merchant's fleet
 */
export const getIncidents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Get the list of riders in this merchant's fleet
    const { default: RiderProfile } = await import('../models/RiderProfile.js');
    const profiles = await RiderProfile.find({ merchant: userId }).select('user').lean();
    const riderIds = profiles.map(p => p.user);

    // 2. Get incidents for these riders
    const incidents = await Incident.find({ 
      rider: { $in: riderIds } 
    })
    .populate('rider', 'fullName phoneNumber')
    .sort({ createdAt: -1 })
    .limit(50);

    return res.json(incidents);
  } catch (error) {
    console.error('❌ [GetIncidents Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

/**
 * @route   PATCH /api/incidents/:id/resolve
 * @desc    Mark an incident as resolved
 */
export const resolveIncident = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    // Tenant check: a MERCHANT may only resolve incidents raised by riders in
    // their own fleet. ADMIN bypasses this (requireRole already lets ADMIN
    // through, but that only checks role, not ownership — this is the actual
    // ownership check the route comment used to claim already existed).
    if (userRole !== 'ADMIN') {
      const { default: RiderProfile } = await import('../models/RiderProfile.js');
      const ownsRider = await RiderProfile.exists({ user: incident.rider, merchant: userId });
      if (!ownsRider) {
        return res.status(403).json({ error: 'You do not have permission to resolve this incident.' });
      }
    }

    incident.status = 'RESOLVED';
    await incident.save();

    return res.json(incident);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve incident' });
  }
};
