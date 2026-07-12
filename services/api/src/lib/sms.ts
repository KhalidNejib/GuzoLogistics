import { logger } from './logger.js';

// ====================================================
// 📱 AfroMessage SMS Provider (Ethiopia)
// Sign up free at: https://afromessage.com
// Get your API token from the dashboard → API
// ====================================================

const AFRO_TOKEN = process.env.AFRO_SMS_TOKEN || '';
const AFRO_IDENTIFIER_ID = process.env.AFRO_IDENTIFIER_ID || ''; // From AfroMessage dashboard
const AFRO_SENDER_NAME = process.env.AFRO_SENDER_NAME || 'EthioLog'; // Your approved sender name

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

    console.log(`\n📬 [SMS AfroMessage] Sending → ${msisdn}`);
    console.log(`📝 [SMS AfroMessage] Message: "${message.substring(0, 60)}..."`);

    if (!AFRO_TOKEN) {
      console.warn('⚠️ [SMS] AFRO_SMS_TOKEN is not set. Add it to your .env file!');
      console.log(`📋 [SMS FAKE-SEND] Would send to ${msisdn}: "${message}"`);
      return { success: false, error: 'Missing AFRO_SMS_TOKEN' };
    }

    // AfroMessage API endpoint
    const url = new URL('https://api.afromessage.com/api/send');
    if (AFRO_IDENTIFIER_ID) {
      url.searchParams.append('from', AFRO_IDENTIFIER_ID);
    }
    url.searchParams.append('sender', AFRO_SENDER_NAME);
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
    console.log('[DEBUG SMS] AfroMessage Response:', JSON.stringify(result));

    // AfroMessage returns { acknowledge: 'success' } on success
    if (result?.acknowledge === 'success' || result?.response?.acknowledge === 'success') {
      logger.info({ msisdn, result }, '✅ [SMS AfroMessage] Delivered successfully');
      console.log(`✅ [SMS] Successfully sent to ${msisdn}`);
      return { success: true };
    } else {
      logger.error({ msisdn, result }, '❌ [SMS AfroMessage] Gateway rejection');
      console.error(`❌ [SMS] Failed for ${msisdn}:`, result);
      return { success: false, error: result };
    }

  } catch (error: any) {
    logger.error({ err: error.message, to }, '🔥 [SMS AfroMessage] Network failure');
    console.error(`🔥 [SMS] Exception for ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};
