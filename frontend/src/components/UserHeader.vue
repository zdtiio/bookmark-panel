<template>
  <header class="header">
    <div class="header-left">
      <div class="title-section">
        <h1>{{ config.siteName }}</h1>
        <div class="time-display">
          <span class="time">{{ currentTime }}</span>
          <span class="date">{{ currentDate }}</span>
        </div>
      </div>
    </div>
    <div class="header-center">
      <div class="header-search-container">
        <SearchBar placeholder="搜索书签..." />
      </div>
    </div>
    <div class="header-right">
      <button class="header-btn add-btn" @click="$emit('add-bookmark')" title="添加书签">
        <Plus />
      </button>
      <button class="header-btn settings-btn" @click="$emit('settings')" title="设置">
        <Settings />
      </button>
      <button class="header-btn logout-btn" @click="$emit('logout')" title="退出登录">
        <LogOut />
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Plus, Settings, LogOut } from 'lucide-vue-next';
import { useConfigStore } from '../stores/config';
import SearchBar from './SearchBar.vue';

defineEmits(['add-bookmark', 'settings', 'logout']);

const configStore = useConfigStore();
const config = computed(() => configStore.config);

const currentTime = ref('');
const currentDate = ref('');
let timeInterval = null;

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: flex-start;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-section h1 {
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.title-section .time-display {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.title-section .time {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

.title-section .date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.header-center {
  flex: 1;
  max-width: 650px;
  margin: 0 40px;
}

.header-search-container {
  width: 100%;
}

.header-right {
  display: flex;
  gap: 10px;
}

.header-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.header-btn svg {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.3s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.header-btn:hover svg {
  color: #fff;
  transform: scale(1.1);
}

.header-btn:active {
  transform: translateY(0);
}

.add-btn {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.3) 0%, rgba(103, 194, 58, 0.3) 100%);
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.add-btn:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.5) 0%, rgba(103, 194, 58, 0.5) 100%);
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.4);
}

.add-btn svg {
  color: #67c23a;
}

.add-btn:hover svg {
  color: #fff;
}

.settings-btn:hover {
  background: rgba(230, 162, 60, 0.25);
}

.settings-btn:hover svg {
  color: #e6a23c;
}

.logout-btn:hover {
  background: rgba(245, 108, 108, 0.25);
}

.logout-btn:hover svg {
  color: #f56c6c;
}

@media (max-width: 768px) {
  .header {
    flex-wrap: wrap;
    padding: 8px 12px;
    gap: 8px;
  }

  .header-left {
    order: 1;
    width: 100%;
    justify-content: center;
  }

  .title-section {
    align-items: center;
    gap: 2px;
  }

  .title-section h1 {
    font-size: 16px;
    margin: 0;
  }

  .title-section .time-display {
    gap: 6px;
    line-height: 1;
  }

  .title-section .time {
    font-size: 12px;
    line-height: 1.2;
  }

  .title-section .date {
    font-size: 10px;
    line-height: 1.2;
  }

  .header-center {
    order: 3;
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  .header-right {
    order: 2;
    margin-left: auto;
  }

  .header-btn {
    width: 40px;
    height: 40px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .header {
    padding: 14px 20px;
  }

  .header-center {
    max-width: 500px;
    margin: 0 20px;
  }
}
</style>