import { logger } from './logger.js';

// ====================================================
// 📱 AfroMessage SMS Provider (Ethiopia)
// Sign up free at: https://afromessage.com
// Get your API token from the dashboard → API
// ====================================================

const AFRO_TOKEN = process.env.AFRO_SMS_TOKEN || '';
const AFRO_IDENTIFIER_ID = process.env.AFRO_IDENTIFIER_ID || ''; // From AfroMessage dashboard
const AFRO_SENDER_NAME = process.env.AFRO_SENDER_NAME || ''; // Your approved sender name

/**
 * Masks a phone number for logging — keeps enough to correlate/debug a
 * delivery issue without putting a full PII phone number in the log drain.
 * e.g. 251912345678 -> 2519****5678
 */
function maskPhone(msisdn: string): string {
  if (msisdn.length <= 6) return '*'.repeat(msisdn.length);
  return `${msisdn.slice(0, 4)}${'*'.repeat(msisdn.length - 8)}${msisdn.slice(-4)}`;
}

/**
 * Normalizes an Ethiopian phone number to the 251XXXXXXXXX format
 */
function normalizeEthiopianPhone(to: string): string {
  let msisdn = to.replace(/\D/g, ''); // Strip all non-digits

  if (msisdn.startsWith('09') || msisdn.startsWith('07')) {
    // 09XXXXXXXX → 2519XXXXXXXX
    msisdn = '251' + msisdn.substring(1);
  } else if ((msisdn.startsWith('9') || msisdn.startsWith('7')) && msisdn.length === 9) {
    // 9XXXXXXXX → 2519XXXXXXXX
    msisdn = '251' + msisdn;
  } else if (msisdn.startsWith('+251')) {
    // +251... → 251...
    msisdn = msisdn.substring(1);
  }
  // If already 251XXXXXXXXX (12 digits), leave as-is

  return msisdn;
}

/**
 * Sends an SMS via AfroMessage API
 * Docs: https://afromessage.com/developers
 */
export const sendSMS = async (to: string, message: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const msisdn = normalizeEthiopianPhone(to);
    const maskedPhone = maskPhone(msisdn);

    // Previously logged the full phone number and full message body on
    // every send (both via console.log and logger.info) — that's PII
    // sitting in the log drain. Log a masked phone and message length only.
    console.log(`\n📬 [SMS AfroMessage] Sending → ${maskedPhone} (${message.length} chars)`);

    if (!AFRO_TOKEN) {
      console.warn('⚠️ [SMS] AFRO_SMS_TOKEN is not set. Add it to your .env file!');
      console.log(`📋 [SMS FAKE-SEND] Would send to ${maskedPhone} (${message.length} chars)`);
      return { success: false, error: 'Missing AFRO_SMS_TOKEN' };
    }

    // AfroMessage API endpoint
    const url = new URL('https://api.afromessage.com/api/send');
    if (AFRO_IDENTIFIER_ID) {
      url.searchParams.append('from', AFRO_IDENTIFIER_ID);
    }
    if (AFRO_SENDER_NAME) {
      url.searchParams.append('sender', AFRO_SENDER_NAME);
    }
    url.searchParams.append('to', msisdn);
    url.searchParams.append('message', message.substring(0, 480));
    url.searchParams.append('callback', '');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AFRO_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json() as any;
    // Log the acknowledge/status code only, not the full response body —
    // AfroMessage's response can echo the message content back.
    console.log('[DEBUG SMS] AfroMessage acknowledge:', result?.acknowledge ?? result?.response?.acknowledge ?? 'unknown');

    // AfroMessage returns { acknowledge: 'success' } on success
    if (result?.acknowledge === 'success' || result?.response?.acknowledge === 'success') {
      logger.info({ maskedPhone }, '✅ [SMS AfroMessage] Delivered successfully');
      console.log(`✅ [SMS] Successfully sent to ${maskedPhone}`);
      return { success: true };
    } else {
      logger.error({ maskedPhone, acknowledge: result?.acknowledge }, '❌ [SMS AfroMessage] Gateway rejection');
      console.error(`❌ [SMS] Failed for ${maskedPhone}`);
      return { success: false, error: result };
    }

  } catch (error: any) {
    logger.error({ err: error.message, maskedPhone: maskPhone(normalizeEthiopianPhone(to)) }, '🔥 [SMS AfroMessage] Network failure');
    console.error(`🔥 [SMS] Exception for ${maskPhone(normalizeEthiopianPhone(to))}:`, error.message);
    return { success: false, error: error.message };
  }
};
