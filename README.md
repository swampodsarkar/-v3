# 🚀 Telegram Classic Earning Bot

Professional, modern, and scalable Telegram earning bot built with **Node.js + Telegraf.js + Firebase Realtime Database**.

## ✨ Features

- User Registration with Referral System
- Daily Bonus (with 24h cooldown)
- Spin Wheel (with cooldown + daily limit)
- Watch Ads (simulated + real integration ready)
- Tasks System
- Full Wallet + Withdraw System (admin approval)
- Leaderboard
- VIP Membership
- Complete Admin Panel (`/admin`, broadcast, coins, ban, withdraws)
- Anti-spam, rate limiting, ban system
- Clean inline keyboard navigation
- Webhook + Polling support
- Production ready (Render, Railway, Koyeb, VPS)

## 📁 Project Structure

```
.
├── admin/
│   └── adminHandler.js
├── commands/
│   └── adminCommands.js
├── config/
│   ├── config.js
│   └── setup.js
├── database/
│   ├── firebase.js
│   └── services/
│       ├── userService.js
│       ├── balanceService.js
│       ├── referralService.js
│       ├── dailyBonusService.js
│       ├── spinService.js
│       ├── withdrawService.js
│       └── taskService.js
├── handlers/
│   ├── startHandler.js
│   └── menuHandler.js
├── keyboards/
│   └── mainKeyboard.js
├── utils/
│   ├── helpers.js
│   └── security.js
├── index.js
├── package.json
├── .env.example
└── README.md
```

## 🔧 Setup

1. **Clone & Install**
   ```bash
   git clone <your-repo>
   cd telegram-earning-bot
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Firebase Setup**
   - Create Firebase project
   - Enable Realtime Database
   - Generate Service Account Key (Project Settings → Service Accounts)
   - Paste values into `.env`

4. **Firebase Security Rules** (copy to Firebase Console → Realtime Database → Rules):
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null",
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid || root.child('admins').child(auth.uid).val() === true",
           ".write": "$uid === auth.uid || root.child('admins').child(auth.uid).val() === true"
         }
       }
     }
   }
   ```
   (For simplicity during dev you can use public rules — tighten later)

5. **Bot Setup**
   - Create bot at [@BotFather](https://t.me/BotFather) → get `BOT_TOKEN`
   - Get your Telegram ID via [@userinfobot](https://t.me/userinfobot) → set `ADMIN_ID`
   - Set `BOT_USERNAME`

6. **Run**
   ```bash
   npm start
   ```

## 🚀 Deployment on Render (Recommended)

### Step-by-step Render Deployment

1. **Push your code to GitHub** (Render works best with GitHub).

2. Go to [Render.com](https://render.com) → New → **Web Service**.

3. Connect your GitHub repo.

4. **Render Settings**:
   - **Name**: `telegram-earning-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid)

5. **Add Environment Variables** (Important):
   Copy these from your `.env` and add in Render dashboard:

   ```
   BOT_TOKEN=your_bot_token
   ADMIN_ID=your_telegram_id
   BOT_USERNAME=yourbotusername

   USE_WEBHOOK=true
   WEBHOOK_URL=https://your-service-name.onrender.com

   # Firebase (optional for now)
   FIREBASE_PROJECT_ID=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY=
   FIREBASE_DATABASE_URL=
   ```

6. Deploy.

Render will automatically set `RENDER_EXTERNAL_URL`, so the bot will use webhook mode.

### Important Notes for Render Free Plan
- Free instances sleep after 15 minutes of inactivity.
- The bot will wake up when someone sends a message (webhook will trigger it).
- For 24/7 uptime, upgrade to a paid plan.

### Health Check
Render will hit `/health` and `/` endpoints automatically.

---

### Other Platforms

**Railway / Koyeb / VPS**:
Use the same environment variables. Set `USE_WEBHOOK=true` + your public URL.

## 💡 Key Commands (Users)

- `/start` — Main entry + registration
- All navigation via beautiful inline keyboards

## 🛡️ Admin Commands

```
/admin
/stats
/broadcast
/addcoins <userId> <amount>
/removecoins <userId> <amount>
/ban <userId>
/unban <userId>
/withdraws
```

## 🔒 Security Features

- Rate limiting per user
- Cooldowns on spin/daily
- Duplicate claim prevention
- Referral abuse protection
- Admin-only command protection
- Ban system

## 📌 Customization

- Edit `config/config.js` for rewards, limits, VIP price
- Add real ad networks in `handleWatchAds`
- Expand tasks in `taskService.js`
- Add payment gateways for real money withdraws

## 📄 License

MIT

---

Made with ❤️ for professional Telegram earning platforms.
