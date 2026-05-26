const { getDB } = require('../firebase');
const config = require('../../config/config');

const db = () => getDB();

async function getUser(userId) {
  const snapshot = await db().ref(`users/${userId}`).once('value');
  return snapshot.val();
}

async function createUser(user) {
  const userData = {
    id: user.id,
    username: user.username || '',
    firstName: user.first_name || '',
    registeredAt: Date.now(),
    referredBy: user.referredBy || null,
    isBanned: false,
    isVIP: false,
    vipUntil: null,
  };
  await db().ref(`users/${user.id}`).set(userData);

  // Init balance
  await db().ref(`balances/${user.id}`).set({
    coins: 0,
    totalEarned: 0,
    referralEarnings: 0,
  });

  return userData;
}

async function updateUser(userId, updates) {
  await db().ref(`users/${userId}`).update(updates);
}

async function banUser(userId) {
  await updateUser(userId, { isBanned: true });
}

async function unbanUser(userId) {
  await updateUser(userId, { isBanned: false });
}

async function setVIP(userId, months = 1) {
  const until = Date.now() + (months * 30 * 24 * 60 * 60 * 1000);
  await updateUser(userId, { isVIP: true, vipUntil: until });
}

async function isUserBanned(userId) {
  const user = await getUser(userId);
  return user && user.isBanned;
}

async function getAdWatchCount(userId) {
  const user = await getUser(userId);
  return user ? (user.adWatchCount || 0) : 0;
}

async function incrementAdWatchCount(userId) {
  const count = await getAdWatchCount(userId);
  const newCount = count + 1;
  await db().ref(`users/${userId}/adWatchCount`).set(newCount);
  return newCount;
}

async function getAllUsers() {
  const snapshot = await db().ref('users').once('value');
  return snapshot.val() || {};
}

module.exports = {
  getUser,
  createUser,
  updateUser,
  banUser,
  unbanUser,
  setVIP,
  isUserBanned,
  getAllUsers,
  getAdWatchCount,
  incrementAdWatchCount,
};
