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
authMiddleware.JWT_ALGORITHM = JWT_ALGORITHM;

module.exports = authMiddleware;
