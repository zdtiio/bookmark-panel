const express = require('express');
const tokenController = require('../controllers/tokenController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, tokenController.getTokens);
router.post('/', authMiddleware, tokenController.createToken);
router.delete('/:id', authMiddleware, tokenController.deleteToken);
router.put('/:id/rotate', authMiddleware, tokenController.rotateToken);
router.post('/verify', authMiddleware, tokenController.verifyToken);

module.exports = router;
