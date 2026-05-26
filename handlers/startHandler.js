const { Markup } = require('telegraf');
const { getUser, createUser } = require('../database/services/userService');
const { addReferral } = require('../database/services/referralService');
const { getBalance } = require('../database/services/balanceService');
const { mainMenuKeyboard } = require('../keyboards/mainKeyboard');
const config = require('../config/config');
const { generateReferralLink } = require('../utils/helpers');

async function handleStart(ctx) {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;

  // Check if banned
  const user = await getUser(userId);
  if (user && user.isBanned) {
    return ctx.reply('🚫 You are banned from using this bot.');
  }

  let isNewUser = false;
  let referredBy = null;

  // Handle referral
  if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
    const refId = parseInt(ctx.startPayload.replace('ref_', ''));
    if (refId && refId !== userId) {
      referredBy = refId;
    }
  }

  if (!user) {
    isNewUser = true;
    const newUser = {
      id: userId,
      username,
      first_name: firstName,
      referredBy,
    };
    await createUser(newUser);

    if (referredBy) {
      await addReferral(referredBy, userId);
      // Notify referrer (optional)
      try {
        await ctx.telegram.sendMessage(referredBy, `🎉 New referral! +${config.settings.referralBonus} coins from @${username || userId}`);
      } catch (e) {}
    }
  }

  // Channel verification (force join)
  const channel = config.settings.channelUsername;
  if (channel && channel !== '@yourchannel') {
    try {
      const member = await ctx.telegram.getChatMember(channel, userId);
      if (!['member', 'administrator', 'creator'].includes(member.status)) {
        return ctx.replyWithHTML(
          `📢 <b>Please join our channel first!</b>\n\n` +
          `Channel: ${channel}\n\n` +
          `After joining, click /start again.`,
          Markup.inlineKeyboard([
            [Markup.button.url('➡️ Join Channel', `https://t.me/${channel.replace('@', '')}`)],
            [Markup.button.callback('✅ I Joined - Verify', 'verify_channel')],
          ])
        );
      }
    } catch (err) {
      console.error('Channel check error:', err.message);
    }
  }

  let noticeText = '';
  try {
    const { getDB } = require('../database/firebase');
    const snap = await getDB().ref('notice').once('value');
    const notice = snap.val();
    if (notice) noticeText = `📢 <b>Notice:</b>\n${notice}\n\n`;
  } catch(e) {}

  const balance = await getBalance(userId);
  const refLink = generateReferralLink(userId);

  const welcomeText = noticeText + (isNewUser
    ? `🎉 <b>Welcome to Classic Earning Bot!</b>\n\n` +
      `Earn coins daily, spin the wheel, watch ads, complete tasks and withdraw real rewards!\n\n` +
      `💰 Your Balance: <b>${balance.coins}</b> coins\n` +
      `👥 Referral Link: <code>${refLink}</code>`
    : `🏠 <b>Welcome back, ${firstName}!</b>\n\n` +
      `💰 Balance: <b>${balance.coins}</b> coins\n` +
      `Use the menu below to start earning.`);

  await ctx.replyWithHTML(welcomeText, mainMenuKeyboard);
}

async function handleVerifyChannel(ctx) {
  // Re-run start logic basically
  await handleStart(ctx);
  try { await ctx.deleteMessage(); } catch(e){}
}

module.exports = {
  handleStart,
  handleVerifyChannel,
};
