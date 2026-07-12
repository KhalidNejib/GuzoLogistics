/**
 * Professional ID Generator
 * Generates readable, unique-ish IDs for transactions and payouts
 * Format: XXX-YYYYYYYY (e.g. TXN-A9B3C7D2)
 */

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const generate = (length = 8) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
};

export const generateTransactionId = (prefix = 'TXN') => {
  return `${prefix}-${generate()}`;
};

export const generatePayoutId = () => {
    return `PAY-${generate()}`;
};
