import { Request, Response } from 'express';
import crypto from 'crypto';
import { clerkConfig } from '@ethio-logistics/env';
import User from '../models/User.js';
import type { WebhookEvent } from '@clerk/express';

/**
 * PRODUCTION-HARDENED Clerk Webhook Handler
 */
export const handleClerkWebhook = async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = clerkConfig.webhookSecret;

  if (!WEBHOOK_SECRET) {
    console.error('❌ CRITICAL: CLERK_WEBHOOK_SIGNING_SECRET is missing from .env');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing security headers' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    console.error('❌ FAILED: rawBody buffer not detected.');
    return res.status(500).json({ error: 'Failed to process request correctly' });
  }

  try {
    const secret = WEBHOOK_SECRET.replace('whsec_', '');
    const secretBytes = Buffer.from(secret, 'base64');
    const toSign = `${svix_id}.${svix_timestamp}.${rawBody}`;

    const hmac = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
    const hmacBuffer = Buffer.from(hmac);
    const passedSignatures = svix_signature.split(' ');
    const isVerified = passedSignatures.some((s) => {
      const [version, signature] = s.split(',');
      if (version !== 'v1' || !signature) return false;
      const sigBuffer = Buffer.from(signature);
      // Lengths must match before timingSafeEqual is called (it throws otherwise);
      // this length check leaks negligible info compared to the prior full string compare.
      if (sigBuffer.length !== hmacBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, hmacBuffer);
    });

    if (!isVerified) {
      throw new Error('No matching signature found');
    }

    const evt = JSON.parse(rawBody.toString()) as WebhookEvent;
    const { id: clerkId } = evt.data as any;
    const eventType = evt.type;

    console.info(`📡 Clerk Webhook: ${eventType} [User: ${clerkId}]`);

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { email_addresses, first_name, last_name, phone_numbers, public_metadata, unsafe_metadata } =
        evt.data as any;
      const email = email_addresses?.[0]?.email_address || `test-${clerkId}@clerk.dev`;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'Awaiting Name';
      const phoneNumber = phone_numbers?.[0]?.phone_number || '+251000000000';

      // public_metadata is set by trusted backend/admin code — always honor it if present.
      // unsafe_metadata is client-writable at signUp.create() time, so it's the only role hint
      // available for a brand-new rider signup before our backend has ever seen the user.
      // We only trust it to grant RIDER (the least-privileged role) — never MERCHANT or ADMIN —
      // so a malicious client can't self-elevate via unsafe_metadata.
      const publicRole = (public_metadata?.role as string)?.toUpperCase();
      const unsafeRole = (unsafe_metadata?.role as string)?.toUpperCase();
      const validRoles = ['MERCHANT', 'RIDER', 'ADMIN'];

      let resolvedRole: string | undefined;
      if (validRoles.includes(publicRole)) {
        resolvedRole = publicRole;
      } else if (unsafeRole === 'RIDER') {
        resolvedRole = 'RIDER';
      }

      const existingUser = await User.findOne({ clerkId });

      if (!existingUser) {
        // Creation: default to RIDER (the least-privileged role) if no valid hint was given at all.
        await User.create({
          clerkId,
          email,
          fullName,
          phoneNumber,
          role: resolvedRole || 'RIDER',
        });
      } else {
        // Update: never silently overwrite an existing user's role. Only apply a role change
        // if a trusted public_metadata role hint was explicitly provided.
        const update: Record<string, unknown> = { email, fullName, phoneNumber };
        if (validRoles.includes(publicRole)) {
          update.role = publicRole;
        }
        await User.findOneAndUpdate({ clerkId }, update, { new: true, runValidators: true });
      }
    }

    if (eventType === 'user.deleted') {
      // ✅ SOFT DELETE — stamp the timestamp but preserve the document.
      // This keeps all order history, revenue records, and audit trails intact.
      // Orders still have a valid merchant/rider reference and won't break.
      await User.findOneAndUpdate(
        { clerkId },
        { deletedAt: new Date() },
        { new: true }
      );
      console.info(`🗑️ [Webhook] User ${clerkId} soft-deleted. Orders preserved.`);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature. Request rejected.' });
  }
};
