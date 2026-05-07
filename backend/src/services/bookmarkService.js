const Bookmark = require('../models/Bookmark');
const Folder = require('../models/Folder');

const bookmarkService = {
  parseHtmlBookmarks(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('Invalid HTML content');
    }

    const bookmarks = [];
    const folders = [];
    const folderStack = [];
    let pendingFolderName = null;
    const defaultTopFolders = ['收藏栏', 'Bookmarks Bar', '书签栏'];
    let bookmarkOrder = 0;
    let folderOrderMap = {};
    
    const cleanHtml = htmlContent
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<META[^>]+>/gi, '')
      .replace(/<TITLE[^>]*>[\s\S]*?<\/TITLE>/gi, '')
      .replace(/<H1[^>]*>[\s\S]*?<\/H1>/gi, '');

    const lines = cleanHtml.split('\n');
    let skipNextFolder = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const h3Match = line.match(/<H3[^>]*>([^<]+)<\/H3>/i);
      if (h3Match) {
        pendingFolderName = h3Match[1].trim();
        skipNextFolder = defaultTopFolders.includes(pendingFolderName);
        continue;
      }
      
      if (line.includes('<DL><p>')) {
        if (pendingFolderName && !skipNextFolder) {
          folderStack.push(pendingFolderName);
          const folderPath = folderStack.join('/');
          if (!folders.includes(folderPath)) {
            folderOrderMap[folderPath] = folders.length;
            folders.push(folderPath);
          }
        }
        pendingFolderName = null;
        skipNextFolder = false;
      } else if (line.includes('</DL><p>')) {
        if (folderStack.length > 0) {
          folderStack.pop();
        }
      } else {
        const aMatch = line.match(/<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/i);
        if (aMatch) {
          const url = aMatch[1];
          const title = aMatch[2].trim();
          if (url && title && !url.startsWith('javascript:') && !url.startsWith('chrome://')) {
            bookmarks.push({
              title,
              url,
              folderName: folderStack.join('/') || '',
              sortOrder: bookmarkOrder++
            });
          }
        }
      }
    }

    return { bookmarks, folders, folderOrderMap };
  },
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

  async batchUpdateBookmarkFolder(userId, ids, folderId) {
    if (folderId) {
      const folder = await Folder.findOne({ where: { userId, id: folderId } });
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    const sourceFolderId = await Bookmark.findOne({
      where: { userId, id: ids[0] },
      attributes: ['folderId']
    });

    const currentFolderBookmarks = await Bookmark.findAll({
      where: { userId, folderId: sourceFolderId?.folderId },
      order: [['sortOrder', 'ASC']]
    });

    const selectedBookmarks = currentFolderBookmarks.filter(b => ids.includes(b.id));
    const remainingBookmarks = currentFolderBookmarks.filter(b => !ids.includes(b.id));

    const remainingUpdatePromises = remainingBookmarks.map((bookmark, index) => {
      return Bookmark.update(
        { sortOrder: index },
        { where: { userId, id: bookmark.id } }
      );
    });
    await Promise.all(remainingUpdatePromises);

    const targetFolderBookmarks = await Bookmark.findAll({
      where: { userId, folderId },
      order: [['sortOrder', 'ASC']]
    });
    const maxSortOrder = targetFolderBookmarks.length > 0
      ? Math.max(...targetFolderBookmarks.map(b => b.sortOrder || 0))
      : 0;

    const targetUpdatePromises = selectedBookmarks.map((bookmark, index) => {
      return Bookmark.update(
        { folderId, sortOrder: maxSortOrder + index + 1 },
        { where: { userId, id: bookmark.id } }
      );
    });
    await Promise.all(targetUpdatePromises);
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

  async importBookmarks(userId, parsedResult, targetFolderId) {
    const { bookmarks, folders, folderOrderMap } = parsedResult;
    const createdBookmarks = [];
    const folderCache = {};

    for (const folderPath of folders) {
      const order = folderOrderMap[folderPath] || 0;
      await this.createFolderPath(userId, folderPath, targetFolderId, folderCache, order);
    }

    const folderBookmarkOrder = {};
    
    for (const bookmark of bookmarks) {
      const existing = await Bookmark.findOne({ where: { userId, url: bookmark.url } });
      if (!existing) {
        let folderId = targetFolderId;

        if (bookmark.folderName) {
          const folderPath = bookmark.folderName;
          if (folderCache[folderPath]) {
            folderId = folderCache[folderPath];
          } else {
            folderId = await this.createFolderPath(userId, folderPath, targetFolderId, folderCache);
          }
        }

        const key = folderId || 'root';
        if (!folderBookmarkOrder[key]) {
          folderBookmarkOrder[key] = 0;
        }

        createdBookmarks.push(await Bookmark.create({
          userId,
          folderId,
          title: bookmark.title,
          url: bookmark.url,
          description: bookmark.description || '',
          icon: bookmark.icon || null,
          sortOrder: folderBookmarkOrder[key]++
        }));
      }
    }

    return { bookmarks: createdBookmarks, foldersCreated: folders.length };
  },

  async createFolderPath(userId, folderPath, parentId, cache, order = 0) {
    if (cache[folderPath]) {
      return cache[folderPath];
    }

    const parts = folderPath.split('/').filter(p => p.trim());
    let currentParentId = parentId;
    let useOrder = order;

    for (let i = 0; i < parts.length; i++) {
      const partName = parts[i];
      const currentPath = parts.slice(0, i + 1).join('/');

      if (cache[currentPath]) {
        currentParentId = cache[currentPath];
        continue;
      }

      let folder = await Folder.findOne({ 
        where: { userId, name: partName, parentId: currentParentId } 
      });

      if (!folder) {
        folder = await Folder.create({
          userId,
          name: partName,
          sortOrder: useOrder,
          parentId: currentParentId
        });
      }

      cache[currentPath] = folder.id;
      currentParentId = folder.id;
    }

    return currentParentId;
  },

  async exportBookmarks(userId, format = 'html') {
    const bookmarks = await Bookmark.findAll({ where: { userId } });
    const folders = await Folder.findAll({ where: { userId } });
    
    if (format === 'chrome') {
      return this.formatForChrome(bookmarks, folders);
    } else if (format === 'firefox') {
      return this.formatForFirefox(bookmarks, folders);
    } else if (format === 'html') {
      return this.formatForHtml(bookmarks, folders);
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

  formatForHtml(bookmarks, folders) {
    const folderMap = {};
    folders.forEach(f => {
      folderMap[f.id] = f.name;
    });

    const bookmarksByFolder = {};
    bookmarks.forEach(b => {
      const folderName = folderMap[b.folderId] || '';
      if (!bookmarksByFolder[folderName]) bookmarksByFolder[folderName] = [];
      bookmarksByFolder[folderName].push(b);
    });

    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>`;

    const addBookmark = (bm, indent = 6) => {
      const date = bm.createdAt ? Math.floor(bm.createdAt.getTime() / 1000) : Math.floor(Date.now() / 1000);
      const spaces = ' '.repeat(indent);
      html += `\n${spaces}<DT><A HREF="${bm.url}" ADD_DATE="${date}" LAST_MODIFIED="${date}">${bm.title}</A>`;
    };

    const addFolder = (folderName, folderBookmarks, indent = 6) => {
      const spaces = ' '.repeat(indent);
      html += `\n${spaces}<DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}">${folderName}</H3>`;
      html += `\n${spaces}<DL><p>`;
      folderBookmarks.forEach(bm => {
        addBookmark(bm, indent + 4);
      });
      html += `\n${spaces}</DL><p>`;
    };

    const rootBookmarks = bookmarksByFolder[''] || [];
    rootBookmarks.forEach(bm => addBookmark(bm));

    delete bookmarksByFolder[''];

    for (const [folderName, folderBookmarks] of Object.entries(bookmarksByFolder)) {
      addFolder(folderName, folderBookmarks);
    }

    html += `
    </DL><p>
</DL><p>`;
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
