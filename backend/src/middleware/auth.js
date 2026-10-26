const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateWithApiToken } = require('./apiToken');

/**
 * 统一认证中间件：
 * 1. 优先使用 Authorization: Bearer <JWT>
 * 2. 没有 JWT 或 JWT 无效时，回退到 X-API-Token
 */
const authMiddleware = async (req, res, next) => {
  const bearerToken = req.header('Authorization')?.replace('Bearer ', '').trim();
  const hasApiToken = !!req.header('X-API-Token');

  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
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

module.exports = authMiddleware;
