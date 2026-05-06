const ApiToken = require('../models/ApiToken');
const crypto = require('crypto');

const apiTokenService = {
  async generateToken() {
    return crypto.randomBytes(32).toString('hex');
  },

  async createToken(userId, name = 'Default') {
    const token = await this.generateToken();
    return ApiToken.create({ userId, token, name });
  },

  async getTokens(userId) {
    return ApiToken.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  },

  async getTokenById(userId, id) {
    return ApiToken.findOne({ where: { userId, id } });
  },

  async deleteToken(userId, id) {
    const token = await ApiToken.findOne({ where: { userId, id } });
    if (!token) throw new Error('Token not found');
    return token.destroy();
  },

  async rotateToken(userId, id) {
    const token = await ApiToken.findOne({ where: { userId, id } });
    if (!token) throw new Error('Token not found');
    const newToken = await this.generateToken();
    token.token = await require('bcrypt').hash(newToken, 10);
    await token.save();
    return { token: newToken, record: token };
  },

  async verifyToken(userId, token) {
    const apiToken = await ApiToken.findOne({ where: { userId } });
    if (!apiToken) return null;
    const isValid = await apiToken.compareToken(token);
    if (isValid) {
      await apiToken.update({ lastUsedAt: new Date() });
      return apiToken;
    }
    return null;
  }
};

module.exports = apiTokenService;
