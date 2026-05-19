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
    defaultFolderId: null
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
      await configApi.updateConfig(newConfig);
      config.value = { ...config.value, ...newConfig };
      saveToLocalStorage(config.value);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
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
    initFromLocalStorage
  };
});
