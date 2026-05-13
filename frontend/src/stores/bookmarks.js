import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bookmarkApi, folderApi } from '../api';

export const useBookmarkStore = defineStore('bookmarks', () => {
  const bookmarks = ref([]);
  const folders = ref([]);
  const searchResults = ref([]);
  const isSearching = ref(false);

  const loadBookmarks = async () => {
    try {
      bookmarks.value = await bookmarkApi.getAllBookmarks();
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const loadBookmarksByFolder = async (folderId) => {
    try {
      bookmarks.value = await bookmarkApi.getBookmarksByFolder(folderId);
    } catch (error) {
      console.error('Failed to load bookmarks by folder:', error);
    }
  };

  const searchBookmarks = async (query) => {
    try {
      isSearching.value = true;
      searchResults.value = await bookmarkApi.searchBookmarks(query);
      return searchResults.value;
    } catch (error) {
      console.error('Failed to search bookmarks:', error);
      return [];
    } finally {
      isSearching.value = false;
    }
  };

  const clearSearch = () => {
    searchResults.value = [];
    isSearching.value = false;
  };

  const loadFolders = async () => {
    try {
      folders.value = await folderApi.getAllFolders();
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const addBookmark = async (bookmark) => {
    const response = await bookmarkApi.createBookmark(bookmark);
    bookmarks.value.unshift(response);
  };

  const updateBookmark = async (id, data) => {
    const response = await bookmarkApi.updateBookmark(id, data);
    const index = bookmarks.value.findIndex(b => b.id === id);
    if (index !== -1) {
      bookmarks.value[index] = response;
    }
  };

  const deleteBookmark = async (id) => {
    try {
      await bookmarkApi.deleteBookmark(id);
      bookmarks.value = bookmarks.value.filter(b => b.id !== id);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const addFolder = async (name, sortOrder = null, parentId = null) => {
    try {
      const response = await folderApi.createFolder(name, sortOrder, parentId);
      folders.value.push(response);
    } catch (error) {
      console.error('Failed to add folder:', error);
    }
  };

  const updateFolder = async (id, name) => {
    try {
      const response = await folderApi.updateFolder(id, name);
      const index = folders.value.findIndex(f => f.id === id);
      if (index !== -1) {
        folders.value[index] = response;
      }
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  };

  const updateFolderParent = async (id, parentId) => {
    try {
      const response = await folderApi.updateFolderParent(id, parentId);
      const index = folders.value.findIndex(f => f.id === id);
      if (index !== -1) {
        folders.value[index] = response;
      }
    } catch (error) {
      console.error('Failed to update folder parent:', error);
    }
  };

  const updateFolderOrder = async (foldersData) => {
    try {
      await folderApi.updateFolderOrder(foldersData);
      folders.value = foldersData;
    } catch (error) {
      console.error('Failed to update folder order:', error);
    }
  };

  const deleteFolder = async (id) => {
    try {
      await folderApi.deleteFolder(id);
      folders.value = folders.value.filter(f => f.id !== id);
      bookmarks.value = bookmarks.value.filter(b => b.folderId !== id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const updateBookmarkFolder = async (id, folderId) => {
    try {
      const response = await bookmarkApi.updateBookmarkFolder(id, folderId);
      const index = bookmarks.value.findIndex(b => b.id === id);
      if (index !== -1) {
        bookmarks.value[index] = response;
      }
    } catch (error) {
      console.error('Failed to update bookmark folder:', error);
    }
  };

  const batchUpdateBookmarkFolder = async (ids, folderId) => {
    try {
      await bookmarkApi.batchUpdateBookmarkFolder(ids, folderId);
    } catch (error) {
      console.error('Failed to batch update bookmark folder:', error);
    }
  };

  const updateBookmarkOrder = async (bookmarksData) => {
    try {
      await bookmarkApi.updateBookmarkOrder(bookmarksData);
      bookmarks.value = bookmarksData;
    } catch (error) {
      console.error('Failed to update bookmark order:', error);
    }
  };

  return {
    bookmarks,
    folders,
    searchResults,
    isSearching,
    loadBookmarks,
    loadBookmarksByFolder,
    loadFolders,
    searchBookmarks,
    clearSearch,
    addBookmark,
    updateBookmark,
    updateBookmarkFolder,
    batchUpdateBookmarkFolder,
    updateBookmarkOrder,
    deleteBookmark,
    addFolder,
    updateFolder,
    updateFolderParent,
    updateFolderOrder,
    deleteFolder
  };
});
