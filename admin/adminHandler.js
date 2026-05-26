const { Markup } = require('telegraf');
const { getTotalStats, addCoins, removeCoins, getLeaderboard } = require('../database/services/balanceService');
const { getAllUsers, banUser, unbanUser } = require('../database/services/userService');
const { getWithdrawRequests, approveWithdraw, rejectWithdraw } = require('../database/services/withdrawService');
const config = require('../config/config');
const { adminKeyboard } = require('../keyboards/mainKeyboard');
const { formatNumber } = require('../utils/helpers');

function isAdmin(userId) {
  return userId === config.adminId;
}

async function handleAdmin(ctx) {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply('🚫 Admin access only.');
  }

  const text = `⚙️ <b>Admin Panel</b>\n\nSelect an action:`;
  await ctx.replyWithHTML(text, adminKeyboard);
}

async function handleAdminCallback(ctx) {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('Access denied');

  const data = ctx.callbackQuery.data;

  if (data === 'admin_close') {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  if (data === 'admin_back') {
    const text = `⚙️ <b>Admin Panel</b>\n\nSelect an action:`;
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...adminKeyboard });
    return;
  }

  if (data === 'admin_stats') {
    const stats = await getTotalStats();
    const users = await getAllUsers();
    const text = `📊 <b>Bot Statistics</b>\n\n` +
      `👥 Total Users: <b>${stats.totalUsers}</b>\n` +
      `💰 Coins Distributed: <b>${formatNumber(stats.totalCoinsDistributed)}</b>\n` +
      `👑 VIP Users: <b>${Object.values(users).filter(u => u.isVIP).length}</b>`;
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...adminKeyboard });
  }

  else if (data === 'admin_broadcast') {
    await ctx.reply('📢 Send the message you want to broadcast to all users (reply to this):');
    ctx.session = ctx.session || {};
    ctx.session.awaitingBroadcast = true;
  }

  else if (data === 'admin_addcoins' || data === 'admin_removecoins') {
    const action = data.includes('add') ? 'add' : 'remove';
    await ctx.reply(`Enter: userId amount (e.g. 123456789 500) for ${action} coins`);
    ctx.session = ctx.session || {};
    ctx.session.awaitingCoinAction = action;
  }

  else if (data === 'admin_ban' || data === 'admin_unban') {
    const action = data.includes('ban') ? 'ban' : 'unban';
    await ctx.reply(`Enter userId to ${action}:`);
    ctx.session = ctx.session || {};
    ctx.session.awaitingBanAction = action;
  }

  else if (data === 'admin_withdraws') {
    const pending = await getWithdrawRequests('pending');
    if (!pending.length) {
      return ctx.editMessageText('No pending withdraws.', { parse_mode: 'HTML', ...adminKeyboard });
    }

    let text = `💸 <b>Pending Withdraws (${pending.length})</b>\n\n`;
    const buttons = [];

    pending.slice(0, 5).forEach(req => {
      text += `ID: ${req.id}\nUser: ${req.userId} | Amount: ${req.amount}\n\n`;
      buttons.push([
        Markup.button.callback(`✅ Approve ${req.id}`, `approve_wd_${req.id}`),
        Markup.button.callback(`❌ Reject ${req.id}`, `reject_wd_${req.id}`),
      ]);
    });

    buttons.push([Markup.button.callback('🔙 Back', 'admin_back')]);
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
    });
  }

  else if (data === 'admin_users') {
    const users = await getAllUsers();
    const count = Object.keys(users).length;
    const text = `👥 Total registered users: <b>${count}</b>`;
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...adminKeyboard });
  }

  else if (data.startsWith('approve_wd_')) {
    const id = data.replace('approve_wd_', '');
    await approveWithdraw(id);
    await ctx.answerCbQuery('Approved!');
    // refresh list
    ctx.callbackQuery.data = 'admin_withdraws';
    await handleAdminCallback(ctx);
  }

  else if (data.startsWith('reject_wd_')) {
    const id = data.replace('reject_wd_', '');
    await rejectWithdraw(id);
    await ctx.answerCbQuery('Rejected & refunded');
    ctx.callbackQuery.data = 'admin_withdraws';
    await handleAdminCallback(ctx);
  }

  else if (data === 'admin_create_code') {
    await ctx.reply('🔑 Enter: CODE REWARD [maxUses]\nExample: WELCOME100 100 50\n(CODE = uppercase, REWARD = coins, maxUses = optional, 0 = unlimited)');
    ctx.session = ctx.session || {};
    ctx.session.awaitingCodeCreate = true;
  }

  else if (data === 'admin_list_codes') {
    const { getAllCodes } = require('../database/services/hiddenCodeService');
    const codes = await getAllCodes();
    const entries = Object.entries(codes);
    if (!entries.length) return ctx.editMessageText('No codes yet.', { parse_mode: 'HTML', ...adminKeyboard });
    let text = '🔑 <b>Hidden Codes</b>\n\n';
    const buttons = [];
    entries.slice(0, 10).forEach(([code, data]) => {
      text += `<code>${code}</code> | +${data.reward} coins | Uses: ${data.uses}/${data.maxUses || '∞'} | ${data.active ? '✅' : '❌'}\n`;
      buttons.push([Markup.button.callback(`${data.active ? '🔄 Deactivate' : '🔄 Activate'} ${code}`, `admin_toggle_code_${code}`)]);
    });
    buttons.push([Markup.button.callback('🔙 Back', 'admin_back')]);
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard(buttons).reply_markup });
  }

  else if (data.startsWith('admin_toggle_code_')) {
    const code = data.replace('admin_toggle_code_', '');
    const { toggleCode } = require('../database/services/hiddenCodeService');
    await toggleCode(code);
    ctx.callbackQuery.data = 'admin_list_codes';
    await handleAdminCallback(ctx);
  }

  await ctx.answerCbQuery().catch(() => {});
}

async function handleBroadcastMessage(ctx, message) {
  if (!isAdmin(ctx.from.id)) return;

  const users = await getAllUsers();
  let sent = 0;
  let failed = 0;

  for (const uid of Object.keys(users)) {
    try {
      await ctx.telegram.sendMessage(uid, message, { parse_mode: 'HTML' });
      sent++;
      await new Promise(r => setTimeout(r, 50)); // rate limit friendly
    } catch (e) {
      failed++;
    }
  }

  await ctx.reply(`📢 Broadcast complete.\nSent: ${sent}\nFailed: ${failed}`);
}

async function handleCoinAction(ctx, action, userId, amount) {
  if (!isAdmin(ctx.from.id)) return;

  try {
    if (action === 'add') {
      await addCoins(userId, amount);
      await ctx.reply(`✅ Added ${amount} coins to user ${userId}`);
    } else {
      await removeCoins(userId, amount);
      await ctx.reply(`✅ Removed ${amount} coins from user ${userId}`);
    }
  } catch (e) {
    await ctx.reply('Error processing coin action.');
  }
}

async function handleBanAction(ctx, action, userId) {
  if (!isAdmin(ctx.from.id)) return;

  if (action === 'ban') {
    await banUser(userId);
    await ctx.reply(`🚫 User ${userId} banned.`);
  } else {
    await unbanUser(userId);
    await ctx.reply(`✅ User ${userId} unbanned.`);
  }
}

module.exports = {
  handleAdmin,
  handleAdminCallback,
  handleBroadcastMessage,
  handleCoinAction,
  handleBanAction,
  isAdmin,
};
