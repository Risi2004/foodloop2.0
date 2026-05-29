const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.CHAT_RATE_LIMIT_MAX) || 20;

const hits = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function chatRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let entry = hits.get(ip);

  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      code: 'CHAT_RATE_LIMIT',
      message: 'Too many chat messages. Please wait a few minutes and try again.',
    });
  }

  return next();
}

module.exports = { chatRateLimit };
