const { Markup } = require('telegraf');
const {
  mainMenuKeyboard,
  earnMenuKeyboard,
  walletKeyboard,
  spinKeyboard,
  referralKeyboard,
  withdrawKeyboard,
  vipKeyboard,
  tasksKeyboard,
  backKeyboard,
} = require('../keyboards/mainKeyboard');
const { getBalance } = require('../database/services/balanceService');
const { claimDailyBonus, canClaimDaily, getLastClaim } = require('../database/services/dailyBonusService');
const { canSpin, performSpin } = require('../database/services/spinService');
const { getReferralData, getReferralCount } = require('../database/services/referralService');
const { createWithdrawRequest, getUserWithdraws } = require('../database/services/withdrawService');
const { getTasks, claimTask, getCompletedTasks } = require('../database/services/taskService');
const { generateReferralLink, formatNumber, getTimeLeft } = require('../utils/helpers');
const config = require('../config/config');

async function showMainMenu(ctx) {
  const userId = ctx.from.id;
  const balance = await getBalance(userId);
  const text = `🏠 <b>Main Menu</b>\n\n💰 Balance: <b>${formatNumber(balance.coins)}</b> coins`;
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...mainMenuKeyboard }).catch(() => {
    ctx.replyWithHTML(text, mainMenuKeyboard);
  });
}

async function handleEarnMenu(ctx) {
  await ctx.editMessageText('💰 <b>Earn Coins Menu</b>\n\nChoose how you want to earn today:', {
    parse_mode: 'HTML',
    ...earnMenuKeyboard,
  }).catch(async () => {
    await ctx.replyWithHTML('💰 <b>Earn Coins Menu</b>', earnMenuKeyboard);
  });
}

async function handleDailyBonus(ctx) {
  const userId = ctx.from.id;
  const canClaim = await canClaimDaily(userId);

  if (!canClaim) {
    const last = await getLastClaim(userId);
    const nextClaim = last + 24 * 60 * 60 * 1000;
    const timeLeft = getTimeLeft(nextClaim - Date.now());
    return ctx.answerCbQuery(`⏳ Already claimed today. Next in ${timeLeft}`, { show_alert: true });
  }

  const result = await claimDailyBonus(userId);
  if (result.success) {
    await ctx.answerCbQuery(`🎁 +${result.amount} coins claimed!`, { show_alert: true });
    await showMainMenu(ctx);
  } else {
    await ctx.answerCbQuery(result.message, { show_alert: true });
  }
}

async function handleSpinWheel(ctx) {
  const userId = ctx.from.id;
  const spinCheck = await canSpin(userId);

  let text = `🎡 <b>Spin Wheel</b>\n\n`;

  if (!spinCheck.can) {
    if (spinCheck.reason === 'cooldown') {
      text += `⏳ Cooldown: ${getTimeLeft(spinCheck.remaining)}\n`;
    } else {
      text += `❌ Daily spin limit reached.\n`;
    }
    text += `Spins left today: ${spinCheck.spinsLeft || 0}`;
    return ctx.editMessageText(text, { parse_mode: 'HTML', ...backKeyboard });
  }

  text += `Spins left today: ${spinCheck.spinsLeft}\n\n` +
          `Click spin to try your luck! Possible rewards: 0 - 500 coins`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...spinKeyboard });
}

async function handleSpinAction(ctx) {
  const userId = ctx.from.id;
  const result = await performSpin(userId);

  if (!result.success) {
    return ctx.answerCbQuery('Cannot spin now. Check cooldown or daily limit.', { show_alert: true });
  }

  const rewardText = result.reward > 0
    ? `🎉 You won <b>${result.reward}</b> coins!`
    : `😢 Better luck next time! (0 coins)`;

  await ctx.answerCbQuery(`Spun! ${result.reward} coins`, { show_alert: true });

  const newText = `🎡 <b>Spin Result</b>\n\n${rewardText}\n\nSpins left: ${result.spinsLeft}\n\nSpin again after cooldown.`;

  await ctx.editMessageText(newText, { parse_mode: 'HTML', ...spinKeyboard });
}

