import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import { snatchOrder } from '../orderController.js';
import Order from '../../models/Order.js';

const MERCHANT_ID = 'merchant-id-123';
const ORDER_ID = 'order-id-123';

let fakeOrder: any;

vi.mock('../../models/Order.js', () => ({
  default: {
    findOne: vi.fn(async (query: any) => {
      if (fakeOrder && fakeOrder._id === query._id && fakeOrder.merchant === query.merchant) {
        return fakeOrder;
      }
      return null;
    }),
  },
}));

vi.mock('../../lib/env.js', () => ({
  appConfig: { nodeEnv: 'test', isDev: false, port: 5000, allowedOrigins: [] },
  clerkConfig: { publishableKey: '', secretKey: 'test-secret', webhookSecret: 'test-webhook' },
  mongoConfig: { uri: 'mongodb://localhost/test' },
  redisConfig: { url: 'redis://localhost:6379' },
  cloudinaryConfig: { cloudName: 'test', apiKey: 'test', apiSecret: 'test' },
  smsConfig: { key: '', id: '' },
  orsConfig: { apiKey: 'test' },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../lib/notifications.js', () => ({
  broadcastNotificationToRiders: vi.fn(),
  notifyOrderUpdate: vi.fn(async () => {}),
  sendPushNotification: vi.fn(async () => {}),
}));

vi.mock('../../lib/sms.js', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }));
vi.mock('../../lib/redis.js', () => ({ redis: { set: vi.fn(), lpush: vi.fn(), ltrim: vi.fn(), expire: vi.fn() } }));

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(): AuthRequest {
  return {
    params: { id: ORDER_ID },
    user: { _id: MERCHANT_ID },
    app: { get: () => null },
  } as unknown as AuthRequest;
}

describe('snatchOrder status guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows snatching a stuck ASSIGNED/ACCEPTED/PICKED_UP order', async () => {
    let saved = false;
    fakeOrder = {
      _id: ORDER_ID,
      merchant: MERCHANT_ID,
      status: 'ASSIGNED',
      rider: 'rider-123',
      save: vi.fn(async function (this: any) {
        saved = true;
        return this;
      }),
    };

    const res = makeRes();
    await snatchOrder(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(fakeOrder.status).toBe('PENDING');
    expect(fakeOrder.rider).toBeUndefined();
    expect(saved).toBe(true);
  });

  it('blocks snatching a DELIVERED order with 400', async () => {
    fakeOrder = {
      _id: ORDER_ID,
      merchant: MERCHANT_ID,
      status: 'DELIVERED',
      rider: 'rider-123',
      save: vi.fn(),
    };

    const res = makeRes();
    await snatchOrder(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot snatch an order that is already delivered.' });
    expect(fakeOrder.save).not.toHaveBeenCalled();
  });

  it('blocks snatching a CANCELLED order with 400', async () => {
    fakeOrder = {
      _id: ORDER_ID,
      merchant: MERCHANT_ID,
      status: 'CANCELLED',
      rider: 'rider-123',
      save: vi.fn(),
    };

    const res = makeRes();
    await snatchOrder(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot snatch an order that is cancelled.' });
    expect(fakeOrder.save).not.toHaveBeenCalled();
  });
});
