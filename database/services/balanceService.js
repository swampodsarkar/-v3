const { getDB } = require('../firebase');
const { formatNumber } = require('../../utils/helpers');

const db = () => getDB();

async function getBalance(userId) {
  const snapshot = await db().ref(`balances/${userId}`).once('value');
  const balance = snapshot.val();
  if (!balance) {
    // Initialize if missing
    const initial = { coins: 0, totalEarned: 0, referralEarnings: 0 };
    await db().ref(`balances/${userId}`).set(initial);
    return initial;
  }
  return balance;
}

async function addCoins(userId, amount, reason = 'earned') {
  const balanceRef = db().ref(`balances/${userId}`);
  const current = await getBalance(userId);

  const newCoins = (current.coins || 0) + amount;
  const newTotal = (current.totalEarned || 0) + amount;

  const updates = {
    coins: newCoins,
    totalEarned: newTotal,
  };

  if (reason === 'referral') {
    updates.referralEarnings = (current.referralEarnings || 0) + amount;
  }

  await balanceRef.update(updates);
  return newCoins;
}

async function removeCoins(userId, amount) {
  const current = await getBalance(userId);
  const newCoins = Math.max(0, (current.coins || 0) - amount);
  await db().ref(`balances/${userId}/coins`).set(newCoins);
  return newCoins;
}

async function getLeaderboard(limit = 10) {
  const snapshot = await db().ref('balances').orderByChild('totalEarned').limitToLast(limit).once('value');
  const balances = snapshot.val() || {};
  const sorted = Object.entries(balances)
    .map(([uid, bal]) => ({ userId: uid, ...bal }))
    .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
    .slice(0, limit);
  return sorted;
}

async function getTotalStats() {
  const balancesSnap = await db().ref('balances').once('value');
  const usersSnap = await db().ref('users').once('value');

  const balances = balancesSnap.val() || {};
  const users = usersSnap.val() || {};

  let totalCoins = 0;
  let totalUsers = 0;

  Object.values(balances).forEach(b => {
    totalCoins += b.totalEarned || 0;
  });

  totalUsers = Object.keys(users).length;

  return { totalUsers, totalCoinsDistributed: totalCoins };
}

module.exports = {
  getBalance,
  addCoins,
  removeCoins,
  getLeaderboard,
  getTotalStats,
};
