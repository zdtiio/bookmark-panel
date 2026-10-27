const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimit');

const router = express.Router();

// 登录/注册/Token 兑换都是凭据入口，必须限流，防止暴力破解与撞库
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试过于频繁，请 15 分钟后再试'
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: '注册请求过于频繁，请稍后再试'
});

const tokenLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Token 验证过于频繁，请稍后再试'
});

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/token-login', tokenLoginLimiter, authController.tokenLogin);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
