const { getDB } = require('../firebase');
const config = require('../../config/config');
const { addCoins } = require('./balanceService');
const { getCurrentDate } = require('../../utils/helpers');

const db = () => getDB();

async function getSpinData(userId) {
  const snap = await db().ref(`spins/${userId}`).once('value');
  return snap.val() || { lastSpin: 0, spinsToday: 0, date: '' };
}

async function canSpin(userId) {
  const data = await getSpinData(userId);
  const today = getCurrentDate();

  if (data.date !== today) {
    // reset daily count
    await db().ref(`spins/${userId}`).update({ spinsToday: 0, date: today });
    return { can: true, spinsLeft: config.settings.maxSpinsPerDay };
  }

  const spinsLeft = config.settings.maxSpinsPerDay - (data.spinsToday || 0);
  const cooldownMs = config.settings.spinCooldownHours * 60 * 60 * 1000;
  const timeSinceLast = Date.now() - (data.lastSpin || 0);

  if (spinsLeft <= 0) {
    return { can: false, reason: 'daily_limit', spinsLeft: 0 };
  }

  if (timeSinceLast < cooldownMs) {
    return {
      can: false,
      reason: 'cooldown',
      remaining: cooldownMs - timeSinceLast,
      spinsLeft,
    };
  }

  return { can: true, spinsLeft };
}

async function performSpin(userId) {
  const check = await canSpin(userId);
  if (!check.can) return { success: false, ...check };

  const rewards = config.spinRewards;
  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  await addCoins(userId, reward);

  const today = getCurrentDate();
  const data = await getSpinData(userId);

  const newSpins = (data.date === today ? (data.spinsToday || 0) : 0) + 1;

  await db().ref(`spins/${userId}`).update({
    lastSpin: Date.now(),
    spinsToday: newSpins,
    date: today,
  });

  return {
    success: true,
    reward,
    spinsLeft: config.settings.maxSpinsPerDay - newSpins,
  };
}

module.exports = {
  canSpin,
  performSpin,
  getSpinData,
};
