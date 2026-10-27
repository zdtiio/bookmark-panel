const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const apiTokenService = require('../services/apiTokenService');
const { successResponse, errorResponse } = require('../utils/response');
const { JWT_ALGORITHM, getJwtSecret } = require('../middleware/auth');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_\u4e00-\u9fa5.-]{3,50}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const signToken = (user) => {
  return jwt.sign({ userId: user.id }, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email
});

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return '密码长度至少为 8 位';
  }
  if (password.length > 128) {
    return '密码长度不能超过 128 位';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return '密码必须同时包含字母和数字';
  }
  return null;
};

const authController = {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body || {};

      // 服务端校验：不能依赖前端，注册是攻击者直接可达的入口
      if (typeof username !== 'string' || !USERNAME_PATTERN.test(username.trim())) {
        return next(errorResponse('用户名需为 3-50 位字母、数字、下划线或中文', 'VALIDATION_ERROR', 400));
      }
      if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim()) || email.length > 100) {
        return next(errorResponse('邮箱格式不正确', 'VALIDATION_ERROR', 400));
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        return next(errorResponse(passwordError, 'VALIDATION_ERROR', 400));
      }

      const normalizedEmail = normalizeEmail(email);
      const trimmedUsername = username.trim();

      const existingUser = await userService.findByEmail(normalizedEmail);
      if (existingUser) {
        return next(errorResponse('该邮箱已被注册', 'DUPLICATE_ERROR', 400));
      }
      const existingUsername = await userService.findByUsername(trimmedUsername);
      if (existingUsername) {
        return next(errorResponse('该用户名已被占用', 'DUPLICATE_ERROR', 400));
      }

      const user = await userService.createUser(trimmedUsername, normalizedEmail, password);
      const token = signToken(user);

      res.status(201).json(successResponse({
        token,
        user: publicUser(user)
      }, '注册成功'));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return next(errorResponse('邮箱或密码错误', 'INVALID_CREDENTIALS', 401));
      }

      const user = await userService.findByEmail(normalizeEmail(email));
      if (!user) {
        return next(errorResponse('邮箱或密码错误', 'INVALID_CREDENTIALS', 401));
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return next(errorResponse('邮箱或密码错误', 'INVALID_CREDENTIALS', 401));
      }

      const token = signToken(user);

      res.json(successResponse({
        token,
        user: publicUser(user)
      }, '登录成功'));
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res) {
    res.json(successResponse(null, '登出成功'));
  },

  /**
   * 使用 API Token 换取 JWT，供浏览器插件免密进入面板。
   */
  async tokenLogin(req, res, next) {
    try {
      const { token } = req.body || {};

      if (typeof token !== 'string' || !token) {
        return next(errorResponse('缺少 API Token', 'MISSING_TOKEN', 400));
      }

      const apiToken = await apiTokenService.verifyToken(token);
      if (!apiToken) {
        return next(errorResponse('API Token 无效', 'INVALID_API_TOKEN', 401));
      }

      const user = await userService.findById(apiToken.userId);
      if (!user) {
        return next(errorResponse('API Token 无效', 'INVALID_API_TOKEN', 401));
      }

      const jwtToken = signToken(user);

      res.json(successResponse({
        token: jwtToken,
        user: publicUser(user)
      }, '登录成功'));
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await userService.findById(req.user.id);
      if (!user) {
        return next(errorResponse('用户不存在', 'NOT_FOUND', 404));
      }
      res.json(successResponse({ user: publicUser(user) }, '获取用户信息成功'));
    } catch (error) {
      next(error);
    }
  }
};

authController.validatePassword = validatePassword;

module.exports = authController;
