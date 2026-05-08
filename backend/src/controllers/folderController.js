const folderService = require('../services/folderService');
const { successResponse, errorResponse } = require('../utils/response');

const folderController = {
  async getAllFolders(req, res, next) {
    try {
      const folders = await folderService.getAllFolders(req.user.id);
      res.json(successResponse(folders, '获取文件夹列表成功'));
    } catch (error) {
      next(error);
    }
  },

  async getFolderById(req, res, next) {
    try {
      const folder = await folderService.getFolderById(req.user.id, req.params.id);
      if (!folder) {
        return next(errorResponse('文件夹不存在', 'NOT_FOUND', 404));
      }
      res.json(successResponse(folder, '获取文件夹成功'));
    } catch (error) {
      next(error);
    }
  },

  async createFolder(req, res, next) {
    try {
      const { name, parentId, sortOrder } = req.body;
      const folder = await folderService.createFolder(req.user.id, name, parentId, sortOrder);
      res.status(201).json(successResponse(folder, '创建文件夹成功'));
    } catch (error) {
      next(error);
    }
  },

  async updateFolder(req, res, next) {
    try {
      const { name } = req.body;
      const folder = await folderService.updateFolder(req.user.id, req.params.id, name);
      res.json(successResponse(folder, '更新文件夹成功'));
    } catch (error) {
      error.statusCode = 404;
      next(error);
    }
  },

  async updateFolderParent(req, res, next) {
    try {
      const { parentId } = req.body;
      const folder = await folderService.updateFolderParent(req.user.id, req.params.id, parentId);
      res.json(successResponse(folder, '移动文件夹成功'));
    } catch (error) {
      error.statusCode = 404;
      next(error);
    }
  },

  async updateFolderOrder(req, res, next) {
    try {
      const { folders } = req.body;
      await folderService.updateFolderOrder(req.user.id, folders);
      res.json(successResponse(null, '更新文件夹顺序成功'));
    } catch (error) {
      next(error);
    }
  },

  async deleteFolder(req, res, next) {
    try {
      await folderService.deleteFolder(req.user.id, req.params.id);
      res.json(successResponse(null, '删除文件夹成功'));
    } catch (error) {
      error.statusCode = 404;
      next(error);
    }
  }
};

module.exports = folderController;