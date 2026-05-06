const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

const authController = {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const user = await userService.createUser(username, email, password);
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
      });

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await userService.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
      });

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async logout(req, res) {
    res.json({ message: 'Logout successful' });
  },

  async getMe(req, res) {
    try {
      const user = await userService.findById(req.user.id);
      res.json({ user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = authController;
