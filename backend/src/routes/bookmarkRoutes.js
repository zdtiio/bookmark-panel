const express = require('express');
const bookmarkController = require('../controllers/bookmarkController');
const iconController = require('../controllers/iconController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, bookmarkController.getAllBookmarks);
router.get('/folder/:folderId', authMiddleware, bookmarkController.getBookmarksByFolder);
router.get('/search', authMiddleware, bookmarkController.searchBookmarks);
router.post('/', authMiddleware, bookmarkController.createBookmark);
router.put('/order', authMiddleware, bookmarkController.updateBookmarkOrder);
router.get('/export', authMiddleware, bookmarkController.exportBookmarks);
router.post('/import', authMiddleware, bookmarkController.importBookmarks);
router.post('/icon', authMiddleware, iconController.upload, iconController.uploadIcon);
router.get('/:id', authMiddleware, bookmarkController.getBookmarkById);
router.put('/:id', authMiddleware, bookmarkController.updateBookmark);
router.put('/batch/folder', authMiddleware, bookmarkController.batchUpdateBookmarkFolder);
router.put('/:id/folder', authMiddleware, bookmarkController.updateBookmarkFolder);
router.delete('/:id', authMiddleware, bookmarkController.deleteBookmark);

module.exports = router;
