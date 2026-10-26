const ApiToken = require('../models/ApiToken');
const crypto = require('crypto');

const apiTokenService = {
  async generateToken() {
    return crypto.randomBytes(32).toString('hex');
  },

  async createToken(userId, name = 'Default') {
    const token = await this.generateToken();
    const record = await ApiToken.create({
      userId,
      name,
      token: ApiToken.hashToken(token)
    });
    return { token, record };
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
    token.token = ApiToken.hashToken(newToken);
    await token.save();
    return { token: newToken, record: token };
  },

  /**
   * 校验明文 API Token，返回对应的 Token 记录。
   * 可选传入 userId，用于确认 Token 归属。
   */
  async verifyToken(rawToken, userId = null) {
    if (!rawToken) return null;
    const apiToken = await ApiToken.findOne({
      where: { token: ApiToken.hashToken(rawToken) }
    });
    if (!apiToken) return null;
    if (userId !== null && apiToken.userId !== userId) return null;
    await apiToken.update({ lastUsedAt: new Date() });
    return apiToken;
  }
};

module.exports = apiTokenService;
