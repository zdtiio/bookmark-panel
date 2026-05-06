import { defineStore } from 'pinia';
import { ref } from 'vue';
import { configApi } from '../api';

export const useConfigStore = defineStore('config', () => {
  const config = ref({
    siteName: 'Bookmark-Panel',
    searchEngine: 'https://www.google.com/search?q=',
    showIcons: true,
    showFolders: true,
    backgroundColor: '#1a1a2e',
    backgroundType: 'color',
    backgroundImage: ''
  });

  const loadConfig = async () => {
    try {
      const response = await configApi.getConfig();
      config.value = { ...config.value, ...response };
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      await configApi.updateConfig(newConfig);
      config.value = { ...config.value, ...newConfig };
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  return {
    config,
    loadConfig,
    saveConfig
  };
});
