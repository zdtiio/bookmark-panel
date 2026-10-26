const Config = require('../models/Config');
const Bookmark = require('../models/Bookmark');
const Folder = require('../models/Folder');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

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
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw errorResponse('导入数据格式不正确', 'VALIDATION_ERROR', 400);
    }

    const folders = Array.isArray(data.folders) ? data.folders : [];
    const folderByKey = new Map();
    const keyByOldId = new Map();
    const newIdByKey = new Map();

    folders.forEach((folder, index) => {
      if (!folder || typeof folder !== 'object') return;
      const hasId = folder.id !== undefined && folder.id !== null && folder.id !== '';
      const key = hasId ? `id:${folder.id}` : `index:${index}`;
      folderByKey.set(key, folder);
      if (hasId) {
        keyByOldId.set(String(folder.id), key);
      }
    });

    // 备份文件里的文件夹 id 在不同数据库中可能重复，需要重新映射并保留层级关系
    const resolveFolder = async (key, stack = new Set()) => {
      if (newIdByKey.has(key)) return newIdByKey.get(key);

      const folder = folderByKey.get(key);
      if (!folder || stack.has(key)) return null;
      stack.add(key);

      const parentRef = folder.parentId !== undefined ? folder.parentId : folder.parentFolderId;
      let parentId = null;
      if (parentRef !== undefined && parentRef !== null && parentRef !== '') {
        const parentKey = keyByOldId.get(String(parentRef));
        if (parentKey) {
          parentId = await resolveFolder(parentKey, stack);
        }
      }

      const name = String(folder.name || '').trim() || '未命名文件夹';
      const sortOrder = Number.isFinite(Number(folder.sortOrder)) ? Number(folder.sortOrder) : 0;

      const [existing] = await Folder.findOrCreate({
        where: { userId, name, parentId },
        defaults: { sortOrder }
      });
      if (folder.sortOrder !== undefined && folder.sortOrder !== null) {
        await existing.update({ sortOrder });
      }

      newIdByKey.set(key, existing.id);
      stack.delete(key);
      return existing.id;
    };

    for (const key of folderByKey.keys()) {
      await resolveFolder(key);
    }

    const findOrCreateFolderPath = async (folderPath, parentId = null) => {
      const parts = String(folderPath).split('/').map((part) => part.trim()).filter(Boolean);
      let currentParentId = parentId;

      for (const part of parts) {
        const [folder] = await Folder.findOrCreate({
          where: { userId, name: part, parentId: currentParentId },
          defaults: { sortOrder: 0 }
        });
        currentParentId = folder.id;
      }

      return currentParentId;
    };

    const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];

    for (const bookmark of bookmarks) {
      if (!bookmark || typeof bookmark !== 'object') continue;

      const url = typeof bookmark.url === 'string' ? bookmark.url.trim() : '';
      if (!/^https?:\/\//i.test(url)) continue;

      const existing = await Bookmark.findOne({ where: { userId, url } });
      if (existing) continue;

      let folderId = null;

      if (bookmark.folderId !== undefined && bookmark.folderId !== null && bookmark.folderId !== '') {
        const folderKey = keyByOldId.get(String(bookmark.folderId));
        if (folderKey) {
          folderId = await resolveFolder(folderKey);
        }
      } else if (typeof bookmark.folderName === 'string' && bookmark.folderName.trim()) {
        let parentId = null;
        const parentRef = bookmark.parentFolderId !== undefined ? bookmark.parentFolderId : bookmark.parentId;
        if (parentRef !== undefined && parentRef !== null && parentRef !== '') {
          const parentKey = keyByOldId.get(String(parentRef));
          if (parentKey) {
            parentId = await resolveFolder(parentKey);
          }
        }
        folderId = await findOrCreateFolderPath(bookmark.folderName, parentId);
      }

      await Bookmark.create({
        userId,
        folderId,
        title: (typeof bookmark.title === 'string' ? bookmark.title.trim() : '') || url,
        url,
        description: typeof bookmark.description === 'string' ? bookmark.description : '',
        icon: typeof bookmark.icon === 'string' && bookmark.icon ? bookmark.icon : null,
        sortOrder: Number.isFinite(Number(bookmark.sortOrder)) ? Number(bookmark.sortOrder) : 0
      });
    }

    if (data.configs && typeof data.configs === 'object' && !Array.isArray(data.configs)) {
      for (const [key, value] of Object.entries(data.configs)) {
        await this.setConfig(userId, key, value);
      }
    }
  }
};

module.exports = configService;
