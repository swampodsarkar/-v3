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
const pendingVerifications = new Map(); // userId -> { code, expiresAt, used: false }
const MAX_AD_WATCHES = 10;

function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Combined Ad Watch + Auto Verification Page (30s timer)
app.get('/watch-ad/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { getAdWatchCount } = require('./database/services/userService');
  const count = await getAdWatchCount(userId);
  const remaining = Math.max(0, MAX_AD_WATCHES - count);

  if (remaining <= 0) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Limit Reached</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px 20px; background: #f4f4f4; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Limit Reached</h2>
          <p>আপনি সর্বোচ্চ <b>${MAX_AD_WATCHES} বার</b> অ্যাড দেখেছেন।</p>
          <p>অন্য কাজ দেখে কয়েন আয় করুন।</p>
          <p><a href="https://t.me/${config.botUsername.replace('@', '')}">🔙 Back to Bot</a></p>
        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Watch Ad & Earn</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; background: #f4f4f4; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { display: inline-block; background: #0088cc; color: white; border: none; padding: 15px 30px; font-size: 18px; border-radius: 8px; cursor: pointer; margin-top: 15px; text-decoration: none; }
        .btn:hover { background: #006699; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .timer { font-size: 48px; font-weight: bold; color: #0088cc; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; color: #0088cc; letter-spacing: 3px; margin: 20px 0; padding: 10px; background: #f0f8ff; border-radius: 8px; }
        .warning { color: #d32f2f; font-size: 14px; margin-top: 15px; }
        .hidden { display: none; }
        .remaining { color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>📺 Watch Ad & Earn</h2>
        <p class="remaining">বাকি: <b>${remaining}/${MAX_AD_WATCHES}</b></p>
        <p>নিচের বাটনে ক্লিক করে অ্যাড দেখুন এবং <b>৩০ সেকেন্ড</b> অপেক্ষা করুন।</p>

        <div id="step1">
          <button class="btn" id="watchBtn" onclick="startAd()">▶️ Watch Ad Now</button>
          <div class="timer" id="timerDisplay">⏱ 30</div>
          <p id="statusText">বাটনে ক্লিক করে অ্যাড শুরু করুন</p>
        </div>

        <div id="step2" class="hidden">
          <p>✅ অ্যাড দেখা শেষ! আপনার Verification Code:</p>
          <div class="code" id="codeDisplay">------</div>
          <p>কোডটি কপি করে বটে পাঠান 🎯</p>
          <button class="btn" onclick="copyCode()">📋 Copy Code</button>
          <p style="margin-top:10px"><a class="btn" href="https://t.me/${config.botUsername.replace('@', '')}">🔙 Back to Bot</a></p>
        </div>

        <p class="warning">⚠️ মিথ্যা ক্লিক করলে কয়েন পাবেন না এবং অ্যাকাউন্ট সাসপেন্ড হতে পারে।</p>
        <p class="warning">⚠️ দয়া করে পুরো ৩০ সেকেন্ড অপেক্ষা করুন।</p>
      </div>

      <script>
        let timer = 30;
        let interval = null;
        let codeGenerated = false;

        function startAd() {
          document.getElementById('watchBtn').disabled = true;
          document.getElementById('watchBtn').textContent = '⏳ Watching...';
          document.getElementById('statusText').textContent = 'অ্যাড চলছে, ${30} সেকেন্ড অপেক্ষা করুন...';

          window.open('https://omg10.com/4/11060583', '_blank');

          interval = setInterval(() => {
            timer--;
            document.getElementById('timerDisplay').textContent = '⏱ ' + timer;

            if (timer <= 0) {
              clearInterval(interval);
              if (!codeGenerated) generateCode();
            }
          }, 1000);
        }

        async function generateCode() {
          codeGenerated = true;
          document.getElementById('statusText').textContent = '✅ কোড জেনারেট হচ্ছে...';

          try {
            const response = await fetch('/api/generate-code/${userId}');
            const data = await response.json();

            if (data.success && data.code) {
              document.getElementById('step1').classList.add('hidden');
              document.getElementById('step2').classList.remove('hidden');
              document.getElementById('codeDisplay').textContent = data.code;
            } else {
              document.getElementById('statusText').textContent = '❌ ' + (data.message || 'Error');
              document.getElementById('watchBtn').disabled = false;
              document.getElementById('watchBtn').textContent = '▶️ Try Again';
              codeGenerated = false;
            }
          } catch (err) {
            document.getElementById('statusText').textContent = '❌ Error generating code. Try again.';
            document.getElementById('watchBtn').disabled = false;
            document.getElementById('watchBtn').textContent = '▶️ Try Again';
            codeGenerated = false;
          }
        }

        function copyCode() {
          const code = document.getElementById('codeDisplay').textContent;
          navigator.clipboard.writeText(code).then(() => {
            alert('✅ Code copied!');
          }).catch(() => {
            alert('Code: ' + code);
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Handle verification and generate code (legacy POST method)
app.post('/verify/:userId', express.urlencoded({ extended: true }), async (req, res) => {
  const userId = req.params.userId;
  const code = generateVerificationCode();
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes expiry

  pendingVerifications.set(userId, {
    code,
    expiresAt,
    used: false
  });

  res.send(`
    <html>
    <head><title>Verification Code</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
      <h2>🎉 Verification Successful!</h2>
      <p>আপনার Verification Code:</p>
      <h1 style="color: #0088cc; font-size: 32px; letter-spacing: 3px;">${code}</h1>
      <p>এই কোডটি <strong>১০ মিনিটের</strong> মধ্যে বটে পাঠিয়ে দিন।</p>
      <p><strong>বটে ফিরে গিয়ে কোডটি টাইপ করুন।</strong></p>
    </body>
    </html>
  `);
});

// API: Generate verification code (for /watch-ad page)
app.get('/api/generate-code/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { getAdWatchCount } = require('./database/services/userService');
  const count = await getAdWatchCount(userId);

  if (count >= MAX_AD_WATCHES) {
    return res.json({ success: false, message: 'Limit reached' });
  }

  const code = generateVerificationCode();
  const expiresAt = Date.now() + (10 * 60 * 1000);

  pendingVerifications.set(userId, {
    code,
    expiresAt,
    used: false
  });

  res.json({ success: true, code });
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

  // Verification Code Submission
  if (sessionData.awaitingVerificationCode) {
    ctx.session.awaitingVerificationCode = false;
    const userId = ctx.from.id;
    const enteredCode = text.trim().toUpperCase();

    const verification = pendingVerifications.get(userId);

    if (!verification) {
      return ctx.reply('❌ কোনো Verification Code পাওয়া যায়নি। আবার "Get Verification Code" চাপুন।');
    }

    if (verification.used) {
      return ctx.reply('❌ এই কোড ইতিমধ্যে ব্যবহার করা হয়েছে।');
    }

    if (Date.now() > verification.expiresAt) {
      pendingVerifications.delete(userId);
      return ctx.reply('❌ Verification Code এর মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।');
    }

    if (enteredCode !== verification.code) {
      return ctx.reply('❌ ভুল কোড। সঠিক কোডটি আবার চেক করে পাঠান।');
    }

    // Check ad watch limit (anti-cheat)
    const { getAdWatchCount, incrementAdWatchCount } = require('./database/services/userService');
    const watchCount = await getAdWatchCount(userId);

    if (watchCount >= MAX_AD_WATCHES) {
      pendingVerifications.delete(userId);
      return ctx.reply(`❌ আপনি সর্বোচ্চ ${MAX_AD_WATCHES} বার অ্যাড দেখেছেন।`);
    }

    // Success - Give reward
    verification.used = true;
    const { addCoins } = require('./database/services/balanceService');
    await addCoins(userId, 20, 'ads'); // 20 coins per verified ad
    const newCount = await incrementAdWatchCount(userId);
    const remaining = Math.max(0, MAX_AD_WATCHES - newCount);

    return ctx.replyWithHTML(
      `✅ <b>Verification Successful!</b>\n\n` +
      `+20 coins যোগ হয়েছে আপনার অ্যাকাউন্টে।\n\n` +
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

// Start entering verification code
bot.action('enter_verification_code', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.awaitingVerificationCode = true;
  await ctx.reply('🔑 আপনার Verification Code টি এখন টাইপ করে পাঠান:');
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
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

launchBot().catch(err => {
  console.error('Failed to launch bot:', err);
  process.exit(1);
});
