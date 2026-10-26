const Folder = require('../models/Folder');
const Bookmark = require('../models/Bookmark');
const { errorResponse } = require('../utils/response');

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
        throw errorResponse('父文件夹不存在', 'VALIDATION_ERROR', 400);
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
    if (!folder) throw errorResponse('文件夹不存在', 'NOT_FOUND', 404);
    return folder.update({ name });
  },

  async updateFolderParent(userId, id, parentId) {
    const folder = await Folder.findOne({ where: { userId, id } });
    if (!folder) throw errorResponse('文件夹不存在', 'NOT_FOUND', 404);

    const targetParentId = parentId === undefined || parentId === '' ? null : parentId;

    if (targetParentId !== null) {
      if (String(targetParentId) === String(id)) {
        throw errorResponse('不能将文件夹移动到自身', 'VALIDATION_ERROR', 400);
      }

      let current = await Folder.findOne({ where: { userId, id: targetParentId } });
      if (!current) {
        throw errorResponse('父文件夹不存在', 'VALIDATION_ERROR', 400);
      }

      // 沿父级向上查找，防止把文件夹移动到自己的子孙文件夹中
      const visited = new Set([String(id)]);
      while (current) {
        if (visited.has(String(current.id))) {
          throw errorResponse('不能将文件夹移动到其子文件夹中', 'VALIDATION_ERROR', 400);
        }
        visited.add(String(current.id));
        current = current.parentId
          ? await Folder.findOne({ where: { userId, id: current.parentId } })
          : null;
      }
    }

    return folder.update({ parentId: targetParentId });
  },

  async updateFolderOrder(userId, folders) {
    if (!Array.isArray(folders)) {
      throw errorResponse('文件夹顺序数据格式不正确', 'VALIDATION_ERROR', 400);
    }

    const validFolders = folders.filter((folder) => folder && folder.id !== undefined);

    await Promise.all(validFolders.map((folder) => {
      return Folder.update(
        { sortOrder: folder.sortOrder },
        { where: { userId, id: folder.id } }
      );
    }));
  },

  async deleteFolder(userId, id) {
    const folder = await Folder.findOne({ where: { userId, id } });
    if (!folder) throw errorResponse('文件夹不存在', 'NOT_FOUND', 404);
    const childFolders = await Folder.count({ where: { parentId: id } });
    if (childFolders > 0) {
      throw errorResponse('无法删除：该文件夹包含子文件夹', 'VALIDATION_ERROR', 400);
    }
    const bookmarkCount = await Bookmark.count({ where: { folderId: id } });
    if (bookmarkCount > 0) {
      throw errorResponse('无法删除：该文件夹包含书签', 'VALIDATION_ERROR', 400);
    }
    return folder.destroy();
  }
};

module.exports = folderService;
