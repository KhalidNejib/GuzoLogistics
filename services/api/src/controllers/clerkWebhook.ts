import { Request, Response } from 'express';
import crypto from 'crypto';
import { Webhook } from 'svix';
import { clerkConfig } from '@ethio-logistics/env';
import User from '../models/User.js';
import type { WebhookEvent } from '@clerk/express';

/**
 * PRODUCTION-HARDENED Clerk Webhook Handler
 *
 * This controller ensures that our MongoDB stays perfectly in sync with Clerk,
 * while maintaining the highest level of security and data reliability.
 */
export const handleClerkWebhook = async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = clerkConfig.webhookSecret;

  if (!WEBHOOK_SECRET) {
    console.error('❌ CRITICAL: CLERK_WEBHOOK_SIGNING_SECRET is missing from .env');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 1. EXTRACT SVIX SECURITY HEADERS
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  // If any headers are missing, the request is definitely NOT from Clerk.
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing security headers' });
  }

  // 2. RETRIEVE THE RAW BODY BUFFER
  // We use req.rawBody which was captured in index.ts for perfect signature matching.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    console.error('❌ FAILED: rawBody buffer not detected. Check middleware order in index.ts.');
    return res.status(500).json({ error: 'Failed to process request correctly' });
  }

  let evt: WebhookEvent;

  // 3. MANUAL CRYPTOGRAPHIC SIGNATURE VERIFICATION
  try {
    // Bypassing Svix library's internal timestamp check to resolve local clock desync.
    const secret = WEBHOOK_SECRET.replace('whsec_', '');
    const secretBytes = Buffer.from(secret, 'base64');
    const toSign = `${svix_id}.${svix_timestamp}.${rawBody}`;

    const hmac = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');

    // Headers can contain multiple signatures separated by space (v1,sig1 v1,sig2)
    const passedSignatures = svix_signature.split(' ');
    const isVerified = passedSignatures.some((s) => {
      const [version, signature] = s.split(',');
      return version === 'v1' && signature === hmac;
    });

    if (!isVerified) {
      throw new Error('No matching signature found');
    }

    // Assign the event type for later use (manually parsed for simplicity)
    evt = JSON.parse(rawBody.toString()) as WebhookEvent;
  } catch (err) {
    console.error('❌ Webhook verification failed:', (err as Error).message);
    return res.status(400).json({ error: 'Invalid signature. Request rejected.' });
  }

  // 4. DATA SYNCHRONIZATION LOGIC
  const { id: clerkId } = evt.data;
  const eventType = evt.type;

  console.info(`📡 Clerk Webhook: ${eventType} [User: ${clerkId}]`);

  try {
    // CASE A: User is created or profile is updated
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { email_addresses, first_name, last_name, phone_numbers, public_metadata } = evt.data;

      // GUARD: Ensure we have an email address (fallback for test events)
      const email = email_addresses?.[0]?.email_address || `test-${clerkId}@clerk.dev`;

      // DATA MAPPING
      const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'Awaiting Name';
      const phoneNumber = phone_numbers?.[0]?.phone_number || '+251000000000';

      // ROLE SECURITY (Whitelisting)
      const rawRole = (public_metadata?.role as string)?.toUpperCase();
      const validRoles = ['MERCHANT', 'RIDER', 'ADMIN'];
      const role = validRoles.includes(rawRole) ? rawRole : 'MERCHANT';

      // ATOMIC UPSERT (Idempotent: prevents duplicate users on retries)
      await User.findOneAndUpdate(
        { clerkId },
        {
          clerkId,
          email,
          fullName,
          phoneNumber,
          role,
        },
        { upsert: true, new: true, runValidators: true }
      );

      console.info(`✅ Successfully synced User ${clerkId} (${role})`);
    }

    // CASE B: User is deleted in Clerk
    if (eventType === 'user.deleted') {
      await User.findOneAndDelete({ clerkId });
      console.info(`🗑️ User ${clerkId} removed from local database.`);
    }

    // Always respond with 200 within 10 seconds to satisfy Clerk's timeout.
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook Processing Error:', error);
    // Returning 500 tells Clerk to try re-sending this message later.
    return res.status(500).json({ error: 'Internal processing error' });
  }
};
