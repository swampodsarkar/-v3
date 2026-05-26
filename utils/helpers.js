const config = require('../config/config');

function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num || 0);
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function isToday(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const today = new Date();
  return date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
}

function getTimeLeft(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function generateReferralLink(userId) {
  const username = config.botUsername.replace('@', '');
  return `https://t.me/${username}?start=ref_${userId}`;
}

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function validateAmount(amount, min = 1) {
  const num = parseInt(amount);
  return !isNaN(num) && num >= min;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  formatNumber,
  getCurrentDate,
  isToday,
  getTimeLeft,
  generateReferralLink,
  escapeMarkdown,
  validateAmount,
  delay,
};
