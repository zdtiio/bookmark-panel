<template>
  <div class="app-container">
    <component 
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

onMounted(() => {
  authStore.checkAuth();
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
