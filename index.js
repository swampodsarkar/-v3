require('dotenv').config();

const express = require('express');
const { Telegraf, session } = require('telegraf');
const config = require('./config/config');
const { initializeFirebase, isFirebaseEnabled } = require('./database/firebase');

const { handleStart } = require('./handlers/startHandler');
const { handleCallbackQuery } = require('./handlers/menuHandler');
const { registerAdminCommands } = require('./commands/adminCommands');
const { handleAdminCallback, handleBroadcastMessage, handleCoinAction, handleBanAction } = require('./admin/adminHandler');
const { checkRateLimit } = require('./utils/security');
const { getUser } = require('./database/services/userService');

const bot = new Telegraf(config.botToken);
const app = express();

// Middleware
bot.use(session());

// ==================== VERIFICATION CODE SYSTEM (Anti-Cheat) ====================
const { pendingVerifications, MAX_AD_WATCHES, createVerification, getVerification, deleteVerification } = require('./utils/verification');

// Ad page: shows Monetag link, after 30s auto-redirects to code page
app.get('/watch-ad/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { getAdWatchCount } = require('./database/services/userService');
  const count = await getAdWatchCount(userId);
  const remaining = Math.max(0, MAX_AD_WATCHES - count);

  if (remaining <= 0) {
    return res.send(`<html><body style="text-align:center;padding:50px;font-family:Arial"><h2>❌ Limit Reached</h2><p>You have used all ${MAX_AD_WATCHES} watches.</p><a href="https://t.me/${config.botUsername.replace('@', '')}">Back to Bot</a></body></html>`);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Watch Ad</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="refresh" content="30;url=/verify-tab/${userId}">
      <style>
        body{font-family:Arial,sans-serif;text-align:center;padding:40px 20px;background:#f4f4f4}
        .container{max-width:400px;margin:0 auto;background:white;padding:30px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
        .btn{display:inline-block;background:#0088cc;color:white;padding:15px 30px;font-size:18px;border-radius:8px;text-decoration:none;margin-top:15px}
        .btn:hover{background:#006699}
        .warning{color:#d32f2f;font-size:14px;margin-top:15px}
        .remaining{color:#666;font-size:14px}
      </style>
    </head>
    <body>
      <div class="container">
        <h2>📺 Watch Ad</h2>
        <p class="remaining">বাকি: <b>${remaining}/${MAX_AD_WATCHES}</b></p>
        <p>নিচের লিংকে ক্লিক করে অ্যাড দেখুন।<br>৩০ সেকেন্ড পর অটো কোড পেজে যাবে।</p>
        <a class="btn" href="https://omg10.com/4/11060583" target="_blank">▶️ Open Ad</a>
        <p style="margin-top:20px;color:#666">⏳ ৩০ সেকেন্ড পর অটো রিডিরেক্ট...</p>
        <p class="warning">⚠️ মিথ্যা ক্লিক করলে কয়েন পাবেন না।</p>
      </div>
    </body>
    </html>
  `);
});

// Code page: shows verification code (auto-generated on load)
app.get('/verify-tab/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { getAdWatchCount } = require('./database/services/userService');
  const count = await getAdWatchCount(userId);
  const remaining = Math.max(0, MAX_AD_WATCHES - count);

  if (remaining <= 0) {
    return res.send(`<html><body style="text-align:center;padding:50px;font-family:Arial"><h2>❌ Limit Reached</h2><a href="https://t.me/${config.botUsername.replace('@', '')}">Back to Bot</a></body></html>`);
  }

  const code = createVerification(userId);

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Verification Code</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:Arial,sans-serif;text-align:center;padding:30px 20px;background:#f4f4f4}
        .container{max-width:400px;margin:0 auto;background:white;padding:25px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
        .code{font-size:28px;font-weight:bold;color:#0088cc;letter-spacing:3px;margin:15px 0;padding:10px;background:#f0f8ff;border-radius:8px}
        .btn{display:inline-block;background:#0088cc;color:white;padding:12px 25px;font-size:16px;border-radius:8px;text-decoration:none;margin-top:10px}
      </style>
    </head>
    <body>
      <div class="container">
        <h3>✅ আপনার Verification Code</h3>
        <div class="code" id="codeDisplay">${code}</div>
        <p>কোডটি কপি করে বটে পাঠান 🎯</p>
        <button class="btn" onclick="navigator.clipboard.writeText('${code}').then(()=>alert('✅ Copied!')).catch(()=>prompt('Copy:', '${code}'))">📋 Copy Code</button>
        <p style="margin-top:10px"><a class="btn" href="https://t.me/${config.botUsername.replace('@', '')}">Back to Bot</a></p>
      </div>
    </body>
    </html>
  `);
});

// ==================== END VERIFICATION SYSTEM ====================

// Security middleware
bot.use(async (ctx, next) => {
  if (!ctx.from) return;

  const userId = ctx.from.id;

  if (!checkRateLimit(userId, 40, 60000)) {
    return ctx.answerCbQuery && ctx.answerCbQuery('Too many requests. Slow down.', { show_alert: true });
  }

  if (config.adminId !== userId) {
    const user = await getUser(userId);
    if (user && user.isBanned) {
      return ctx.reply('🚫 You are banned.');
    }
  }

  return next();
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  if (ctx && ctx.reply) {
    ctx.reply('⚠️ An unexpected error occurred. Please try again later.').catch(() => {});
  }
});

// Commands
bot.start(handleStart);
bot.command('start', handleStart);
bot.command('help', async (ctx) => {
  await ctx.replyWithHTML(
    `📖 <b>Help & Commands</b>\n\n` +
    `Use the inline menu buttons to navigate.\n\n` +
    `<b>Available Commands:</b>\n` +
    `/start - Open main menu\n` +
    `/help - Show this help\n\n` +
    `For support contact the admin.`
  );
});

registerAdminCommands(bot);

// Text handler
bot.on('text', async (ctx) => {
  const sessionData = ctx.session || {};
  const text = ctx.message.text.trim();

  if (sessionData.awaitingWithdraw) {
    ctx.session.awaitingWithdraw = false;
    const amount = parseInt(text);
    if (isNaN(amount) || amount < config.settings.minWithdraw) {
      return ctx.reply(`❌ Invalid amount. Minimum is ${config.settings.minWithdraw} coins.`);
    }
    const { createWithdrawRequest } = require('./database/services/withdrawService');
    const result = await createWithdrawRequest(ctx.from.id, amount);
    return ctx.reply(result.success 
      ? `✅ Withdraw request submitted for ${amount} coins.` 
      : `❌ ${result.message}`);
  }

  if (sessionData.awaitingBroadcast) {
    ctx.session.awaitingBroadcast = false;
    if (!require('./admin/adminHandler').isAdmin(ctx.from.id)) return;
    await handleBroadcastMessage(ctx, text);
    return;
  }

  if (sessionData.awaitingCoinAction) {
    const action = sessionData.awaitingCoinAction;
    ctx.session.awaitingCoinAction = false;
    const [uid, amt] = text.split(' ').map(Number);
    if (!uid || !amt) return ctx.reply('Invalid format. Use: userId amount');
    await handleCoinAction(ctx, action, uid, amt);
    return;
  }

  if (sessionData.awaitingBanAction) {
    const action = sessionData.awaitingBanAction;
    ctx.session.awaitingBanAction = false;
    const uid = parseInt(text);
    if (!uid) return ctx.reply('Invalid user ID');
    await handleBanAction(ctx, action, uid);
    return;
  }

  // Mining amount input
  if (sessionData.awaitingMiningAmount) {
    ctx.session.awaitingMiningAmount = false;
    const amount = parseInt(text);
    const { MIN_INVEST } = require('./database/services/miningService');
    if (isNaN(amount) || amount < MIN_INVEST) {
      return ctx.reply(`❌ Minimum invest ${MIN_INVEST} coins. Enter a valid amount.`);
    }
    const { startMining } = require('./database/services/miningService');
    const result = await startMining(ctx.from.id, amount);
    return ctx.reply(result.success
      ? `⛏️ Mining started! ${amount} coins invested. Come back after 24h to claim +${Math.floor(amount * 0.15)} profit.`
      : `❌ ${result.message}`);
  }

  // Verification Code Submission
  if (sessionData.awaitingVerificationCode) {
    ctx.session.awaitingVerificationCode = false;
    const userId = ctx.from.id;
    const enteredCode = text.trim().toUpperCase();

    const verification = getVerification(userId);

    if (!verification) {
      return ctx.reply('❌ কোনো Verification Code পাওয়া যায়নি। "Open Ad" এ ক্লিক করে নতুন করে কোড নিন।');
    }

    if (verification.used) {
      return ctx.reply('❌ এই কোড ইতিমধ্যে ব্যবহার করা হয়েছে।');
    }

    if (Date.now() > verification.expiresAt) {
      deleteVerification(userId);
      return ctx.reply('❌ Verification Code এর মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন۔');
    }

    if (enteredCode !== verification.code) {
      return ctx.reply('❌ ভুল কোড। সঠিক কোডটি আবার চেক করে পাঠান।');
    }

    // Check ad watch limit (anti-cheat)
    const { getAdWatchCount, incrementAdWatchCount } = require('./database/services/userService');
    const watchCount = await getAdWatchCount(userId);

    if (watchCount >= MAX_AD_WATCHES) {
      deleteVerification(userId);
      return ctx.reply(`❌ আপনি সর্বোচ্চ ${MAX_AD_WATCHES} বার অ্যাড দেখেছেন।`);
    }

    // Success - Give reward
    verification.used = true;
    const { addCoins } = require('./database/services/balanceService');
    await addCoins(userId, 10, 'ads');
    const newCount = await incrementAdWatchCount(userId);
    const remaining = Math.max(0, MAX_AD_WATCHES - newCount);

    return ctx.replyWithHTML(
      `✅ <b>Verification Successful!</b>\n\n` +
      `+10 coins যোগ হয়েছে আপনার অ্যাকাউন্টে।\n\n` +
      `📊 বাকি: <b>${remaining}/${MAX_AD_WATCHES}</b> টি অ্যাড\n\n` +
      `আবার অ্যাড দেখতে চাইলে মেনু থেকে আসুন।`
    );
  }

  const { showMainMenu } = require('./handlers/menuHandler');
  await showMainMenu(ctx);
});

// Callback handlers
bot.on('callback_query', handleCallbackQuery);

bot.action(/^claim_task_(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  const { claimTask } = require('./database/services/taskService');
  const result = await claimTask(ctx.from.id, taskId);
  if (result.success) {
    await ctx.answerCbQuery(`✅ +${result.reward} coins claimed!`);
    const { handleListTasks } = require('./handlers/menuHandler');
    await handleListTasks(ctx);
  } else {
    await ctx.answerCbQuery(result.message || 'Error', { show_alert: true });
  }
});

bot.action(/^approve_wd_(.+)$/, async (ctx) => {
  const { isAdmin, handleAdminCallback } = require('./admin/adminHandler');
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('Access denied');
  const { approveWithdraw } = require('./database/services/withdrawService');
  await approveWithdraw(ctx.match[1]);
  await ctx.answerCbQuery('✅ Approved');
  ctx.callbackQuery.data = 'admin_withdraws';
  await handleAdminCallback(ctx);
});

bot.action(/^reject_wd_(.+)$/, async (ctx) => {
  const { isAdmin, handleAdminCallback } = require('./admin/adminHandler');
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('Access denied');
  const { rejectWithdraw } = require('./database/services/withdrawService');
  await rejectWithdraw(ctx.match[1]);
  await ctx.answerCbQuery('❌ Rejected & refunded');
  ctx.callbackQuery.data = 'admin_withdraws';
  await handleAdminCallback(ctx);
});

// ==================== RENDER READY WEBHOOK SETUP ====================

const PORT = process.env.PORT || config.settings.webhookPort || 3000;
const WEBHOOK_PATH = `/webhook/${config.botToken}`;

async function launchBot() {
  console.log('🚀 Starting Telegram Earning Bot...');

  // Initialize Firebase (optional - uses in-memory if credentials missing)
  initializeFirebase();

  // Health check route for Render
  app.get('/', (req, res) => {
    res.send('✅ Telegram Earning Bot is running on Render');
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: isFirebaseEnabled() ? 'firebase' : 'limited-memory' });
  });

  if (config.settings.useWebhook && config.settings.webhookUrl) {
    // Webhook mode (Recommended for Render)
    app.use(bot.webhookCallback(WEBHOOK_PATH));

    const fullWebhookUrl = `${config.settings.webhookUrl}${WEBHOOK_PATH}`;

    try {
      await bot.telegram.setWebhook(fullWebhookUrl);
      console.log(`✅ Webhook set successfully: ${fullWebhookUrl}`);
    } catch (err) {
      console.error('❌ Failed to set webhook:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`✅ Bot running on Render with WEBHOOK on port ${PORT}`);
      console.log(`Webhook URL: ${fullWebhookUrl}`);
    });
  } else {
    // Polling mode (only for local development)
    await bot.launch();
    console.log('✅ Bot launched with POLLING (not recommended for Render)');
  }

  console.log(`🤖 Bot @${config.botUsername} is running!`);
  console.log(`👑 Admin ID: ${config.adminId}`);

  if (!isFirebaseEnabled()) {
    console.log('⚠️  Running in LIMITED MODE (in-memory only). Data will reset on restart.');
  }

  console.log('Press Ctrl+C to stop.');
}

// Graceful shutdown
process.once('SIGINT', () => { try { bot.stop('SIGINT'); } catch(e) {} });
process.once('SIGTERM', () => { try { bot.stop('SIGTERM'); } catch(e) {} });

launchBot().catch(err => {
  console.error('Failed to launch bot:', err);
  process.exit(1);
});
