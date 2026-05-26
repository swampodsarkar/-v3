const userCooldowns = new Map();

function checkCooldown(userId, action, cooldownMs) {
  const key = `${userId}_${action}`;
  const now = Date.now();
  const last = userCooldowns.get(key) || 0;
  const remaining = last + cooldownMs - now;

  if (remaining > 0) {
    return { allowed: false, remaining };
  }

  userCooldowns.set(key, now);
  return { allowed: true, remaining: 0 };
}

function clearCooldown(userId, action) {
  const key = `${userId}_${action}`;
  userCooldowns.delete(key);
}

// Simple in-memory rate limit (per minute)
const rateLimits = new Map();

function checkRateLimit(userId, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const key = userId.toString();
  let record = rateLimits.get(key);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimits.set(key, record);
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

module.exports = {
  checkCooldown,
  clearCooldown,
  checkRateLimit,
};
