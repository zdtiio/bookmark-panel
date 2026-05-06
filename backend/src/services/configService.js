const Config = require('../models/Config');
const Bookmark = require('../models/Bookmark');
const Folder = require('../models/Folder');
const User = require('../models/User');

const configService = {
  async getConfig(userId) {
    const configs = await Config.findAll({ where: { userId } });
    const result = {};
    configs.forEach(c => {
      try {
        result[c.key] = JSON.parse(c.value);
      } catch {
        result[c.key] = c.value;
      }
    });
    return result;
  },

  async getConfigByKey(userId, key) {
    const config = await Config.findOne({ where: { userId, key } });
    if (!config) return null;
    try {
      return JSON.parse(config.value);
    } catch {
      return config.value;
    }
  },

  async setConfig(userId, key, value) {
    const configValue = typeof value === 'string' ? value : JSON.stringify(value);
    const [config, created] = await Config.findOrCreate({
      where: { userId, key },
      defaults: { value: configValue }
    });
    if (!created) {
      await config.update({ value: configValue });
    }
    return config;
  },

  async deleteConfig(userId, key) {
    const config = await Config.findOne({ where: { userId, key } });
    if (!config) throw new Error('Config not found');
    return config.destroy();
  },

  async exportUserData(userId) {
    const user = await User.findByPk(userId, { attributes: ['username', 'email'] });
    const bookmarks = await Bookmark.findAll({ where: { userId } });
    const folders = await Folder.findAll({ where: { userId } });
    const configs = await this.getConfig(userId);

    return {
      user: user.toJSON(),
      bookmarks: bookmarks.map(b => b.toJSON()),
      folders: folders.map(f => f.toJSON()),
      configs
    };
  },

  async importUserData(userId, data) {
    if (data.folders) {
      for (const folder of data.folders) {
        const [existing] = await Folder.findOrCreate({
          where: { userId, name: folder.name, parentId: folder.parentId || null },
          defaults: { sortOrder: folder.sortOrder || 0 }
        });
        if (folder.sortOrder !== undefined) {
          await existing.update({ sortOrder: folder.sortOrder });
        }
      }
    }

    if (data.bookmarks) {
      const folders = await Folder.findAll({ where: { userId } });
      const folderMap = {};
      folders.forEach(f => { folderMap[`${f.name}_${f.parentId || ''}`] = f.id; });

      for (const bookmark of data.bookmarks) {
        const existing = await Bookmark.findOne({ where: { userId, url: bookmark.url } });
        if (!existing) {
          const folderKey = `${bookmark.folderName || ''}_${bookmark.parentFolderId || ''}`;
          await Bookmark.create({
            userId,
            folderId: folderMap[folderKey] || null,
            title: bookmark.title,
            url: bookmark.url,
            description: bookmark.description || '',
            icon: bookmark.icon || null,
            sortOrder: bookmark.sortOrder || 0
          });
        }
      }
    }

    if (data.configs) {
      for (const [key, value] of Object.entries(data.configs)) {
        await this.setConfig(userId, key, value);
      }
    }
  }
};

module.exports = configService;
