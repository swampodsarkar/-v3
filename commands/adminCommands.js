const { handleAdmin } = require('../admin/adminHandler');

async function registerAdminCommands(bot) {
  bot.command('admin', handleAdmin);

  bot.command('stats', async (ctx) => {
    const { isAdmin, handleAdminCallback } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    ctx.callbackQuery = { data: 'admin_stats' };
    await handleAdminCallback(ctx);
  });

  bot.command('broadcast', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return ctx.reply('Admin only');
    await ctx.reply('Send the broadcast message now:');
    ctx.session = ctx.session || {};
    ctx.session.awaitingBroadcast = true;
  });

  bot.command('addcoins', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Usage: /addcoins <userId> <amount>');
    const { handleCoinAction } = require('../admin/adminHandler');
    await handleCoinAction(ctx, 'add', parseInt(args[0]), parseInt(args[1]));
  });

  bot.command('removecoins', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Usage: /removecoins <userId> <amount>');
    const { handleCoinAction } = require('../admin/adminHandler');
    await handleCoinAction(ctx, 'remove', parseInt(args[0]), parseInt(args[1]));
  });

  bot.command('ban', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    const userId = parseInt(ctx.message.text.split(' ')[1]);
    if (!userId) return ctx.reply('Usage: /ban <userId>');
    const { handleBanAction } = require('../admin/adminHandler');
    await handleBanAction(ctx, 'ban', userId);
  });

  bot.command('unban', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    const userId = parseInt(ctx.message.text.split(' ')[1]);
    if (!userId) return ctx.reply('Usage: /unban <userId>');
    const { handleBanAction } = require('../admin/adminHandler');
    await handleBanAction(ctx, 'unban', userId);
  });

  bot.command('withdraws', async (ctx) => {
    const { isAdmin, handleAdminCallback } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    ctx.callbackQuery = { data: 'admin_withdraws' };
    await handleAdminCallback(ctx);
  });

  bot.command('notice', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    const msg = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!msg) return ctx.reply('Usage: /notice <message>');
    const { getDB } = require('../database/firebase');
    await getDB().ref('notice').set(msg);
    await ctx.reply('✅ Notice updated!');
  });

  bot.command('removenotice', async (ctx) => {
    const { isAdmin } = require('../admin/adminHandler');
    if (!isAdmin(ctx.from.id)) return;
    const { getDB } = require('../database/firebase');
    await getDB().ref('notice').set('');
    await ctx.reply('✅ Notice removed!');
  });

  bot.command('code', async (ctx) => {
    const code = ctx.message.text.split(' ').slice(1).join(' ').trim().toUpperCase();
    if (!code) return ctx.reply('Usage: /code CODE_NAME');
    const { claimCode } = require('../database/services/hiddenCodeService');
    const result = await claimCode(ctx.from.id, code);
    if (result.success) {
      return ctx.replyWithHTML(`✅ <b>Code Redeemed!</b>\n\n+${result.reward} coins যোগ হয়েছে।`);
    }
    return ctx.reply(result.message);
  });
}

module.exports = { registerAdminCommands };
