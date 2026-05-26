const admin = require('firebase-admin');
const config = require('../config/config');

let db = null;

function initializeFirebase() {
  if (db) return db;

  const hasCredentials = config.firebase.projectId && 
                         config.firebase.clientEmail && 
                         config.firebase.privateKey && 
                         config.firebase.databaseURL;

  if (!hasCredentials) {
    console.log('⚠️  Firebase credentials not found in .env — running without database (limited mode)');
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
      databaseURL: config.firebase.databaseURL,
    });

    db = admin.database();
    console.log('✅ Firebase Realtime Database connected');
    return db;
  } catch (error) {
    console.error('⚠️  Firebase initialization failed:', error.message);
    console.log('⚠️  Bot will run in limited mode without database.');
    return null;
  }
}

function getDB() {
  if (!db) {
    const result = initializeFirebase();
    if (!result) {
      return getMockDB();   // fallback to in-memory
    }
  }
  return db;
}

function isFirebaseEnabled() {
  return !!db;
}

// Simple in-memory fallback when Firebase is disabled
let memoryDB = new Map();

function getMockDB() {
  return {
    ref: (path) => {
      const dataPath = path || '';
      return {
        once: async () => ({ val: () => memoryDB.get(dataPath) || null }),
        set: async (val) => { memoryDB.set(dataPath, val); return true; },
        update: async (val) => {
          const current = memoryDB.get(dataPath) || {};
          memoryDB.set(dataPath, { ...current, ...val });
          return true;
        },
        transaction: async (fn) => {
          const current = memoryDB.get(dataPath) || 0;
          memoryDB.set(dataPath, fn(current));
        }
      };
    }
  };
}

module.exports = {
  initializeFirebase,
  getDB,
  isFirebaseEnabled,
  admin,
  getMockDB,
};
