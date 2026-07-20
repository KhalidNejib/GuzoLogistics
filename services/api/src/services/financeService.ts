import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { logger } from '../lib/logger.js';

export class FinanceService {
  /**
   * Settles the financial accounts for a completed order.
   * @param orderId The ID of the delivered order
   * @param riderId The ID of the rider who completed it
   */
  static async settleOrder(orderId: string, riderId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const order = await Order.findById(orderId).populate('rider').session(session);
      if (!order || order.status !== 'DELIVERED') {
        await session.abortTransaction();
        return;
      }

      // Idempotency guard: if this order was already settled (e.g. a
      // retried/duplicated status-update request re-invoked settleOrder),
      // bail out here instead of crediting balances a second time.
      if (order.financeSnapshot?.settled) {
        logger.warn({ orderId, riderId }, '⚠️ [Settlement] settleOrder called again for an already-settled order — skipping');
        await session.abortTransaction();
        return;
      }

      const merchantId = order.merchant;
      const deliveryFee = order.priceInfo?.amount || 0;
      const itemPrice = order.priceInfo?.itemPrice || 0;
      
      const riderShare = 0.8; 
      const riderEarning = Math.floor(deliveryFee * riderShare);
      const merchantProfit = Math.ceil(deliveryFee * (1 - riderShare)) + itemPrice;
      
      // Debt to office = Item Price (for merchant) + 20% Delivery Fee (for system).
      const systemPortion = deliveryFee - riderEarning;
      const totalCashCollected = order.paymentMethod === 'CASH' ? (itemPrice + systemPortion) : 0;

      const rider = await User.findById(riderId).session(session);
      let actualCashDebt = totalCashCollected;
      let settlementMethod = 'PHYSICAL_CASH_DEBT';
      let balanceIncrease = 0; 

      // Digital Rebalancing Logic
      if (order.paymentMethod === 'DIGITAL') {
          await User.findByIdAndUpdate(merchantId, { $inc: { 'finance.balance': merchantProfit } }, { session });
          await Order.findByIdAndUpdate(orderId, { $set: { paymentStatus: 'PAID' } }, { session });
          actualCashDebt = 0;
          balanceIncrease = riderEarning; 
          settlementMethod = 'DIGITAL_PAYMENT_DIRECT';
      } else if (order.paymentMethod === 'CASH' && rider && rider.finance.balance >= merchantProfit) {
          // AUTO-SETTLE using existing wallet funds
          await User.findByIdAndUpdate(riderId, { $inc: { 'finance.balance': -merchantProfit } }, { session });
          await User.findByIdAndUpdate(merchantId, { $inc: { 'finance.balance': merchantProfit } }, { session });
          actualCashDebt = 0; 
          balanceIncrease = 0; 
          settlementMethod = 'AUTO_DIGITAL_REBALANCE';
          
          await Transaction.create([{ 
            user: riderId, 
            order: orderId, 
            type: 'PAYOUT', 
            amount: merchantProfit, 
            paymentMethod: 'WALLET', 
            status: 'COMPLETED', 
            description: `Digital Rebalance #${orderId.toString().slice(-6)}` 
          }], { session, ordered: true });
      }

      const merchantUpdate: any = { $inc: { 'finance.totalRevenue': deliveryFee + itemPrice } };
      if (settlementMethod === 'PHYSICAL_CASH_DEBT') merchantUpdate.$inc['finance.codBalance'] = merchantProfit;

      await User.findByIdAndUpdate(merchantId, merchantUpdate, { session });
      await User.findByIdAndUpdate(riderId, {
          $inc: { 
              'finance.balance': balanceIncrease, 
              'finance.cashHeld': actualCashDebt,
              'finance.totalEarned': riderEarning
          }
      }, { session });
      await Transaction.create([
          { user: merchantId, order: orderId, type: 'REVENUE', amount: merchantProfit, paymentMethod: order.paymentMethod, status: 'COMPLETED', description: `Settlement #${orderId.slice(-6)}` },
          { user: riderId, order: orderId, type: 'REVENUE', amount: riderEarning, paymentMethod: order.paymentMethod, status: 'COMPLETED', description: `Earnings #${orderId.slice(-6)}` }
      ], { session, ordered: true });
      await Order.findByIdAndUpdate(orderId, { 
        $set: { 
          'financeSnapshot.merchantProfit': merchantProfit, 
          'financeSnapshot.riderEarning': riderEarning, 
          'financeSnapshot.settlementMethod': settlementMethod,
          'financeSnapshot.settlementFailed': false,
          'financeSnapshot.settled': true
        } 
      }, { session });

      await session.commitTransaction();
      return { riderEarning, merchantProfit, settlementMethod };
    } catch (error) {
      await session.abortTransaction();
      logger.error({ error, orderId }, '❌ [FinanceService] Settlement Crash');
      throw error;
    } finally {
      session.endSession();
    }
  }
}
