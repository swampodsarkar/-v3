require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  adminId: parseInt(process.env.ADMIN_ID) || 0,
  botUsername: (process.env.BOT_USERNAME || 'earningbot').replace('@', ''),

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },

  settings: {
    minWithdraw: parseInt(process.env.MIN_WITHDRAW) || 100,
    dailyBonus: parseInt(process.env.DAILY_BONUS_AMOUNT) || 50,
    referralBonus: parseInt(process.env.REFERRAL_BONUS) || 100,
    spinCooldownHours: parseInt(process.env.SPIN_COOLDOWN_HOURS) || 6,
    maxSpinsPerDay: parseInt(process.env.MAX_SPINS_PER_DAY) || 5,
    channelUsername: process.env.CHANNEL_USERNAME || '@yourchannel',
    vipPrice: parseInt(process.env.VIP_PRICE) || 500,
    webhookUrl: process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL,
    webhookPort: parseInt(process.env.PORT || process.env.WEBHOOK_PORT) || 3000,
    useWebhook: process.env.USE_WEBHOOK === 'true' || !!process.env.RENDER_EXTERNAL_URL,
  },

  // Spin wheel rewards (coin amounts)
  spinRewards: [10, 20, 50, 100, 200, 500, 0, 30, 80, 150],
};
