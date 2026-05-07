const express = require('express');
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, folderController.getAllFolders);
router.get('/:id', authMiddleware, folderController.getFolderById);

router.post('/', authMiddleware, folderController.createFolder);

router.put('/order', authMiddleware, folderController.updateFolderOrder);
router.put('/:id', authMiddleware, folderController.updateFolder);
router.put('/:id/parent', authMiddleware, folderController.updateFolderParent);

router.delete('/:id', authMiddleware, folderController.deleteFolder);

module.exports = router;