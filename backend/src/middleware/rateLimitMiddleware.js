/**
 * In-memory sliding window rate limiter middleware.
 */

const rateLimitBuckets = new Map();

/**
 * Clean up expired rate limit entries every 10 minutes.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitBuckets.entries()) {
    if (now > record.resetTime) {
      rateLimitBuckets.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generic Rate Limiter Generator
 * @param {Object} options - { windowMs, maxRequests, message }
 */
export function createRateLimiter(options) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const maxRequests = options.maxRequests || 100;
  const message = options.message || 'Too many requests. Please try again later.';

  return (req, res, next) => {
    const identifier = req.user?.uid || req.ip || 'anonymous';
    const routeKey = `${req.baseUrl}${req.path}:${identifier}`;
    const now = Date.now();

    let record = rateLimitBuckets.get(routeKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitBuckets.set(routeKey, record);
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    next();
  };
}

// Preset Rate Limiters
export const emergencyRequestLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Emergency access request limit reached (max 5 per hour). Please wait before trying again.',
});

export const verificationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Verification attempt limit exceeded (max 10 per hour). Account temporarily locked for safety.',
});

export const fileAccessLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'File access URL rate limit exceeded (max 30 requests per minute).',
});

export const securityApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'Security action limit exceeded. Please slow down.',
});
