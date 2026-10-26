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

  async getBookmarksByFolder(req, res, next) {
    try {
      const { folderId } = req.params;
      const bookmarks = await bookmarkService.getBookmarksByFolder(req.user.id, folderId);
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
      next(error);
    }
  },

  async updateBookmarkFolder(req, res, next) {
    try {
      const { folderId } = req.body;
      const bookmark = await bookmarkService.updateBookmarkFolder(req.user.id, req.params.id, folderId);
      res.json(successResponse(bookmark, '移动书签成功'));
    } catch (error) {
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
      next(error);
    }
  },

  async importBookmarks(req, res, next) {
    try {
      const { format, bookmarks, htmlContent, folderId } = req.body || {};
      let parsedBookmarks;

      if (format === 'html') {
        if (typeof htmlContent !== 'string' || !htmlContent.trim()) {
          throw errorResponse('htmlContent 不能为空', 'VALIDATION_ERROR', 400);
        }
        parsedBookmarks = bookmarkService.parseHtmlBookmarks(htmlContent);
      } else if (format === 'chrome') {
        if (bookmarks === undefined || bookmarks === null) {
          throw errorResponse('bookmarks 不能为空', 'VALIDATION_ERROR', 400);
        }
        parsedBookmarks = bookmarkController.parseChromeBookmarks(bookmarks);
      } else if (format === 'firefox') {
        if (bookmarks === undefined || bookmarks === null) {
          throw errorResponse('bookmarks 不能为空', 'VALIDATION_ERROR', 400);
        }
        parsedBookmarks = bookmarkController.parseFirefoxBookmarks(bookmarks);
      } else if (!format || format === 'json' || format === 'native') {
        if (!Array.isArray(bookmarks)) {
          throw errorResponse('bookmarks 必须为数组', 'VALIDATION_ERROR', 400);
        }
        parsedBookmarks = { bookmarks, folders: [], folderOrderMap: {} };
      } else {
        throw errorResponse('不支持的导入格式', 'VALIDATION_ERROR', 400);
      }

      const result = await bookmarkService.importBookmarks(req.user.id, parsedBookmarks, folderId);
      res.json(successResponse({
        count: result.bookmarks.length,
        foldersCreated: result.foldersCreated
      }, `成功导入 ${result.bookmarks.length} 个书签`));
    } catch (error) {
      if (error instanceof SyntaxError) {
        return next(errorResponse('导入文件不是有效的 JSON', 'VALIDATION_ERROR', 400));
      }
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
    const root = typeof data === 'string' ? JSON.parse(data) : data;
    if (!root || typeof root !== 'object' || Array.isArray(root)) {
      throw errorResponse('Chrome 书签数据格式不正确', 'VALIDATION_ERROR', 400);
    }

    const bookmarks = [];
    const folders = [];
    const folderOrderMap = {};
    let bookmarkOrder = 0;

    const addFolder = (folderPath) => {
      if (folderPath && !folders.includes(folderPath)) {
        folderOrderMap[folderPath] = folders.length;
        folders.push(folderPath);
      }
    };

    const traverse = (children, parentPath = '') => {
      if (!Array.isArray(children)) return;

      children.forEach((item) => {
        if (!item || typeof item !== 'object') return;

        if (item.type === 'url' || (typeof item.url === 'string' && !item.children)) {
          if (typeof item.url !== 'string') return;
          bookmarks.push({
            title: String(item.name || item.title || item.url).trim() || item.url,
            url: item.url,
            folderName: parentPath,
            sortOrder: bookmarkOrder++
          });
          return;
        }

        if (item.children) {
          const name = String(item.name || item.title || '').replace(/\//g, '-').trim() || '未命名文件夹';
          const folderPath = parentPath ? `${parentPath}/${name}` : name;
          addFolder(folderPath);
          traverse(item.children, folderPath);
        }
      });
    };

    Object.values(root.roots || {}).forEach((rootNode) => {
      if (rootNode && Array.isArray(rootNode.children)) {
        traverse(rootNode.children);
      }
    });

    return { bookmarks, folders, folderOrderMap };
  },

  parseFirefoxBookmarks(data) {
    const root = typeof data === 'string' ? JSON.parse(data) : data;
    if (!root || typeof root !== 'object' || Array.isArray(root)) {
      throw errorResponse('Firefox 书签数据格式不正确', 'VALIDATION_ERROR', 400);
    }

    const bookmarks = [];
    const folders = [];
    const folderOrderMap = {};
    let bookmarkOrder = 0;

    const addFolder = (folderPath) => {
      if (folderPath && !folders.includes(folderPath)) {
        folderOrderMap[folderPath] = folders.length;
        folders.push(folderPath);
      }
    };

    const traverse = (children, parentPath = '') => {
      if (!Array.isArray(children)) return;

      children.forEach((item) => {
        if (!item || typeof item !== 'object') return;

        if (item.type === 'text/x-moz-place' || (typeof item.uri === 'string' && !item.children)) {
          if (typeof item.uri !== 'string') return;
          bookmarks.push({
            title: String(item.title || item.uri).trim() || item.uri,
            url: item.uri,
            folderName: parentPath,
            sortOrder: bookmarkOrder++
          });
          return;
        }

        if (item.children) {
          const name = String(item.title || item.name || '').replace(/\//g, '-').trim() || '未命名文件夹';
          const folderPath = parentPath ? `${parentPath}/${name}` : name;
          addFolder(folderPath);
          traverse(item.children, folderPath);
        }
      });
    };

    traverse(root.children);

    return { bookmarks, folders, folderOrderMap };
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
