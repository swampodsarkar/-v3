const pendingVerifications = new Map();
const MAX_AD_WATCHES = 10;

function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function createVerification(userId) {
  const code = generateVerificationCode();
  pendingVerifications.set(String(userId), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    used: false,
  });
  return code;
}

function getVerification(userId) {
  return pendingVerifications.get(String(userId));
}

function deleteVerification(userId) {
  pendingVerifications.delete(String(userId));
}

module.exports = {
  pendingVerifications,
  MAX_AD_WATCHES,
  generateVerificationCode,
  createVerification,
  getVerification,
  deleteVerification,
};
