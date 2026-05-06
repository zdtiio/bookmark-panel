const ApiToken = require('../models/ApiToken');

const apiTokenMiddleware = async (req, res, next) => {
  try {
    const token = req.header('X-API-Token');
    
    if (!token) {
      return res.status(401).json({ message: 'No API token provided' });
    }

    const apiToken = await ApiToken.findOne({ where: { userId: req.user?.id } });
    
    if (!apiToken) {
      return res.status(401).json({ message: 'API token not found' });
    }

    const isValid = await apiToken.compareToken(token);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid API token' });
    }

    await apiToken.update({ lastUsedAt: new Date() });
    next();
  } catch (error) {
    res.status(401).json({ message: 'API token validation failed' });
  }
};

module.exports = apiTokenMiddleware;
