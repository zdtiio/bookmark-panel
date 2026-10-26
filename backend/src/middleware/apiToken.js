const apiTokenService = require('../services/apiTokenService');
const User = require('../models/User');

/**
 * 使用请求头中的 X-API-Token 查找用户。
 * 成功时返回 { user, apiToken }，失败返回 null。
 */
const authenticateWithApiToken = async (req) => {
  const token = req.header('X-API-Token');
  if (!token) return null;

  const apiToken = await apiTokenService.verifyToken(token);
  if (!apiToken) return null;

  const user = await User.findByPk(apiToken.userId);
  if (!user) return null;

  return { user, apiToken };
};

const apiTokenMiddleware = async (req, res, next) => {
  try {
    const result = await authenticateWithApiToken(req);

    if (!result) {
      return res.status(401).json({ message: 'Invalid API token' });
    }

    req.user = result.user;
    req.apiToken = result.apiToken;
    next();
  } catch (error) {
    res.status(401).json({ message: 'API token validation failed' });
  }
};

apiTokenMiddleware.authenticateWithApiToken = authenticateWithApiToken;

module.exports = apiTokenMiddleware;
