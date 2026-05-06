const multer = require('multer');
const configService = require('../services/configService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

const configController = {
  async getConfig(req, res) {
    try {
      const config = await configService.getConfig(req.user.id);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateConfig(req, res) {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await configService.setConfig(req.user.id, key, value);
      }
      const config = await configService.getConfig(req.user.id);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async exportUserData(req, res) {
    try {
      const data = await configService.exportUserData(req.user.id);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="user-data.json"');
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async importUserData(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const jsonString = req.file.buffer.toString('utf-8');
      const data = JSON.parse(jsonString);
      await configService.importUserData(req.user.id, data);
      res.json({ message: 'User data imported successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  uploadMiddleware: upload.single('file')
};

module.exports = configController;
