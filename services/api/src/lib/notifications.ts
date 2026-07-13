import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import User from '../models/User.js';
import { logger } from './logger.js';
import { sendSMS } from './sms.js';

const expo = new Expo();

// 🇪🇹 LOCALIZATION DICTIONARY (Amharic + English)
export const STRINGS = {
  NEW_MISSION: {
    en: { title: '🚀 New Mission Available', body: 'New pickup at {address}. Earning: ETB {amount}' },
    am: { title: '🚀 አዲስ ተልዕኮ አለ', body: 'በ {address} መጫን አለብዎት። ክፍያ: ETB {amount}' },
  },
  MISSION_ACCEPTED: {
    en: { title: '🚀 Mission Accepted', body: 'Great news! {rider} has accepted your order and is on the way.' },
    am: { title: '🚀 ተልዕኮ ተቀባይነት አግኝቷል', body: 'ጥሩ ዜና! {rider} ትዕዛዝዎን ተረክቧል፣ በመንገድ ላይ ነው።' },
  },
  RIDER_ARRIVED: {
    en: { title: '📍 Rider Arrived', body: '{rider} has arrived at the {location} for order #{orderId}.' },
    am: { title: '📍 ሹፌሩ ደርሷል', body: '{rider} ትዕዛዝ #{orderId} ለመረከብ {location} ደርሷል።' },
  },
  RIDER_NEARBY: {
    en: { title: '🛵 Rider Nearby', body: 'Your rider is less than 500m away from {location}. Get ready!' },
    am: { title: '🛵 ሹፌሩ ቀርቧል', body: 'ሹፌሩ ከ{location} በ500 ሜትር ያነሰ ርቀት ላይ ነው። ይዘጋጁ!' },
  },
  ORDER_COLLECTED: {
    en: { title: '📦 Order Collected', body: 'Items for #{orderId} have been collected and are now in transit.' },
    am: { title: '📦 ትዕዛዝ ተረክቧል', body: 'የትዕዛዝ #{orderId} እቃዎች ተረክበዋል፣ በመጓጓዝ ላይ ነው።' },
  },
  MISSION_SUCCESS: {
    en: { title: '✅ Mission Success', body: 'Order #{orderId} was successfully delivered by {rider}.' },
    am: { title: '✅ ተልዕኮ ተሳክቷል', body: 'ትዕዛዝ #{orderId} በ{rider} በተሳካ ሁኔታ ደርሷል።' },
  },
  ARRIVED_PICKUP: {
    en: { title: '📍 Arrived at Pickup', body: '{rider} has arrived at {location} to collect order #{orderId}.' },
    am: { title: '📍 ለመረከብ ደርሷል', body: '{rider} ትዕዛዝ #{orderId} ለመረከብ {location} ደርሷል።' },
  },
  ARRIVED_DELIVERY: {
    en: { title: '📍 Arrived at Destination', body: '{rider} has arrived at {location} for delivery of #{orderId}.' },
    am: { title: '📍 ለመረከብ ደርሷል', body: '{rider} ትዕዛዝ #{orderId} ለማድረስ {location} ደርሷል።' },
  },
  SETTLEMENT_APPROVED: {
    en: { title: '💚 Debt Cleared!', body: 'Your ETB {amount} Telebirr repayment was verified and accepted. Your debt is now cleared.' },
    am: { title: '💚 빚 ተወረወረ!', body: 'ETB {amount} Telebirr ክፍያዎ ተረጋግጦ ተቀbyteytel።빚ዎ አሁን ጸድቷል።' },
  },
  SETTLEMENT_REJECTED: {
    en: { title: '❌ Settlement Rejected', body: 'Your ETB {amount} repayment request was rejected. Please contact the office or resubmit with a valid Telebirr ID.' },
    am: { title: '❌ ክፍያ ውድቅ ተደርጓል', body: 'ETB {amount} የክፍያ ጥያቄዎ ውድቅ ተደርጓል። ቢሮ ያናግሩ ወይም ትክክለኛ ማጣቀሻ ቁጥር በድጋሚ ያስገቡ።' },
  },
};

type MessageKey = keyof typeof STRINGS;

export const sendPushNotification = async (userId: string, title: string, body: string, data?: any) => {
  try {
    const user = await User.findById(userId).select('expoPushToken expoPushTokens language').lean() as any;
    if (!user) {
      logger.info({ userId }, '[Push] Skipping: User not found');
      return;
    }

    const tokens: string[] = [];
    if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
      tokens.push(user.expoPushToken);
    }
    if (Array.isArray(user.expoPushTokens)) {
      user.expoPushTokens.forEach((t: string) => {
        if (t && Expo.isExpoPushToken(t) && !tokens.includes(t)) {
          tokens.push(t);
        }
      });
    }

    if (tokens.length === 0) {
      logger.info({ userId }, '[Push] Skipping: No tokens found');
      return;
    }

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default', // For Android notification channels
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
        logger.info({ userId, count: chunk.length }, '📲 [Push] Notifications dispatched');
      } catch (error: any) {
        logger.error({ err: error.message }, '[Push] Chunk Error');
      }
    }
  } catch (error: any) {
    logger.error({ err: error.message }, '[Push] Top-level Failure');
  }
};

/**
 * Robust Multi-Channel Order Update Helper
 */
