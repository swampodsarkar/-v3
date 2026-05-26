const { getDB } = require('../firebase');
const config = require('../../config/config');
const { addCoins } = require('./balanceService');

const db = () => getDB();

async function getReferralData(userId) {
  const snap = await db().ref(`referrals/${userId}`).once('value');
  return snap.val() || { count: 0, referred: [] };
}

async function addReferral(referrerId, newUserId) {
  const refData = await getReferralData(referrerId);
  if (refData.referred && refData.referred.includes(newUserId)) {
    return false; // already referred
  }

  const newReferred = [...(refData.referred || []), newUserId];
  await db().ref(`referrals/${referrerId}`).update({
    count: newReferred.length,
    referred: newReferred,
  });

  // Reward referrer
  await addCoins(referrerId, config.settings.referralBonus, 'referral');

  // Also give small bonus to new user? (optional)
  return true;
}

async function getReferralCount(userId) {
  const data = await getReferralData(userId);
  return data.count || 0;
}

module.exports = {
  getReferralData,
  addReferral,
  getReferralCount,
};
