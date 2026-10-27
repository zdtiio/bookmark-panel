const { Op } = require('sequelize');
const Bookmark = require('../models/Bookmark');
const Folder = require('../models/Folder');
const sequelize = require('../config/database');
const homeItemsService = require('./homeItemsService');
const { errorResponse } = require('../utils/response');

const BOOKMARK_FIELDS = ['title', 'url', 'description', 'icon', 'folderId', 'sortOrder'];

const normalizeFolderId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

/**
 * 校验并归一化图标字段。
 *
 * icon 会被前端直接渲染为 <img src>，若不校验可存储 `data:image/svg+xml;...<script>`
 * 之类的载荷，构成存储型 XSS。这里只接受：
 *  - 本站上传路径 /uploads/<安全文件名>
 *  - http(s) 绝对地址
 * 其余一律置空。
 */
const SAFE_ICON_PATH = /^\/uploads\/[A-Za-z0-9._-]+\.(png|jpe?g|gif|webp|ico|bmp|avif)$/i;

const sanitizeIcon = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;

  const icon = value.trim();
  if (!icon) return null;
  if (icon.length > 512) return null;

  if (SAFE_ICON_PATH.test(icon)) return icon;

  // 仅允许 http(s) 图片地址，绝不允许 javascript:/data:/vbscript: 等伪协议
  if (/^https?:\/\//i.test(icon)) {
    try {
      const parsed = new URL(icon);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch {
      return null;
    }
  }

  return null;
};

const pickBookmarkFields = (data = {}) => {
  const result = {};
  BOOKMARK_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      result[field] = data[field];
    }
  });
  if (Object.prototype.hasOwnProperty.call(result, 'folderId')) {
    result.folderId = normalizeFolderId(result.folderId);
  }
  if (Object.prototype.hasOwnProperty.call(result, 'icon')) {
    result.icon = sanitizeIcon(result.icon);
  }
  if (typeof result.title === 'string') {
    result.title = result.title.trim().slice(0, 255);
  }
  if (typeof result.url === 'string') {
    result.url = result.url.trim();
  }
  if (typeof result.description === 'string') {
    result.description = result.description.slice(0, 10000);
  }
  return result;
};

const folderKey = (folderId) => (folderId === null || folderId === undefined ? 'root' : String(folderId));

