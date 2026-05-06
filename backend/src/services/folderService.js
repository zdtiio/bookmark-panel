const Folder = require('../models/Folder');
const Bookmark = require('../models/Bookmark');

const folderService = {
  async getAllFolders(userId) {
    return Folder.findAll({ where: { userId }, order: [['sortOrder', 'ASC'], ['name', 'ASC']] });
  },

  async getFolderById(userId, id) {
    return Folder.findOne({ where: { userId, id } });
  },

  async createFolder(userId, name, parentId = null, sortOrder = null) {
    if (parentId) {
      const parentFolder = await Folder.findOne({ where: { userId, id: parentId } });
      if (!parentFolder) {
        throw new Error('Parent folder not found');
      }
    }
    const data = { userId, name, parentId };
    if (sortOrder !== null) {
      data.sortOrder = sortOrder;
    }
    return Folder.create(data);
  },

  async updateFolder(userId, id, name) {
    const folder = await Folder.findOne({ where: { userId, id } });
    if (!folder) throw new Error('Folder not found');
    return folder.update({ name });
  },

  async updateFolderParent(userId, id, parentId) {
    const folder = await Folder.findOne({ where: { userId, id } });
    if (!folder) throw new Error('Folder not found');
    if (parentId) {
      const parentFolder = await Folder.findOne({ where: { userId, id: parentId } });
      if (!parentFolder) {
        throw new Error('Parent folder not found');
      }
    }
    return folder.update({ parentId });
  },

  async updateFolderOrder(userId, folders) {
    const updatePromises = folders.map((folder, index) => {
      return Folder.update(
        { sortOrder: index },
        { where: { userId, id: folder.id } }
      );
    });
    await Promise.all(updatePromises);
  },

  async deleteFolder(userId, id) {
    const folder = await Folder.findOne({ where: { userId, id } });
    if (!folder) throw new Error('Folder not found');
    const childFolders = await Folder.count({ where: { parentId: id } });
    if (childFolders > 0) {
      throw new Error('Cannot delete folder: it has sub-folders');
    }
    const bookmarkCount = await Bookmark.count({ where: { folderId: id } });
    if (bookmarkCount > 0) {
      throw new Error('Cannot delete folder: it contains bookmarks');
    }
    return folder.destroy();
  }
};

module.exports = folderService;