async function handleWatchAds(ctx) {
  const userId = ctx.from.id;
  const { getAdWatchCount } = require('../database/services/userService');
  const count = await getAdWatchCount(userId);
  const remaining = Math.max(0, 10 - count);
  const watchUrl = `${process.env.WEBHOOK_URL || 'https://your-domain.com'}/watch-ad/${userId}`;

  if (remaining <= 0) {
    return ctx.editMessageText(
      `📺 <b>Watch Ads & Earn</b>\n\n` +
      `❌ আপনি সর্বোচ্চ ১০ বার অ্যাড দেখেছেন।\n\n` +
      `অন্য কাজ দেখে কয়েন আয় করুন।`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back", callback_data: "earn_menu" }]
          ]
        }
      }
    );
  }

  await ctx.editMessageText(
    `📺 <b>Watch Ad & Earn</b>\n\n` +
    `📊 বাকি: <b>${remaining}/১০</b> টি অ্যাড\n\n` +
    `"Open Ad" এ ক্লিক করে অ্যাড দেখুন।\n` +
    `৩০ সেকেন্ড পর নতুন ট্যাবে আপনার কোড আসবে।\n` +
    `কোড কপি করে "Enter Code" এ পেস্ট করুন।\n\n` +
    `⚠️ অ্যাড না দেখলে কয়েন পাবেন না।`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "▶️ Open Ad", url: watchUrl }],
          [{ text: "✏️ Enter Verification Code", callback_data: "enter_verification_code" }],
          [{ text: "🔙 Back", callback_data: "earn_menu" }]
        ]
      }
    }
  );
}

async function handleTasksMenu(ctx) {
  await ctx.editMessageText('📋 <b>Available Tasks</b>\n\nComplete tasks and earn extra coins!', {
    parse_mode: 'HTML',
    ...tasksKeyboard,
  });
}

async function handleListTasks(ctx) {
  const userId = ctx.from.id;
  const tasks = await getTasks();
  const completed = await getCompletedTasks(userId);

  let text = '📋 <b>Tasks</b>\n\n';
  const buttons = [];

  tasks.forEach(task => {
    const done = completed[task.id];
    text += `${done ? '✅' : '⬜'} <b>${task.title}</b> (+${task.reward})\n${task.description}\n\n`;
    if (!done) {
      buttons.push([Markup.button.callback(`✅ Claim ${task.title}`, `claim_task_${task.id}`)]);
    }
  });

  buttons.push([Markup.button.callback('🔙 Back', 'tasks_menu')]);

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
  });
}

async function handleClaimTask(ctx) {
  const taskId = ctx.match[1];
  const userId = ctx.from.id;

  const result = await claimTask(userId, taskId);
  if (result.success) {
    await ctx.answerCbQuery(`✅ +${result.reward} coins!`, { show_alert: true });
    await handleListTasks(ctx); // refresh
  } else {
    await ctx.answerCbQuery(result.message, { show_alert: true });
  }
}

async function handleReferralMenu(ctx) {
  const userId = ctx.from.id;
  const count = await getReferralCount(userId);
  const link = generateReferralLink(userId);

  const text = `👥 <b>Referral Program</b>\n\n` +
    `Invite friends and earn <b>${config.settings.referralBonus}</b> coins per referral!\n\n` +
    `Your referrals: <b>${count}</b>\n\n` +
    `Your link:\n<code>${link}</code>`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...referralKeyboard });
}

async function handleWalletMenu(ctx) {
  const userId = ctx.from.id;
  const balance = await getBalance(userId);

  const text = `👛 <b>Your Wallet</b>\n\n` +
    `💰 Current Balance: <b>${formatNumber(balance.coins)}</b> coins\n` +
    `📈 Total Earned: <b>${formatNumber(balance.totalEarned)}</b> coins\n` +
    `👥 Referral Earnings: <b>${formatNumber(balance.referralEarnings)}</b> coins`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...walletKeyboard });
}

async function handleWithdrawMenu(ctx) {
  const userId = ctx.from.id;
  const balance = await getBalance(userId);

  const text = `💸 <b>Withdraw</b>\n\n` +
    `Current Balance: <b>${formatNumber(balance.coins)}</b>\n` +
    `Minimum Withdraw: <b>${config.settings.minWithdraw}</b> coins\n\n` +
    `Withdrawals are reviewed by admins within 24-48 hours.`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...withdrawKeyboard });
}

async function handleRequestWithdraw(ctx) {
  // Ask for amount via next message or use scene, but for simplicity use callback with prompt or fake for now
  // Better: use a follow up message asking amount
  await ctx.reply('💸 Enter the amount you want to withdraw (in coins):');

  // We can use a simple state or ctx.session, but Telegraf needs session middleware for that.
  // For clean impl, we'll add simple text handler later. For now demo prompt.
  ctx.session = ctx.session || {};
  ctx.session.awaitingWithdraw = true;
}

