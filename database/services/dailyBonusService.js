const { getDB } = require('../firebase');
const config = require('../../config/config');
const { addCoins } = require('./balanceService');
const { isToday } = require('../../utils/helpers');

const db = () => getDB();

async function canClaimDaily(userId) {
  const snap = await db().ref(`dailyBonus/${userId}`).once('value');
  const data = snap.val();
  if (!data || !data.lastClaim) return true;
  return !isToday(data.lastClaim);
}

async function claimDailyBonus(userId) {
  const canClaim = await canClaimDaily(userId);
  if (!canClaim) {
    return { success: false, message: 'Already claimed today' };
  }

  const amount = config.settings.dailyBonus;
  await addCoins(userId, amount);

  await db().ref(`dailyBonus/${userId}`).set({
    lastClaim: Date.now(),
    totalClaimed: ((await getDailyStats(userId)).totalClaimed || 0) + amount,
  });

  return { success: true, amount };
}

async function getDailyStats(userId) {
  const snap = await db().ref(`dailyBonus/${userId}`).once('value');
  return snap.val() || { lastClaim: 0, totalClaimed: 0 };
}

async function getLastClaim(userId) {
  const data = await getDailyStats(userId);
  return data.lastClaim || 0;
}

module.exports = {
  canClaimDaily,
  claimDailyBonus,
  getDailyStats,
  getLastClaim,
};
