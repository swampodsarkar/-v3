const { Markup } = require('telegraf');

const mainMenuKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💰 Earn Coins', 'earn_menu'),
    Markup.button.callback('💧 Faucet', 'faucet_claim'),
  ],
  [
    Markup.button.callback('🎁 Daily Bonus', 'daily_bonus'),
    Markup.button.callback('🎡 Spin Wheel', 'spin_wheel'),
  ],
  [
    Markup.button.callback('⛏️ Mining', 'mining_menu'),
    Markup.button.callback('📺 Watch Ads', 'watch_ads'),
  ],
  [
    Markup.button.callback('📋 Tasks', 'tasks_menu'),
    Markup.button.callback('👥 Refer & Earn', 'referral_menu'),
  ],
  [
    Markup.button.callback('👛 Wallet', 'wallet_menu'),
  ],
  [
    Markup.button.callback('💸 Withdraw', 'withdraw_menu'),
    Markup.button.callback('🏆 Leaderboard', 'leaderboard'),
  ],
  [
    Markup.button.callback('💎 VIP Membership', 'vip_menu'),
    Markup.button.callback('⚙️ Settings', 'settings_menu'),
  ],
  [
    Markup.button.callback('📞 Support', 'support'),
  ],
]);

const earnMenuKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💧 Faucet', 'faucet_claim'),
    Markup.button.callback('🎁 Daily Bonus', 'daily_bonus'),
  ],
  [
    Markup.button.callback('🎡 Spin Wheel', 'spin_wheel'),
    Markup.button.callback('📺 Watch Ads', 'watch_ads'),
  ],
  [
    Markup.button.callback('⛏️ Mining', 'mining_menu'),
    Markup.button.callback('📋 Tasks', 'tasks_menu'),
  ],
  [Markup.button.callback('🔙 Back to Home', 'main_menu')],
]);

const walletKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💸 Withdraw', 'withdraw_menu'),
    Markup.button.callback('📜 History', 'withdraw_history'),
  ],
  [Markup.button.callback('🔙 Back', 'main_menu')],
]);

const adminKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Stats', 'admin_stats'),
    Markup.button.callback('📢 Broadcast', 'admin_broadcast'),
  ],
  [
    Markup.button.callback('➕ Add Coins', 'admin_addcoins'),
    Markup.button.callback('➖ Remove Coins', 'admin_removecoins'),
  ],
  [
    Markup.button.callback('🚫 Ban User', 'admin_ban'),
    Markup.button.callback('✅ Unban User', 'admin_unban'),
  ],
  [
    Markup.button.callback('💸 Withdraw Requests', 'admin_withdraws'),
    Markup.button.callback('👥 All Users', 'admin_users'),
  ],
  [Markup.button.callback('❌ Close', 'admin_close')],
]);

const spinKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🎡 SPIN NOW', 'spin_action')],
  [Markup.button.callback('🔙 Back', 'main_menu')],
]);

const referralKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📤 Share Link', 'share_referral'),
    Markup.button.callback('📊 My Referrals', 'my_referrals'),
  ],
  [Markup.button.callback('🔙 Back', 'main_menu')],
]);

const withdrawKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💸 Request Withdraw', 'request_withdraw'),
    Markup.button.callback('📜 My Requests', 'my_withdraws'),
  ],
  [Markup.button.callback('🔙 Back', 'main_menu')],
]);

const vipKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💎 Buy VIP', 'buy_vip'),
    Markup.button.callback('📖 VIP Benefits', 'vip_benefits'),
  ],
  [Markup.button.callback('🔙 Back', 'main_menu')],
]);

const tasksKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Check Available Tasks', 'list_tasks')],
  [Markup.button.callback('🔙 Back', 'main_menu')],
]);

const backKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 Back to Home', 'main_menu')],
]);

module.exports = {
  mainMenuKeyboard,
  earnMenuKeyboard,
  walletKeyboard,
  adminKeyboard,
  spinKeyboard,
  referralKeyboard,
  withdrawKeyboard,
  vipKeyboard,
  tasksKeyboard,
  backKeyboard,
};
