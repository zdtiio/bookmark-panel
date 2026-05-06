const apiTokenService = require('../services/apiTokenService');

const tokenController = {
  async getTokens(req, res) {
    try {
      const tokens = await apiTokenService.getTokens(req.user.id);
      const result = tokens.map(t => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async createToken(req, res) {
    try {
      const { name } = req.body;
      const result = await apiTokenService.createToken(req.user.id, name);
      res.status(201).json({
        id: result.id,
        name: result.name,
        token: result.token,
        createdAt: result.createdAt
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteToken(req, res) {
    try {
      await apiTokenService.deleteToken(req.user.id, req.params.id);
      res.json({ message: 'Token deleted' });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async rotateToken(req, res) {
    try {
      const result = await apiTokenService.rotateToken(req.user.id, req.params.id);
      res.json({
        id: result.record.id,
        name: result.record.name,
        token: result.token,
        createdAt: result.record.createdAt
      });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async verifyToken(req, res) {
    try {
      const { token } = req.body;
      const result = await apiTokenService.verifyToken(req.user.id, token);
      if (result) {
        res.json({ valid: true });
      } else {
        res.status(401).json({ valid: false });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = tokenController;
