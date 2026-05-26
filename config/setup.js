// Setup helper script - run with npm run setup
const fs = require('fs');
const path = require('path');

console.log('🚀 Telegram Earning Bot Setup');
console.log('1. Copy .env.example to .env and fill in your credentials');
console.log('2. Get Firebase service account JSON from Firebase Console');
console.log('3. Set BOT_TOKEN from @BotFather');
console.log('4. Add your ADMIN_ID (get from @userinfobot)');
console.log('5. Create Firebase Realtime Database');
console.log('6. Set required security rules for database (see README)');
console.log('\n✅ After setup, run: npm start');
