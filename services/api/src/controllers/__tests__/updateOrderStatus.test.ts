/**
 * T2.1 — regression test for the double-settlement bug.
 *
 * Calls updateOrderStatus twice in a row with { status: 'DELIVERED' } for the
 * same order/rider and asserts FinanceService.settleOrder — the thing that
 * actually mutates the rider's finance.balance — only runs once. The second
 * call must still succeed (idempotent 200), it just must not re-settle.
 *
 * This test mocks the Order model and FinanceService instead of hitting a
 * real MongoDB, so it can run with no external services. It calls the
 * exported Express handler directly (bypassing routing/middleware), which is
 * enough to exercise the idempotency logic in orderController.ts.
 *
 * Run with: pnpm --filter @ethio-logistics/api test
 * (after adding vitest — see package.json changes alongside this file)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';

// ---- Mocks ---------------------------------------------------------------

const ORDER_ID = '507f1f77bcf86cd799439011';
const RIDER_ID = '507f1f77bcf86cd799439012';

// In-memory "document" that findOneAndUpdate mutates, so the second call
// sees the first call's effect — mirrors what a real DB would do.
let fakeOrder: any;

// vi.hoisted() runs at the same time as vi.mock() hoisting — this makes
// makeChainable available in ALL mock factory callbacks below without
// having to copy-paste it into each one.
//
// Why we evaluate resultFn() immediately (not lazily inside .then):
// If .then() called resultFn() and the result was another thenable, the
// Promise machinery would try to resolve *that* thenable too, looping
// forever. Evaluating up-front guarantees a plain, non-thenable value
// so every await resolves in exactly one microtask tick.
const { makeChainable } = vi.hoisted(() => {
  function makeChainable(resultFn: () => unknown) {
    const result = resultFn();
    const chain: any = {
      populate: () => chain,
      lean:     () => chain,
      session:  () => chain,
      select:   () => chain,
      then:  (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      catch: (reject: any)               => Promise.resolve(result).catch(reject),
    };
    return chain;
  }
  return { makeChainable };
});

vi.mock('../../models/Order.js', () => {

  return {
    default: {
      findOne: vi.fn((query: any) =>
        makeChainable(() => {
          if (fakeOrder && fakeOrder._id === query._id && fakeOrder.rider === query.rider) {
            return { ...fakeOrder };
          }
          return null;
        })
      ),
      findOneAndUpdate: vi.fn((filter: any, update: any) =>
        makeChainable(() => {
          // Mirror the real query: filter.status = { $ne: 'DELIVERED' } excludes
          // an already-DELIVERED order — findOneAndUpdate returns null then.
          const excludesDelivered = filter.status?.$ne === 'DELIVERED';
          if (excludesDelivered && fakeOrder.status === 'DELIVERED') {
            return null;
          }
          fakeOrder = { ...fakeOrder, ...update.$set };
          return { ...fakeOrder };
        })
      ),
      findById: vi.fn((id: string) =>
        makeChainable(() => {
          if (fakeOrder && fakeOrder._id === id) {
            return { ...fakeOrder };
          }
          return null;
        })
      ),
    },
  };
});

vi.mock('../../services/financeService.js', () => ({
  FinanceService: {
    settleOrder: vi.fn(async () => {
      /* pretend to credit rider.finance.balance */
    }),
  },
}));

// notifications/sms/redis side effects aren't relevant to this test —
// stub them out so updateOrderStatus's setImmediate block doesn't throw.
vi.mock('../../lib/notifications.js', () => ({
  broadcastNotificationToRiders: vi.fn(),
  notifyOrderUpdate: vi.fn(async () => {}),
  sendPushNotification: vi.fn(async () => {}),
}));
vi.mock('../../lib/sms.js', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }));
vi.mock('../../lib/redis.js', () => ({ redis: { set: vi.fn(), lpush: vi.fn(), ltrim: vi.fn(), expire: vi.fn() } }));
vi.mock('../../lib/env.js', () => ({
  appConfig: { nodeEnv: 'test', isDev: false, port: 5000, allowedOrigins: [] },
  clerkConfig: { publishableKey: '', secretKey: 'test-secret', webhookSecret: 'test-webhook' },
  mongoConfig: { uri: 'mongodb://localhost/test' },
  redisConfig: { url: 'redis://localhost:6379' },
  cloudinaryConfig: { cloudName: 'test', apiKey: 'test', apiSecret: 'test' },
  smsConfig: { key: '', id: '' },
  orsConfig: { apiKey: 'test' },
}));

vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn((id: string) =>
      makeChainable(() =>
        id ? { finance: { balance: 0, cashHeld: 0, totalEarned: 0 } } : null
      )
    ),
  },
}));

// ---- Test helpers ---------------------------------------------------------

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(): AuthRequest {
  return {
    params: { id: ORDER_ID },
    body: { status: 'DELIVERED', verificationCode: '1234' },
    user: { _id: RIDER_ID },
    app: { get: () => null }, // no socket.io instance needed for this test
  } as unknown as AuthRequest;
}

// setImmediate-based settlement needs a real tick to run before we can assert on it.
function flushSetImmediate() {
  return new Promise((resolve) => setImmediate(resolve));
}

// ---- Test -------------------------------------------------------------

describe('updateOrderStatus — T2.1 double-settlement guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeOrder = {
      _id: ORDER_ID,
      rider: RIDER_ID,
      status: 'PICKED_UP',
      verificationCode: '1234',
      merchant: 'merchant-1',
      priceInfo: {},
    };
  });

  it('only settles once across two sequential DELIVERED requests for the same order', async () => {
    const { updateOrderStatus } = await import('../orderController.js');
    const { FinanceService } = await import('../../services/financeService.js');

    // First call: legitimately transitions PICKED_UP -> DELIVERED, should settle.
    const res1 = makeRes();
    await updateOrderStatus(makeReq(), res1);
    await flushSetImmediate();

    expect(res1.status).toHaveBeenCalledWith(200);
    expect(FinanceService.settleOrder).toHaveBeenCalledTimes(1);

    // Second call: retry/duplicate request, order is already DELIVERED.
    // Must be a no-op success, NOT another settlement.
    const res2 = makeRes();
    await updateOrderStatus(makeReq(), res2);
    await flushSetImmediate();

    expect(res2.status).toHaveBeenCalledWith(200);
    expect(FinanceService.settleOrder).toHaveBeenCalledTimes(1); // still 1, not 2
  }, 20000);
});
