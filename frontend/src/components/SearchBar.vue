<template>
  <div class="search-bar">
    <div class="search-engine-wrapper">
      <div 
        class="search-engine-btn" 
        @click="toggleEngineDropdown"
      >
        <span :class="['engine-icon', guestSearchEngine]">{{ selectedLabel }}</span>
      </div>
      <div 
        v-if="showEngineDropdown" 
        class="engine-dropdown"
        style="background: #2d2d4a !important; opacity: 1 !important;"
      >
        <div 
          v-for="engine in engineList" 
          :key="engine"
          class="engine-option"
          @click="selectEngine(engine)"
        >
          <span :class="['engine-icon', engine]">{{ getEngineLabel(engine) }}</span>
          <span class="engine-name">{{ engineNames[engine] }}</span>
        </div>
      </div>
    </div>
    <div class="search-input-wrapper">
      <el-input 
        v-model="searchQuery" 
        :placeholder="placeholder"
        class="search-input"
        @keyup.enter="handleSearch"
        @input="handleInput"
      />
    </div>
    <button class="search-submit-btn" @click="handleSearch">
      <Search />
    </button>
  </div>
</template>

<script setup>import { ref, computed, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import { useConfigStore } from '../stores/config';
const props = defineProps({
 placeholder: {
 type: String,
 default: '请输入搜索内容'
 },
 isLoggedIn: {
 type: Boolean,
 default: false
 }
});
const emit = defineEmits(['search', 'clear', 'web-search']);
const configStore = useConfigStore();
const searchQuery = ref('');
const guestSearchEngine = ref('baidu');
const showEngineDropdown = ref(false);
const searchEngines = {
 google: 'https://www.google.com/search?q=',
 baidu: 'https://www.baidu.com/s?wd=',
 bing: 'https://www.bing.com/search?q='
};
const engineNames = {
 google: 'Google',
 baidu: '百度',
 bing: '必应'
};
const engineList = ['baidu', 'google', 'bing'];
const urlToEngineMap = {
 'https://www.google.com/search?q=': 'google',
 'https://www.baidu.com/s?wd=': 'baidu',
 'https://www.bing.com/search?q=': 'bing'
};
watch(() => props.isLoggedIn, (isLoggedIn) => {
 if (isLoggedIn) {
 const configuredEngineUrl = configStore.config.searchEngine;
 const engineName = urlToEngineMap[configuredEngineUrl];
 if (engineName) {
 guestSearchEngine.value = engineName;
 }
 }
}, { immediate: true });

const selectedLabel = computed(() => {
  const labels = { google: 'G', baidu: 'B', bing: 'Bi' };
  return labels[guestSearchEngine.value] || 'B';
});

const getEngineLabel = (engine) => {
  const labels = { google: 'G', baidu: 'B', bing: 'Bi' };
  return labels[engine] || 'B';
};

const toggleEngineDropdown = () => {
  showEngineDropdown.value = !showEngineDropdown.value;
};

const selectEngine = (engine) => {
  guestSearchEngine.value = engine;
  showEngineDropdown.value = false;
};

const handleInput = () => {
  if (props.isLoggedIn) {
    if (searchQuery.value.trim()) {
      emit('search', searchQuery.value.trim());
    } else {
      emit('clear');
    }
  }
};

const handleSearch = () => {
  if (!searchQuery.value.trim()) return;
  
  const searchUrl = searchEngines[guestSearchEngine.value] + encodeURIComponent(searchQuery.value);
  window.open(searchUrl, '_blank');
};

const handleClickOutside = (event) => {
  const engineWrapper = document.querySelector('.search-engine-wrapper');
  if (engineWrapper && !engineWrapper.contains(event.target)) {
    showEngineDropdown.value = false;
  }
};

if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside);
}
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 50%, #1e3a5f 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 40px;
  padding: 4px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.search-engine-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.search-engine-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-right: 4px;
  position: relative;
}

.search-engine-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.search-engine-btn:active {
  transform: scale(0.95);
}

.engine-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background-color: #2d2d4a !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 6px;
  min-width: 150px;
  z-index: 999999 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  opacity: 1 !important;
  filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background-image: none !important;
  overflow: visible;
  pointer-events: auto;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.engine-option:hover {
  background: rgba(102, 126, 234, 0.3);
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.search-input-wrapper :deep(.el-input__wrapper) {
  background: transparent;
  border: none;
  box-shadow: none;
  width: 100%;
}

.search-input-wrapper :deep(.el-input__inner) {
  color: #fff;
  background: transparent;
  font-size: 16px;
  border: none;
  box-shadow: none;
}

.search-input-wrapper :deep(.el-input__inner)::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-input-wrapper :deep(.el-input__clear) {
  color: rgba(255, 255, 255, 0.5);
}

.search-submit-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 4px;
}

.search-submit-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.search-submit-btn:active {
  transform: scale(0.95);
}

.search-submit-btn svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.engine-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.engine-icon.google {
  background: linear-gradient(135deg, #4285f4 0%, #ea4335 50%, #fbbc05 100%);
}

.engine-icon.baidu {
  background: #3385ff;
}

.engine-icon.bing {
  background: linear-gradient(135deg, #0066cc 0%, #2d5bef 100%);
}

.engine-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.search-input {
  width: 100%;
}

@media (max-width: 768px) {
  .search-bar {
    padding: 3px;
  }

  .search-engine-btn {
    width: 40px;
    height: 40px;
    margin-right: 2px;
  }

  .search-submit-btn {
    width: 40px;
    height: 40px;
    margin-left: 2px;
  }
}
</style>