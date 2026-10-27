/**
 * 轻量内存限流器。
 *
 * 目标：阻止对登录、注册、Token 兑换等接口的暴力破解与撞库。
 * 单实例部署足够；多实例部署需替换为 Redis 等共享存储。
 */
const createRateLimiter = ({ windowMs, max, message, keyGenerator, skipSuccessfulRequests = false }) => {
  const hits = new Map();

  const getKey = keyGenerator || ((req) => req.ip);

  // 定期清理过期记录，避免内存无限增长
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, Math.min(windowMs, 60 * 1000));
  if (cleanupTimer.unref) cleanupTimer.unref();

  const middleware = (req, res, next) => {
    const key = getKey(req);
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: message || '请求过于频繁，请稍后再试',
        timestamp: new Date().toISOString()
      });
    }

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        // 成功请求不计数，只对失败尝试限流
        if (res.statusCode < 400) {
          const current = hits.get(key);
          if (current) {
            current.count = Math.max(0, current.count - 1);
          }
        }
      });
    }

    next();
  };

  middleware.reset = () => hits.clear();
  return middleware;
};

module.exports = createRateLimiter;
