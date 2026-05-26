const { getDB } = require('../firebase');
const { addCoins, getBalance, removeCoins } = require('./balanceService');
const db = () => getDB();

const MIN_INVEST = 100;
const PROFIT_PERCENT = 0.15;
const DURATION = 24 * 60 * 60 * 1000;

async function getMining(userId) {
  const snap = await db().ref(`mining/${userId}`).once('value');
  return snap.val();
}

async function startMining(userId, amount) {
  if (amount < MIN_INVEST) return { success: false, message: `Minimum ${MIN_INVEST} coins` };
  const active = await getMining(userId);
  if (active && !active.claimed) return { success: false, message: 'Already mining. Claim first.' };
  const bal = await getBalance(userId);
  if (bal.coins < amount) return { success: false, message: 'Not enough coins' };
  await removeCoins(userId, amount);
  await db().ref(`mining/${userId}`).set({ invested: amount, startedAt: Date.now(), claimed: false });
  return { success: true, amount };
}

async function claimMining(userId) {
  const mine = await getMining(userId);
  if (!mine) return { success: false, message: 'No active mining' };
  if (mine.claimed) return { success: false, message: 'Already claimed' };
  const elapsed = Date.now() - mine.startedAt;
  if (elapsed < DURATION) {
    const left = DURATION - elapsed;
    return { success: false, remaining: left, message: `Wait ${Math.ceil(left / 3600000)}h more` };
  }
  const profit = Math.floor(mine.invested * PROFIT_PERCENT);
  const total = mine.invested + profit;
  await addCoins(userId, total, 'mining');
  await db().ref(`mining/${userId}/claimed`).set(true);
  return { success: true, invested: mine.invested, profit, total };
}

module.exports = { getMining, startMining, claimMining, MIN_INVEST, PROFIT_PERCENT, DURATION };
