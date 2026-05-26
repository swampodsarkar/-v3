const { getDB } = require('../firebase');
const { addCoins } = require('./balanceService');

const db = () => getDB();
const FAUCET_AMOUNT = 10;
const FAUCET_COOLDOWN = 5 * 60 * 1000;

async function canClaim(userId) {
  const snap = await db().ref(`faucet/${userId}`).once('value');
  const last = snap.val();
  if (!last) return { can: true };
  const elapsed = Date.now() - last;
  if (elapsed < FAUCET_COOLDOWN) {
    return { can: false, remaining: FAUCET_COOLDOWN - elapsed };
  }
  return { can: true };
}

async function claimFaucet(userId) {
  const check = await canClaim(userId);
  if (!check.can) return { success: false, message: 'Cooldown active' };
  await addCoins(userId, FAUCET_AMOUNT, 'faucet');
  await db().ref(`faucet/${userId}`).set(Date.now());
  return { success: true, amount: FAUCET_AMOUNT };
}

module.exports = { claimFaucet, canClaim, FAUCET_AMOUNT, FAUCET_COOLDOWN };
