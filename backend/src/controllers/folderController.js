const folderService = require('../services/folderService');

const folderController = {
  async getAllFolders(req, res) {
    try {
      const folders = await folderService.getAllFolders(req.user.id);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getFolderById(req, res) {
    try {
      const folder = await folderService.getFolderById(req.user.id, req.params.id);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }
      res.json(folder);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async createFolder(req, res) {
    try {
      const { name, parentId, sortOrder } = req.body;
      const folder = await folderService.createFolder(req.user.id, name, parentId, sortOrder);
      res.status(201).json(folder);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateFolder(req, res) {
    try {
      const { name } = req.body;
      const folder = await folderService.updateFolder(req.user.id, req.params.id, name);
      res.json(folder);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async updateFolderParent(req, res) {
    try {
      const { parentId } = req.body;
      const folder = await folderService.updateFolderParent(req.user.id, req.params.id, parentId);
      res.json(folder);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async updateFolderOrder(req, res) {
    try {
      const { folders } = req.body;
      await folderService.updateFolderOrder(req.user.id, folders);
      res.json({ message: 'Folder order updated' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteFolder(req, res) {
    try {
      await folderService.deleteFolder(req.user.id, req.params.id);
      res.json({ message: 'Folder deleted' });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }
};

module.exports = folderController;
