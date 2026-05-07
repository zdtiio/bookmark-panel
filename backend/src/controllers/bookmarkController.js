const bookmarkService = require('../services/bookmarkService');

const bookmarkController = {
  async getAllBookmarks(req, res) {
    try {
      const bookmarks = await bookmarkService.getAllBookmarks(req.user.id);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async searchBookmarks(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      const bookmarks = await bookmarkService.searchBookmarks(req.user.id, q);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getBookmarkById(req, res) {
    try {
      const bookmark = await bookmarkService.getBookmarkById(req.user.id, req.params.id);
      if (!bookmark) {
        return res.status(404).json({ message: 'Bookmark not found' });
      }
      res.json(bookmark);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async createBookmark(req, res) {
    try {
      const bookmark = await bookmarkService.createBookmark(req.user.id, req.body);
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateBookmark(req, res) {
    try {
      const bookmark = await bookmarkService.updateBookmark(req.user.id, req.params.id, req.body);
      res.json(bookmark);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async updateBookmarkFolder(req, res) {
    try {
      const { folderId } = req.body;
      const bookmark = await bookmarkService.updateBookmarkFolder(req.user.id, req.params.id, folderId);
      res.json(bookmark);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async batchUpdateBookmarkFolder(req, res) {
    try {
      const { ids, folderId } = req.body;
      await bookmarkService.batchUpdateBookmarkFolder(req.user.id, ids, folderId);
      res.json({ message: 'Bookmarks moved successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateBookmarkOrder(req, res) {
    try {
      const { bookmarks } = req.body;
      console.log('updateBookmarkOrder called with:', bookmarks?.length, 'bookmarks');
      console.log('User ID:', req.user.id);
      if (bookmarks && bookmarks.length > 0) {
        console.log('First bookmark:', bookmarks[0]);
      }
      await bookmarkService.updateBookmarkOrder(req.user.id, bookmarks);
      res.json({ message: 'Bookmark order updated' });
    } catch (error) {
      console.error('updateBookmarkOrder error:', error.message);
      res.status(500).json({ message: error.message });
    }
  },

  async deleteBookmark(req, res) {
    try {
      await bookmarkService.deleteBookmark(req.user.id, req.params.id);
      res.json({ message: 'Bookmark deleted' });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async importBookmarks(req, res) {
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
      res.json({ 
        message: `Imported ${result.bookmarks.length} bookmarks`, 
        count: result.bookmarks.length,
        foldersCreated: result.foldersCreated 
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async exportBookmarks(req, res) {
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
      res.status(500).json({ message: error.message });
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
