const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateWithApiToken } = require('./apiToken');

// JWT 签名/校验参数集中管理，固定算法以防御算法混淆类攻击
const JWT_ALGORITHM = 'HS256';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

// jsonwebtoken 的 expiresIn 解析规则见其 lib/timespan.js：
//   - 数字类型  -> 按「秒」
//   - 字符串    -> 交给 ms 库解析，而 ms 对「纯数字字符串」按「毫秒」处理！
//
// 环境变量永远是字符串，所以 JWT_EXPIRES_IN=180 实际得到 180 毫秒，
// 换算后 exp - iat = 0，token 一经签发就已过期，表现为
// 「登录成功，但紧接着所有接口都返回 401 Token is not valid」。
//
// 因此这里强制要求带单位（s/m/h/d/w/y），拒绝纯数字与 ms 级单位。
const JWT_EXPIRES_IN_PATTERN = /^(\d+(?:\.\d+)?)\s*(s|m|h|d|w|y)$/i;

const getJwtExpiresIn = () => {
  const raw = process.env.JWT_EXPIRES_IN;

  // 未配置或空值：使用安全的默认值
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '7d';
  }

  const value = String(raw).trim();

  // 纯数字是最常见的误配，单独给出精确提示
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(
      `JWT_EXPIRES_IN 不能使用纯数字：「${value}」。` +
      'jsonwebtoken 会把字符串形式的纯数字当作「毫秒」，导致 token 立即过期，' +
      `表现为「登录成功但接口全部返回 401」。请显式写明单位，例如 ${value}d 表示 ${value} 天。`
    );
  }

  const matched = JWT_EXPIRES_IN_PATTERN.exec(value);
  if (!matched) {
    throw new Error(
      `JWT_EXPIRES_IN 格式不合法：「${value}」。` +
      '必须写成「正数 + 单位」，单位可为 s/m/h/d/w/y，例如 7d、12h、30m。' +
      '不能使用 0、负数或 ms 级单位。'
    );
  }

  if (!(Number(matched[1]) > 0)) {
    throw new Error(
      `JWT_EXPIRES_IN 必须大于 0：「${value}」会导致签发的 token 立即过期。`
    );
  }

  return value;
};

/**
 * 统一认证中间件：
 * 1. 优先使用 Authorization: Bearer <JWT>
 * 2. 没有 JWT 或 JWT 无效时，回退到 X-API-Token
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  const hasApiToken = !!req.header('X-API-Token');

  if (bearerToken) {
    try {
      // 显式指定算法白名单，防止 alg:none / 算法混淆伪造
      const decoded = jwt.verify(bearerToken, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });

      if (!decoded || decoded.userId === undefined || decoded.userId === null) {
        throw new Error('Invalid token payload');
      }

      const user = await User.findByPk(decoded.userId);

      if (!user) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = user;
      return next();
    } catch (error) {
      if (!hasApiToken) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
    }
  }

  if (hasApiToken) {
    try {
      const result = await authenticateWithApiToken(req);

      if (result) {
        req.user = result.user;
        req.apiToken = result.apiToken;
        return next();
      }

      return res.status(401).json({ message: 'Invalid API token' });
    } catch (error) {
      return res.status(401).json({ message: 'API token validation failed' });
    }
  }

  return res.status(401).json({ message: 'No token, authorization denied' });
};

authMiddleware.getJwtSecret = getJwtSecret;
authMiddleware.getJwtExpiresIn = getJwtExpiresIn;
authMiddleware.JWT_ALGORITHM = JWT_ALGORITHM;

module.exports = authMiddleware;