const decodeHtmlEntities = (value) => {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(value ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      const code = parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (lower.startsWith('#')) {
      const code = parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[lower] ?? match;
  });
};

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
        pendingFolderName = decodeHtmlEntities(h3Match[1]).trim();
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
          const url = decodeHtmlEntities(aMatch[1]).trim();
          const title = decodeHtmlEntities(aMatch[2]).trim();
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

  async searchBookmarks(userId, query) {
    const searchPattern = `%${query}%`;
    return Bookmark.findAll({
      where: {
        userId,
        [require('sequelize').Op.or]: [
          { title: { [require('sequelize').Op.like]: searchPattern } },
          { url: { [require('sequelize').Op.like]: searchPattern } },
          { description: { [require('sequelize').Op.like]: searchPattern } }
        ]
      },
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });
  },

  async getBookmarksByFolder(userId, folderId) {
    return Bookmark.findAll({ where: { userId, folderId }, order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
  },

  async getBookmarkById(userId, id) {
    return Bookmark.findOne({ where: { userId, id } });
  },

  async createBookmark(userId, data) {
    const payload = pickBookmarkFields(data);
    if (payload.folderId !== null && payload.folderId !== undefined) {
      const folder = await Folder.findOne({ where: { userId, id: payload.folderId } });
      if (!folder) {
        throw errorResponse('文件夹不存在', 'VALIDATION_ERROR', 400);
      }
    }
    return Bookmark.create({ ...payload, userId });
  },

  async updateBookmark(userId, id, data) {
    const bookmark = await Bookmark.findOne({ where: { userId, id } });
    if (!bookmark) throw errorResponse('书签不存在', 'NOT_FOUND', 404);

    const updates = pickBookmarkFields(data);
    if (updates.folderId !== null && updates.folderId !== undefined) {
      const folder = await Folder.findOne({ where: { userId, id: updates.folderId } });
      if (!folder) {
        throw errorResponse('文件夹不存在', 'VALIDATION_ERROR', 400);
      }
    }
    if (Object.keys(updates).length === 0) {
      return bookmark;
    }
    return bookmark.update(updates);
  },

  async updateBookmarkFolder(userId, id, folderId) {
    const bookmark = await Bookmark.findOne({ where: { userId, id } });
    if (!bookmark) throw errorResponse('书签不存在', 'NOT_FOUND', 404);

    const targetFolderId = normalizeFolderId(folderId);
    if (targetFolderId !== null) {
      const folder = await Folder.findOne({ where: { userId, id: targetFolderId } });
      if (!folder) {
        throw errorResponse('文件夹不存在', 'VALIDATION_ERROR', 400);
      }
    }
    return bookmark.update({ folderId: targetFolderId });
  },

  async batchUpdateBookmarkFolder(userId, ids, folderId) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { moved: 0 };
    }

    const uniqueIds = [...new Set(ids)];
    const targetFolderId = normalizeFolderId(folderId);

    if (targetFolderId !== null) {
      const folder = await Folder.findOne({ where: { userId, id: targetFolderId } });
      if (!folder) {
        throw errorResponse('文件夹不存在', 'VALIDATION_ERROR', 400);
      }
    }

    const selectedBookmarks = await Bookmark.findAll({
      where: { userId, id: { [Op.in]: uniqueIds } },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
    });

    if (selectedBookmarks.length === 0) {
      return { moved: 0 };
    }

    const selectedIds = selectedBookmarks.map((bookmark) => bookmark.id);
    const sourceFolderIds = [...new Set(selectedBookmarks.map((bookmark) => bookmark.folderId))];

    // 每个来源文件夹都需要重新编号，避免留下空洞或重复顺序
    for (const sourceFolderId of sourceFolderIds) {
      const remainingBookmarks = await Bookmark.findAll({
        where: {
          userId,
          folderId: sourceFolderId,
          id: { [Op.notIn]: selectedIds }
        },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
      });

      await Promise.all(remainingBookmarks.map((bookmark, index) => {
        return Bookmark.update(
          { sortOrder: index },
          { where: { userId, id: bookmark.id } }
        );
      }));
    }

    const targetBookmarks = await Bookmark.findAll({
      where: {
        userId,
        folderId: targetFolderId,
        id: { [Op.notIn]: selectedIds }
      },
      order: [['sortOrder', 'ASC']]
    });

    let nextSortOrder = targetBookmarks.length > 0
      ? Math.max(...targetBookmarks.map((bookmark) => bookmark.sortOrder || 0)) + 1
      : 0;

    for (const bookmark of selectedBookmarks) {
      await Bookmark.update(
        { folderId: targetFolderId, sortOrder: nextSortOrder++ },
        { where: { userId, id: bookmark.id } }
      );
    }

    return { moved: selectedBookmarks.length };
  },

  async updateBookmarkOrder(userId, bookmarks) {
    if (!Array.isArray(bookmarks)) {
      throw errorResponse('书签顺序数据格式不正确', 'VALIDATION_ERROR', 400);
    }

    const validBookmarks = bookmarks.filter((bookmark) => bookmark && bookmark.id !== undefined);

    await Promise.all(validBookmarks.map((bookmark, index) => {
      return Bookmark.update(
        { sortOrder: index },
        { where: { userId, id: bookmark.id } }
      );
    }));
  },

  async deleteBookmark(userId, id) {
    const bookmark = await Bookmark.findOne({ where: { userId, id } });
    if (!bookmark) throw errorResponse('书签不存在', 'NOT_FOUND', 404);

    // 删除书签与清理首页引用放在同一事务，避免留下指向已删除书签的脏数据。
    // 一致性由后端保证，前端无需再额外发一次配置更新请求。
    return sequelize.transaction(async (transaction) => {
      await bookmark.destroy({ transaction });
      await homeItemsService.removeReferences(userId, 'bookmark', [bookmark.id], transaction);
    });
  },

  async importBookmarks(userId, parsedResult, targetFolderId) {
    const { bookmarks = [], folders = [], folderOrderMap = {} } = parsedResult || {};
    const rootTargetFolderId = normalizeFolderId(targetFolderId);

    if (rootTargetFolderId !== null) {
      const folder = await Folder.findOne({ where: { userId, id: rootTargetFolderId } });
      if (!folder) {
        throw errorResponse('目标文件夹不存在', 'VALIDATION_ERROR', 400);
      }
    }

    const folderCache = {};
    const folderCountBefore = await Folder.count({ where: { userId } });
    const folderPaths = [...new Set(
      (Array.isArray(folders) ? folders : []).filter((path) => typeof path === 'string' && path.trim())
    )];

    for (const folderPath of folderPaths) {
      const order = folderOrderMap[folderPath] || 0;
      await this.createFolderPath(userId, folderPath, rootTargetFolderId, folderCache, order);
    }

    const existingBookmarks = await Bookmark.findAll({
      where: { userId },
      attributes: ['folderId', 'sortOrder']
    });
    const nextSortOrder = {};
    existingBookmarks.forEach((bookmark) => {
      const key = folderKey(bookmark.folderId);
      nextSortOrder[key] = Math.max(nextSortOrder[key] ?? -1, bookmark.sortOrder || 0);
    });

    const createdBookmarks = [];

    for (const bookmark of Array.isArray(bookmarks) ? bookmarks : []) {
      if (!bookmark || typeof bookmark !== 'object') continue;

      const url = typeof bookmark.url === 'string' ? bookmark.url.trim() : '';
      if (!/^https?:\/\//i.test(url)) continue;

      const existing = await Bookmark.findOne({ where: { userId, url } });
      if (existing) continue;

      let folderId = rootTargetFolderId;
      const folderName = typeof bookmark.folderName === 'string' ? bookmark.folderName.trim() : '';
      if (folderName) {
        if (folderCache[folderName]) {
          folderId = folderCache[folderName];
        } else {
          folderId = await this.createFolderPath(userId, folderName, rootTargetFolderId, folderCache);
        }
      }

      const key = folderKey(folderId);
      nextSortOrder[key] = (nextSortOrder[key] ?? -1) + 1;

      createdBookmarks.push(await Bookmark.create({
        userId,
        folderId,
        title: (typeof bookmark.title === 'string' ? bookmark.title.trim().slice(0, 255) : '') || url,
        url,
        description: typeof bookmark.description === 'string' ? bookmark.description.slice(0, 10000) : '',
        // 导入内容来自外部文件，icon 必须同样经过白名单校验，否则会成为 XSS 注入点
        icon: sanitizeIcon(bookmark.icon),
        sortOrder: nextSortOrder[key]
      }));
    }

    const folderCountAfter = await Folder.count({ where: { userId } });

    return {
      bookmarks: createdBookmarks,
      foldersCreated: Math.max(0, folderCountAfter - folderCountBefore)
    };
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
    const { roots, rootBookmarks } = this.buildFolderTree(folders, bookmarks);

    const bookmarkToNode = (bookmark) => ({
      type: 'url',
      name: bookmark.title,
      url: bookmark.url,
      date_added: String(this.toMicroseconds(bookmark.createdAt))
    });

    const folderToNode = (node) => ({
      type: 'folder',
      name: node.folder.name,
      children: [
        ...node.bookmarks.map(bookmarkToNode),
        ...node.children.map(folderToNode)
      ]
    });

    return {
      checksum: '',
      roots: {
        bookmark_bar: { children: [] },
        other: {
          children: [
            ...rootBookmarks.map(bookmarkToNode),
            ...roots.map(folderToNode)
          ]
        },
        synced: { children: [] }
      },
      version: 1
    };
  },

  formatForFirefox(bookmarks, folders) {
    const { roots, rootBookmarks } = this.buildFolderTree(folders, bookmarks);

    const bookmarkToNode = (bookmark) => ({
      title: bookmark.title,
      type: 'text/x-moz-place',
      uri: bookmark.url,
      dateAdded: this.toMicroseconds(bookmark.createdAt)
    });

    const folderToNode = (node) => ({
      title: node.folder.name,
      type: 'text/x-moz-place-container',
      children: [
        ...node.bookmarks.map(bookmarkToNode),
        ...node.children.map(folderToNode)
      ]
    });

    return {
      title: '',
      id: 'root________',
      type: 'text/x-moz-place-container',
      children: [
        ...roots.map(folderToNode),
        ...rootBookmarks.map(bookmarkToNode)
      ]
    };
  },

  formatForHtml(bookmarks, folders) {
    const { roots, rootBookmarks } = this.buildFolderTree(folders, bookmarks);
    const now = Math.floor(Date.now() / 1000);

    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>`;

    const addBookmark = (bookmark, indent = 6) => {
      const spaces = ' '.repeat(indent);
      const date = bookmark.createdAt
        ? Math.floor(new Date(bookmark.createdAt).getTime() / 1000)
        : now;
      html += `\n${spaces}<DT><A HREF="${this.escapeHtml(bookmark.url)}" ADD_DATE="${date}" LAST_MODIFIED="${date}">${this.escapeHtml(bookmark.title)}</A>`;
    };

    const addFolder = (node, indent = 6) => {
      const spaces = ' '.repeat(indent);
      const folderDate = node.folder.createdAt
        ? Math.floor(new Date(node.folder.createdAt).getTime() / 1000)
        : now;
      html += `\n${spaces}<DT><H3 ADD_DATE="${folderDate}" LAST_MODIFIED="${folderDate}">${this.escapeHtml(node.folder.name)}</H3>`;
      html += `\n${spaces}<DL><p>`;
      node.bookmarks.forEach((bookmark) => addBookmark(bookmark, indent + 4));
      node.children.forEach((child) => addFolder(child, indent + 4));
      html += `\n${spaces}</DL><p>`;
    };

    rootBookmarks.forEach((bookmark) => addBookmark(bookmark));
    roots.forEach((node) => addFolder(node));

    html += `
    </DL><p>
</DL><p>`;
    return html;
  },

  buildFolderTree(folders, bookmarks) {
    const nodes = new Map();
    (folders || []).forEach((folder) => {
      nodes.set(folder.id, { folder, children: [], bookmarks: [] });
    });

    const roots = [];
    nodes.forEach((node) => {
      const parent = node.folder.parentId !== null && node.folder.parentId !== undefined
        ? nodes.get(node.folder.parentId)
        : null;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const rootBookmarks = [];
    (bookmarks || []).forEach((bookmark) => {
      const node = bookmark.folderId !== null && bookmark.folderId !== undefined
        ? nodes.get(bookmark.folderId)
        : null;
      if (node) {
        node.bookmarks.push(bookmark);
      } else {
        rootBookmarks.push(bookmark);
      }
    });

    const sortBookmarks = (list) => {
      list.sort((a, b) => {
        const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
        return orderDiff !== 0 ? orderDiff : String(a.title).localeCompare(String(b.title));
      });
    };

    const sortNodes = (list) => {
      list.sort((a, b) => {
        const orderDiff = (a.folder.sortOrder || 0) - (b.folder.sortOrder || 0);
        return orderDiff !== 0 ? orderDiff : String(a.folder.name).localeCompare(String(b.folder.name));
      });
      list.forEach((node) => {
        sortBookmarks(node.bookmarks);
        sortNodes(node.children);
      });
    };

    sortBookmarks(rootBookmarks);
    sortNodes(roots);

    return { roots, rootBookmarks };
  },

  toMicroseconds(date) {
    const timestamp = date ? new Date(date).getTime() : Date.now();
    return timestamp * 1000;
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

module.exports = bookmarkService;
module.exports.sanitizeIcon = sanitizeIcon;
module.exports.pickBookmarkFields = pickBookmarkFields;
