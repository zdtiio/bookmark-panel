const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { successResponse, errorResponse } = require('../utils/response');

const authController = {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return next(errorResponse('该邮箱已被注册', 'DUPLICATE_ERROR', 400));
      }

      const user = await userService.createUser(username, email, password);
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
      });

      res.status(201).json(successResponse({
        token,
        user: { id: user.id, username: user.username, email: user.email }
      }, '注册成功'));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await userService.findByEmail(email);
      if (!user) {
        return next(errorResponse('邮箱或密码错误', 'INVALID_CREDENTIALS', 401));
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return next(errorResponse('邮箱或密码错误', 'INVALID_CREDENTIALS', 401));
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
      });

      res.json(successResponse({
        token,
        user: { id: user.id, username: user.username, email: user.email }
      }, '登录成功'));
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res) {
    res.json(successResponse(null, '登出成功'));
  },

  async getMe(req, res, next) {
    try {
      const user = await userService.findById(req.user.id);
      res.json(successResponse({ user: { id: user.id, username: user.username, email: user.email } }, '获取用户信息成功'));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;