const { getDB } = require('../firebase');
const config = require('../../config/config');
const { getBalance, removeCoins } = require('./balanceService');

const db = () => getDB();

async function createWithdrawRequest(userId, amount) {
  const balance = await getBalance(userId);
  if (balance.coins < amount) {
    return { success: false, message: 'Insufficient balance' };
  }
  if (amount < config.settings.minWithdraw) {
    return { success: false, message: `Minimum withdraw is ${config.settings.minWithdraw} coins` };
  }

  const requestId = `wd_${Date.now()}_${userId}`;
  const request = {
    id: requestId,
    userId,
    amount,
    status: 'pending',
    requestedAt: Date.now(),
  };

  await db().ref(`withdraws/${requestId}`).set(request);

  // Reserve coins
  await removeCoins(userId, amount);

  return { success: true, requestId };
}

async function getWithdrawRequests(status = 'pending') {
  const snap = await db().ref('withdraws').orderByChild('status').equalTo(status).once('value');
  const data = snap.val() || {};
  return Object.values(data);
}

async function approveWithdraw(requestId) {
  const ref = db().ref(`withdraws/${requestId}`);
  const snap = await ref.once('value');
  const req = snap.val();
  if (!req || req.status !== 'pending') return false;

  await ref.update({ status: 'approved', processedAt: Date.now() });
  return true;
}

async function rejectWithdraw(requestId) {
  const ref = db().ref(`withdraws/${requestId}`);
  const snap = await ref.once('value');
  const req = snap.val();
  if (!req || req.status !== 'pending') return false;

  // Refund coins
  await db().ref(`balances/${req.userId}/coins`).transaction(current => (current || 0) + req.amount);

  await ref.update({ status: 'rejected', processedAt: Date.now() });
  return true;
}

async function getUserWithdraws(userId) {
  const snap = await db().ref('withdraws').orderByChild('userId').equalTo(userId).once('value');
  const data = snap.val() || {};
  return Object.values(data).sort((a, b) => b.requestedAt - a.requestedAt);
}

module.exports = {
  createWithdrawRequest,
  getWithdrawRequests,
  approveWithdraw,
  rejectWithdraw,
  getUserWithdraws,
};
