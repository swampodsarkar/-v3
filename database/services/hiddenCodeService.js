const { getDB } = require('../firebase');
const { addCoins } = require('./balanceService');
const db = () => getDB();

async function createCode(code, reward, maxUses = 0) {
  const snap = await db().ref(`hiddenCodes/${code}`).once('value');
  if (snap.val()) return { success: false, message: 'Code already exists' };
  await db().ref(`hiddenCodes/${code}`).set({
    reward, maxUses, uses: 0, createdAt: Date.now(), active: true,
  });
  return { success: true };
}

async function claimCode(userId, code) {
  code = code.toUpperCase().trim();
  const snap = await db().ref(`hiddenCodes/${code}`).once('value');
  const data = snap.val();
  if (!data) return { success: false, message: '❌ Invalid code' };
  if (!data.active) return { success: false, message: '❌ Code expired' };
  if (data.maxUses > 0 && data.uses >= data.maxUses) return { success: false, message: '❌ Code already fully used' };
  const usedSnap = await db().ref(`hiddenCodeClaims/${userId}/${code}`).once('value');
  if (usedSnap.val()) return { success: false, message: '❌ You already used this code' };
  await addCoins(userId, data.reward, 'hidden_code');
  await db().ref(`hiddenCodeClaims/${userId}/${code}`).set(true);
  await db().ref(`hiddenCodes/${code}/uses`).transaction(u => (u || 0) + 1);
  return { success: true, reward: data.reward };
}

async function getAllCodes() {
  const snap = await db().ref('hiddenCodes').once('value');
  return snap.val() || {};
}

async function toggleCode(code) {
  const snap = await db().ref(`hiddenCodes/${code}`).once('value');
  if (!snap.val()) return { success: false };
  const active = !snap.val().active;
  await db().ref(`hiddenCodes/${code}/active`).set(active);
  return { success: true, active };
}

module.exports = { createCode, claimCode, getAllCodes, toggleCode };