async function handleMyWithdraws(ctx) {
  const userId = ctx.from.id;
  const requests = await getUserWithdraws(userId);

  if (!requests.length) {
    return ctx.editMessageText('📜 No withdraw requests yet.', { parse_mode: 'HTML', ...backKeyboard });
  }

  let text = '📜 <b>Your Withdraw History</b>\n\n';
  requests.slice(0, 8).forEach(r => {
    const date = new Date(r.requestedAt).toLocaleDateString();
    text += `• ${r.amount} coins - ${r.status.toUpperCase()} (${date})\n`;
  });

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...backKeyboard });
}

async function handleLeaderboard(ctx) {
  const { getLeaderboard } = require('../database/services/balanceService');
  const top = await getLeaderboard(10);

  let text = '🏆 <b>Top Earners Leaderboard</b>\n\n';
  let rank = 1;

  for (const entry of top) {
    // Note: In real, fetch username from users db if want prettier
    text += `${rank}. User ${entry.userId}: <b>${formatNumber(entry.totalEarned)}</b> coins\n`;
    rank++;
  }

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...backKeyboard });
}

async function handleVIPMenu(ctx) {
  const userId = ctx.from.id;
  // Fetch user status
  const { getUser } = require('../database/services/userService');
  const user = await getUser(userId);
  const isVIP = user && user.isVIP && (!user.vipUntil || user.vipUntil > Date.now());

  let text = `💎 <b>VIP Membership</b>\n\n`;
  text += isVIP ? `✅ You are VIP until ${new Date(user.vipUntil).toLocaleDateString()}\n\n` : '';
  text += `Price: <b>${config.settings.vipPrice}</b> coins\n\n` +
    `Benefits:\n• 2x Daily Bonus\n• No spin cooldown\n• Priority withdrawals\n• Exclusive tasks`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...vipKeyboard });
}

async function handleBuyVIP(ctx) {
  const userId = ctx.from.id;
  const { getUser, setVIP } = require('../database/services/userService');
  const { removeCoins, getBalance } = require('../database/services/balanceService');

  const balance = await getBalance(userId);
  if (balance.coins < config.settings.vipPrice) {
    return ctx.answerCbQuery(`Not enough coins. Need ${config.settings.vipPrice}`, { show_alert: true });
  }

  await removeCoins(userId, config.settings.vipPrice);
  await setVIP(userId, 1);

  await ctx.answerCbQuery('🎉 VIP Activated for 30 days!', { show_alert: true });
  await handleVIPMenu(ctx);
}

async function handleSettings(ctx) {
  const text = `⚙️ <b>Settings</b>\n\n` +
    `• Notifications: On\n` +
    `• Language: English\n\n` +
    `More settings coming soon.`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...backKeyboard });
}

async function handleSupport(ctx) {
  const text = `📞 <b>Support</b>\n\n` +
    `For help, contact: @youradminusername\n\n` +
    `Or join our support group.`;

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...backKeyboard });
}

async function handleFaucet(ctx) {
  const userId = ctx.from.id;
  const { claimFaucet, canClaim, FAUCET_COOLDOWN } = require('../database/services/faucetService');
  const check = await canClaim(userId);
  if (!check.can) {
    const mins = Math.ceil(check.remaining / 60000);
    return ctx.answerCbQuery(`⏳ Wait ${mins} min`, { show_alert: true });
  }
  const result = await claimFaucet(userId);
  if (result.success) {
    await ctx.answerCbQuery(`💧 +${result.amount} coins claimed!`, { show_alert: true });
    const { getBalance } = require('../database/services/balanceService');
    const bal = await getBalance(userId);
    await ctx.editMessageText(
      `💧 <b>Faucet</b>\n\n✅ +${result.amount} coins!\n💰 Balance: <b>${bal.coins}</b> coins\n\nআবার ${Math.ceil(FAUCET_COOLDOWN / 60000)} মিনিট পর নিন।`,
      { parse_mode: 'HTML', ...backKeyboard }
    );
  }
}

