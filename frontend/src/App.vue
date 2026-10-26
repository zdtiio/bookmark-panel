<template>
  <div class="app-container">
    <div v-if="initializing" class="app-loading"></div>
    <component
      v-else
      :is="views[currentView]"
      @navigate="handleViewChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { useConfigStore } from './stores/config';
import HomePage from './views/HomePage.vue';
import LoginPage from './views/LoginPage.vue';
import RegisterPage from './views/RegisterPage.vue';

const authStore = useAuthStore();
const configStore = useConfigStore();
const currentView = ref('HomePage');

const views = {
 HomePage,
 LoginPage,
 RegisterPage
};

const handleViewChange = (view) => {
  currentView.value = view;
};

const readApiTokenFromUrl = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get('apiToken') || searchParams.get('apiToken');
};

const removeApiTokenFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('apiToken');

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  if (hashParams.has('apiToken')) {
    hashParams.delete('apiToken');
    const restHash = hashParams.toString();
    url.hash = restHash ? `#${restHash}` : '';
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

// 通过插件带 Token 打开时，先等待免密登录完成，避免闪一下登录页
const initializing = ref(!!readApiTokenFromUrl());

onMounted(async () => {
  authStore.checkAuth();

  // 浏览器插件会把 API Token 放在 URL 中传入，用于免密登录
  const apiToken = readApiTokenFromUrl();
  if (apiToken) {
    removeApiTokenFromUrl();
    try {
      await authStore.loginWithToken(apiToken);
    } catch (error) {
      console.error('API Token 登录失败:', error);
    }
  }

  initializing.value = false;

  if (authStore.isAuthenticated()) {
    configStore.initFromLocalStorage();
    const cachedTitle = configStore.config?.siteName || 'Bookmark-Panel';
    document.title = cachedTitle;

    configStore.loadConfig().then(() => {
      const title = configStore.config?.siteName || 'Bookmark-Panel';
      document.title = title;
    });
  }
});

defineExpose({ handleViewChange });
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.app-container {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.app-loading {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

@media (max-width: 768px) {
  html {
    font-size: 14px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  html {
    font-size: 15px;
  }
}

@media (min-width: 1025px) {
  html {
    font-size: 16px;
  }
}
</style>