export const notifyOrderUpdate = async (
  userId: string,
  event: MessageKey,
  params: Record<string, string>,
  data?: any,
  io?: any,
  customerPhone?: string
) => {
  logger.info({ event, customerPhone, userId }, '🔔 [Notify] Entry point reached');
  const user = await User.findById(userId).select('language').lean() as any;
  const lang = (user?.language === 'am' ? 'am' : 'en') as 'en' | 'am';

  // ── Safety Guard: Prevent crash if event key is missing ───────────────────
  if (!STRINGS[event]) {
    logger.warn({ event }, '⚠️ [Notify] Undefined event key. Falling back to generic alert.');
    const title = 'System Alert';
    const body = `Order status updated: ${event}`;
    await sendPushNotification(userId, title, body, data);
    return;
  }

  let { title, body } = STRINGS[event][lang];
  
  // Replace placeholders
  Object.entries(params).forEach(([key, val]) => {
    body = body.replace(new RegExp(`{${key}}`, 'g'), val);
  });

  // 1. Send Push to Merchant/Rider
  await sendPushNotification(userId, title, body, data);

  // 2. Send Socket (if IO is provided)
  if (io) {
    const room = `merchant:${userId}`;
    io.to(room).emit('notification', { title, body, ...data });
    logger.info({ room, event }, '📡 [Socket] In-app notification sent');
  }

  // 3. Send SMS to Customer (if phone provided and mission status changes)
  const isSmsEvent = ['MISSION_ACCEPTED', 'ORDER_COLLECTED', 'MISSION_SUCCESS', 'RIDER_ARRIVED'].includes(event);
  console.log(`[NOTIFY] Tracing Alert | Event: ${event} | Should SMS: ${isSmsEvent} | Phone: ${customerPhone}`);
  
  if (isSmsEvent) {
    if (customerPhone && customerPhone.length > 5) {
        (async () => {
            try {
                const orderId   = params?.orderId  || (data?.orderId ? String(data.orderId).slice(-6).toUpperCase() : 'N/A');
                const rider     = params?.rider    || 'Your rider';
                const location  = params?.location || '';
                const amount    = params?.totalAmount;
                const method    = params?.paymentMethod;
                const baseUrl   = process.env.PUBLIC_APP_URL || '';
                const trackUrl  = baseUrl ? `${baseUrl}/track/${data?.orderId || orderId}` : '';

                const paymentText = (method === 'CASH' && amount) ? `\n💰 Total to pay: ETB ${amount}` : '';

                // 📱 Rich SMS per event
                let smsBody = '';
                switch (event) {
                  case 'MISSION_ACCEPTED':
                    smsBody = [
                      `✅ EthioLogistics - Order #${orderId}`,
                      ``,
                      `Your order has been ACCEPTED!`,
                      `🏍️ Rider: ${rider}`,
                      `📦 Status: Heading to pickup`,
                      paymentText,
                      trackUrl ? `\nTrack live: ${trackUrl}` : '',
                    ].filter(Boolean).join('\n');
                    break;

                  case 'RIDER_ARRIVED':
                    smsBody = [
                      `📍 EthioLogistics - Order #${orderId}`,
                      ``,
                      `${rider} has ARRIVED at the ${location}.`,
                      `📦 Status: Awaiting collection`,
                      paymentText,
                      trackUrl ? `\nTrack live: ${trackUrl}` : '',
                    ].filter(Boolean).join('\n');
                    break;

                  case 'ORDER_COLLECTED':
                    smsBody = [
                      `🚀 EthioLogistics - Order #${orderId}`,
                      ``,
                      `Your order is ON THE WAY!`,
                      `🏍️ Rider: ${rider}`,
                      `📦 Status: In transit to you`,
                      paymentText,
                      trackUrl ? `\nTrack live: ${trackUrl}` : '',
                    ].filter(Boolean).join('\n');
                    break;

                  case 'MISSION_SUCCESS':
                    smsBody = [
                      `🎉 EthioLogistics - Order #${orderId}`,
                      ``,
                      `Your order has been DELIVERED!`,
                      `🏍️ Rider: ${rider}`,
                      `📦 Status: Successfully delivered`,
                      ``,
                      `Thank you for using EthioLogistics!`,
                    ].join('\n');
                    break;

                  default:
                    smsBody = trackUrl ? `${title}\n${body}\n\nTrack: ${trackUrl}` : `${title}\n${body}`;
                }

                logger.info({ customerPhone, event, orderId }, '📬 [SMS] Dispatching rich notification...');
                await sendSMS(customerPhone, smsBody);
            } catch (err: any) {
                logger.error({ err: err.message }, '❌ [SMS] Failed to build or send message');
            }
        })();
    } else {
        logger.warn({ event, customerPhone }, '⚠️ [SMS] Skipping: No valid customer phone on this order');
    }
  }
};

export const broadcastNotificationToRiders = async (title: string, body: string, data?: any) => {
  try {
    const riders = await User.find({ role: 'RIDER' }).select('expoPushToken expoPushTokens').lean();
    
    const tokens: string[] = [];
    riders.forEach((r: any) => {
      if (r.expoPushToken && Expo.isExpoPushToken(r.expoPushToken) && !tokens.includes(r.expoPushToken)) {
        tokens.push(r.expoPushToken);
      }
      if (Array.isArray(r.expoPushTokens)) {
        r.expoPushTokens.forEach((t: string) => {
          if (t && Expo.isExpoPushToken(t) && !tokens.includes(t)) {
            tokens.push(t);
          }
        });
      }
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default', // TODO: Use a custom mission alert sound
      title,
      body,
      data: data || {},
      priority: 'high',
    }));

    const chunks = expo.chunkPushNotifications(messages);
    
    (async () => {
        try {
            await Promise.all(chunks.map(chunk => expo.sendPushNotificationsAsync(chunk)));
            logger.info({ count: tokens.length }, '📣 [Push] Parallel-broadcasted to riders');
        } catch (err: any) {
            logger.error({ err: err.message }, '[Push] Broadcast Error');
        }
    })();
  } catch (error: any) {
    logger.error({ err: error.message }, '[Push] Broadcast Setup Error');
  }
};
