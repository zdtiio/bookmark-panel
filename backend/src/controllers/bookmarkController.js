const bookmarkService = require('../services/bookmarkService');
const { successResponse, errorResponse } = require('../utils/response');

const bookmarkController = {
  async getAllBookmarks(req, res, next) {
    try {
      const bookmarks = await bookmarkService.getAllBookmarks(req.user.id);
      res.json(successResponse(bookmarks, '获取书签列表成功'));
    } catch (error) {
      next(error);
    }
  },

  async searchBookmarks(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) {
        return next(errorResponse('搜索关键词不能为空', 'VALIDATION_ERROR', 400));
      }
      const bookmarks = await bookmarkService.searchBookmarks(req.user.id, q);
      res.json(successResponse(bookmarks, '搜索成功'));
    } catch (error) {
      next(error);
    }
  },

  async getBookmarkById(req, res, next) {
    try {
      const bookmark = await bookmarkService.getBookmarkById(req.user.id, req.params.id);
      if (!bookmark) {
        return next(errorResponse('书签不存在', 'NOT_FOUND', 404));
      }
      res.json(successResponse(bookmark, '获取书签成功'));
    } catch (error) {
      next(error);
    }
  },

  async createBookmark(req, res, next) {
    try {
      const bookmark = await bookmarkService.createBookmark(req.user.id, req.body);
      res.status(201).json(successResponse(bookmark, '添加书签成功'));
    } catch (error) {
      next(error);
    }
  },

  async updateBookmark(req, res, next) {
    try {
      const bookmark = await bookmarkService.updateBookmark(req.user.id, req.params.id, req.body);
      res.json(successResponse(bookmark, '更新书签成功'));
    } catch (error) {
      error.statusCode = 404;
      next(error);
    }
  },

  async updateBookmarkFolder(req, res, next) {
    try {
      const { folderId } = req.body;
      const bookmark = await bookmarkService.updateBookmarkFolder(req.user.id, req.params.id, folderId);
      res.json(successResponse(bookmark, '移动书签成功'));
    } catch (error) {
      error.statusCode = 404;
      next(error);
    }
  },

  async batchUpdateBookmarkFolder(req, res, next) {
    try {
      const { ids, folderId } = req.body;
      await bookmarkService.batchUpdateBookmarkFolder(req.user.id, ids, folderId);
      res.json(successResponse(null, '批量移动书签成功'));
    } catch (error) {
      next(error);
    }
  },

  async updateBookmarkOrder(req, res, next) {
    try {
      const { bookmarks } = req.body;
      await bookmarkService.updateBookmarkOrder(req.user.id, bookmarks);
      res.json(successResponse(null, '更新书签顺序成功'));
    } catch (error) {
      next(error);
    }
  },

  async deleteBookmark(req, res, next) {
    try {
      await bookmarkService.deleteBookmark(req.user.id, req.params.id);
      res.json(successResponse(null, '删除书签成功'));
    } catch (error) {
      error.statusCode = 404;
      next(error);
    }
  },

  async importBookmarks(req, res, next) {
    try {
      const { format, bookmarks, htmlContent, folderId } = req.body;
      let parsedBookmarks = bookmarks;
      
      if (format === 'html') {
        parsedBookmarks = bookmarkService.parseHtmlBookmarks(htmlContent);
      } else if (format === 'chrome') {
        parsedBookmarks = this.parseChromeBookmarks(bookmarks);
      } else if (format === 'firefox') {
        parsedBookmarks = this.parseFirefoxBookmarks(bookmarks);
      }

      const result = await bookmarkService.importBookmarks(req.user.id, parsedBookmarks, folderId);
      res.json(successResponse({ 
        count: result.bookmarks.length,
        foldersCreated: result.foldersCreated 
      }, `成功导入 ${result.bookmarks.length} 个书签`));
    } catch (error) {
      next(error);
    }
  },

  async exportBookmarks(req, res, next) {
    try {
      const format = req.query.format || 'html';
      const data = await bookmarkService.exportBookmarks(req.user.id, format);
      
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Content-Disposition', `attachment; filename="bookmarks_${Date.now()}.html"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="bookmarks.json"');
      }
      res.send(data);
    } catch (error) {
      next(error);
    }
  },

  parseChromeBookmarks(data) {
    const bookmarks = [];
    const traverse = (children, folderName = '') => {
      if (!children) return;
      children.forEach(item => {
        if (item.type === 'url') {
          bookmarks.push({
            title: item.name,
            url: item.url,
            folderName
          });
        } else if (item.type === 'folder' && item.children) {
          traverse(item.children, item.name);
        }
      });
    };
    traverse(data.roots?.bookmark_bar?.children);
    traverse(data.roots?.other?.children);
    traverse(data.roots?.synced?.children);
    return bookmarks;
  },

  parseFirefoxBookmarks(data) {
    const bookmarks = [];
    const traverse = (children, folderName = '') => {
      if (!children) return;
      children.forEach(item => {
        if (item.type === 'text/x-moz-place') {
          bookmarks.push({
            title: item.title,
            url: item.uri,
            folderName
          });
        } else if (item.type === 'text/x-moz-place-container' && item.children) {
          traverse(item.children, item.title || folderName);
        }
      });
    };
    traverse(data.children);
    return bookmarks;
  },

  parseEdgeBookmarks(html) {
    const bookmarks = [];
    const regex = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      bookmarks.push({
        title: match[2],
        url: match[1],
        folderName: ''
      });
    }
    return bookmarks;
  }
};

module.exports = bookmarkController;
