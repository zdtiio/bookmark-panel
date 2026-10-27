import { defineStore } from 'pinia';
import { ref } from 'vue';
import { configApi } from '../api';

const STORAGE_KEY = 'bookmark-panel-config';

export const useConfigStore = defineStore('config', () => {
  const config = ref({
    siteName: 'Bookmark-Panel',
    searchEngine: 'https://www.google.com/search?q=',
    showIcons: true,
    showFolders: true,
    backgroundColor: '#1a1a2e',
    backgroundType: 'color',
    backgroundImage: '',
    defaultFolderId: null,
    homeItems: []
  });

  const saveToLocalStorage = (configData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configData));
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load config from localStorage:', error);
    }
    return null;
  };

  const loadConfig = async () => {
    const localConfig = loadFromLocalStorage();
    if (localConfig) {
      config.value = { ...config.value, ...localConfig };
    }
    
    try {
      const response = await configApi.getConfig();
      config.value = { ...config.value, ...response };
      saveToLocalStorage(config.value);
    } catch (error) {
      console.error('Failed to load config from API:', error);
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      const response = await configApi.updateConfig(newConfig);
      config.value = { ...config.value, ...(response || newConfig) };
      saveToLocalStorage(config.value);
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  };

  /**
   * 仅同步本地首页布局，不发请求。
   *
   * 删除书签 / 文件夹时，后端已在同一事务中清理了 homeItems 里的引用，
   * 前端只需把本地视图对齐即可，不再重复发起一次配置更新。
   */
  const setHomeItems = (items) => {
    config.value = {
      ...config.value,
      homeItems: Array.isArray(items) ? items : []
    };
    saveToLocalStorage(config.value);
  };

  const initFromLocalStorage = () => {
    const localConfig = loadFromLocalStorage();
    if (localConfig) {
      config.value = { ...config.value, ...localConfig };
    }
  };

  return {
    config,
    loadConfig,
    saveConfig,
    setHomeItems,
    initFromLocalStorage
  };
});
