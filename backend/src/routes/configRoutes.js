const express = require('express');
const configController = require('../controllers/configController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, configController.getConfig);
router.put('/', authMiddleware, configController.updateConfig);
router.get('/export', authMiddleware, configController.exportUserData);
router.post('/import', authMiddleware, configController.uploadMiddleware, configController.importUserData);

module.exports = router;
