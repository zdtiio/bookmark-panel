const User = require('../models/User');
const Bookmark = require('../models/Bookmark');
const Folder = require('../models/Folder');
const Config = require('../models/Config');
const ApiToken = require('../models/ApiToken');

const userService = {
  async createUser(username, email, password) {
    return User.create({ username, email, password });
  },

  async findByEmail(email) {
    return User.findOne({ where: { email } });
  },

  async findByUsername(username) {
    return User.findOne({ where: { username } });
  },

  async findById(id) {
    return User.findByPk(id);
  },

  async updateUser(id, data) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('User not found');
    return user.update(data);
  },

  async deleteUser(id) {
    const user = await User.findByPk(id);
    if (!user) throw new Error('User not found');
    await Bookmark.destroy({ where: { userId: id } });
    await Folder.destroy({ where: { userId: id } });
    await Config.destroy({ where: { userId: id } });
    await ApiToken.destroy({ where: { userId: id } });
    return user.destroy();
  }
};

module.exports = userService;