async function handleMiningMenu(ctx) {
  const userId = ctx.from.id;
  const { getMining, claimMining, MIN_INVEST, PROFIT_PERCENT } = require('../database/services/miningService');
  const { getBalance } = require('../database/services/balanceService');
  const bal = await getBalance(userId);
  const active = await getMining(userId);

  let text = `⛏️ <b>Mining</b>\n\n`;
  text += `💰 Balance: <b>${bal.coins}</b> coins\n\n`;

  if (active && !active.claimed) {
    const elapsed = Date.now() - active.startedAt;
    if (elapsed >= 24 * 60 * 60 * 1000) {
      text += `✅ Mining complete! Claim your reward.`;
      const buttons = [[Markup.button.callback('🎁 Claim Reward', 'mining_claim')], [Markup.button.callback('🔙 Back', 'main_menu')]];
      return ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard(buttons).reply_markup });
    }
    const left = 24 * 60 * 60 * 1000 - elapsed;
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    text += `⏳ Mining in progress...\n`;
    text += `Invested: <b>${active.invested}</b> coins\n`;
    text += `Profit: <b>+${Math.floor(active.invested * PROFIT_PERCENT)}</b> coins (15%)\n`;
    text += `Time left: <b>${h}h ${m}m</b>`;
  } else {
    text += `⛏️ Invest coins and earn <b>15% profit</b> in 24h!\n\n`;
    text += `Minimum invest: <b>${MIN_INVEST}</b> coins\n`;
    text += `Example: Invest 100 → Get 115 after 24h\n\n`;
    text += `কত coins invest করতে চান? টাইপ করে পাঠান।`;
  }

  const buttons = active && !active.claimed
    ? [[Markup.button.callback('🔙 Back', 'main_menu')]]
    : [[Markup.button.callback('🔙 Back', 'main_menu')]];

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard(buttons).reply_markup });
  ctx.session = ctx.session || {};
  ctx.session.awaitingMiningAmount = !active || active.claimed;
}

async function handleMiningClaim(ctx) {
  const userId = ctx.from.id;
  const { claimMining } = require('../database/services/miningService');
  const result = await claimMining(userId);
  if (result.success) {
    await ctx.answerCbQuery(`⛏️ +${result.total} coins!`, { show_alert: true });
  } else {
    await ctx.answerCbQuery(result.message, { show_alert: true });
  }
  await handleMiningMenu(ctx);
}

// Main callback query router
async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery.data;

  try {
    if (data === 'main_menu') await showMainMenu(ctx);
    else if (data === 'earn_menu') await handleEarnMenu(ctx);
    else if (data === 'daily_bonus') await handleDailyBonus(ctx);
    else if (data === 'spin_wheel') await handleSpinWheel(ctx);
    else if (data === 'spin_action') await handleSpinAction(ctx);
    else if (data === 'watch_ads') await handleWatchAds(ctx);
    else if (data === 'tasks_menu') await handleTasksMenu(ctx);
    else if (data === 'list_tasks') await handleListTasks(ctx);
    else if (data.startsWith('claim_task_')) {
      ctx.match = [data, data.replace('claim_task_', '')];
      await handleClaimTask(ctx);
    }
    else if (data === 'referral_menu') await handleReferralMenu(ctx);
    else if (data === 'wallet_menu') await handleWalletMenu(ctx);
    else if (data === 'withdraw_menu') await handleWithdrawMenu(ctx);
    else if (data === 'request_withdraw') await handleRequestWithdraw(ctx);
    else if (data === 'my_withdraws' || data === 'withdraw_history') await handleMyWithdraws(ctx);
    else if (data === 'leaderboard') await handleLeaderboard(ctx);
    else if (data === 'vip_menu') await handleVIPMenu(ctx);
    else if (data === 'buy_vip') await handleBuyVIP(ctx);
    else if (data === 'vip_benefits') await handleVIPMenu(ctx);
    else if (data === 'settings_menu') await handleSettings(ctx);
    else if (data === 'support') await handleSupport(ctx);
    else if (data === 'faucet_claim') await handleFaucet(ctx);
    else if (data === 'mining_menu') await handleMiningMenu(ctx);
    else if (data === 'mining_claim') await handleMiningClaim(ctx);
    else if (data === 'verify_channel') await require('./startHandler').handleVerifyChannel(ctx);
    else if (data === 'share_referral') {
      const link = generateReferralLink(ctx.from.id);
      await ctx.reply(`📤 Share this link with your friends:\n\n<code>${link}</code>\n\nYou earn ${config.settings.referralBonus} coins per successful referral!`, backKeyboard);
    }
    else if (data === 'my_referrals') {
      const count = await getReferralCount(ctx.from.id);
      await ctx.reply(`👥 You have referred <b>${count}</b> users so far.`, { parse_mode: 'HTML', ...backKeyboard });
    }
    else if (data === 'enter_verification_code') {
      ctx.session = ctx.session || {};
      ctx.session.awaitingVerificationCode = true;
      await ctx.reply('🔑 আপনার Verification Code টি এখন টাইপ করে পাঠান:');
    }

    await ctx.answerCbQuery().catch(() => {});
  } catch (err) {
    console.error('Callback error:', err);
    await ctx.answerCbQuery('An error occurred. Please try again.', { show_alert: true });
  }
}

module.exports = {
  showMainMenu,
  handleCallbackQuery,
  // Export individual if needed
  handleRequestWithdraw,
};
