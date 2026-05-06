const Bookmark = require('../models/Bookmark');
const Folder = require('../models/Folder');

const bookmarkService = {
  async getAllBookmarks(userId) {
    return Bookmark.findAll({ where: { userId }, order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
  },

  async getBookmarksByFolder(userId, folderId) {
    return Bookmark.findAll({ where: { userId, folderId }, order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
  },

  async getBookmarkById(userId, id) {
    return Bookmark.findOne({ where: { userId, id } });
  },

  async createBookmark(userId, data) {
    if (data.folderId) {
      const folder = await Folder.findOne({ where: { userId, id: data.folderId } });
      if (!folder) {
        throw new Error('Folder not found');
      }
    }
    return Bookmark.create({ userId, ...data });
  },

  async updateBookmark(userId, id, data) {
    const bookmark = await Bookmark.findOne({ where: { userId, id } });
    if (!bookmark) throw new Error('Bookmark not found');
    if (data.folderId) {
      const folder = await Folder.findOne({ where: { userId, id: data.folderId } });
      if (!folder) {
        throw new Error('Folder not found');
      }
    }
    return bookmark.update(data);
  },

  async updateBookmarkFolder(userId, id, folderId) {
    const bookmark = await Bookmark.findOne({ where: { userId, id } });
    if (!bookmark) throw new Error('Bookmark not found');
    if (folderId) {
      const folder = await Folder.findOne({ where: { userId, id: folderId } });
      if (!folder) {
        throw new Error('Folder not found');
      }
    }
    return bookmark.update({ folderId });
  },

  async updateBookmarkOrder(userId, bookmarks) {
    const updatePromises = bookmarks.map((bookmark, index) => {
      return Bookmark.update(
        { sortOrder: index },
        { where: { userId, id: bookmark.id } }
      );
    });
    await Promise.all(updatePromises);
  },

  async deleteBookmark(userId, id) {
    const bookmark = await Bookmark.findOne({ where: { userId, id } });
    if (!bookmark) throw new Error('Bookmark not found');
    return bookmark.destroy();
  },

  async importBookmarks(userId, bookmarks) {
    const createdBookmarks = [];
    for (const bookmark of bookmarks) {
      const existing = await Bookmark.findOne({ where: { userId, url: bookmark.url } });
      if (!existing) {
        const folder = await Folder.findOne({ 
          where: { userId, name: bookmark.folderName } 
        });
        createdBookmarks.push(await Bookmark.create({
          userId,
          folderId: folder?.id,
          title: bookmark.title,
          url: bookmark.url,
          description: bookmark.description || '',
          icon: bookmark.icon || null
        }));
      }
    }
    return createdBookmarks;
  },

  async exportBookmarks(userId, format = 'chrome') {
    const bookmarks = await Bookmark.findAll({ where: { userId } });
    const folders = await Folder.findAll({ where: { userId } });
    
    if (format === 'chrome') {
      return this.formatForChrome(bookmarks, folders);
    } else if (format === 'firefox') {
      return this.formatForFirefox(bookmarks, folders);
    } else if (format === 'edge') {
      return this.formatForEdge(bookmarks, folders);
    }
    return bookmarks;
  },

  formatForChrome(bookmarks, folders) {
    const folderMap = {};
    folders.forEach(f => {
      folderMap[f.id] = f.name;
    });

    return {
      checksum: '',
      roots: {
        bookmark_bar: { children: [] },
        other: { children: this.groupByFolder(bookmarks, folderMap) },
        synced: { children: [] }
      },
      version: 1
    };
  },

  formatForFirefox(bookmarks, folders) {
    const folderMap = {};
    folders.forEach(f => {
      folderMap[f.id] = f.name;
    });

    return {
      title: 'Bookmarks',
      id: 'root________',
      type: 'text/x-moz-place-container',
      children: this.groupByFolder(bookmarks, folderMap)
    };
  },

  formatForEdge(bookmarks, folders) {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>`;

    bookmarks.forEach(b => {
      const date = Math.floor(b.createdAt.getTime() / 1000);
      html += `\n  <DT><A HREF="${b.url}" ADD_DATE="${date}" LAST_MODIFIED="${date}">${b.title}</A>`;
    });

    html += '\n</DL><p>';
    return html;
  },

  groupByFolder(bookmarks, folderMap) {
    const groups = {};
    bookmarks.forEach(b => {
      const folderName = folderMap[b.folderId] || 'Other';
      if (!groups[folderName]) groups[folderName] = [];
      groups[folderName].push({
        title: b.title,
        url: b.url,
        date_added: Math.floor(b.createdAt.getTime() * 1000)
      });
    });

    const result = [];
    for (const [name, items] of Object.entries(groups)) {
      result.push({
        title: name,
        children: items
      });
    }
    return result;
  }
};

module.exports = bookmarkService;
