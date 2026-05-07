<template>
  <div class="guest-view">
    <div class="site-name">Bookmark-Panel</div>
    <div class="time-display">
      <div class="time">{{ currentTime }}</div>
      <div class="date">{{ currentDate }}</div>
    </div>
    <div class="search-container">
      <SearchBar placeholder="请输入搜索内容" />
    </div>
    <div class="auth-buttons">
      <el-button class="login-btn" @click="$emit('login')">登录</el-button>
      <el-button class="register-btn" @click="$emit('register')">注册</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import SearchBar from './SearchBar.vue';

defineEmits(['login', 'register']);

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
.guest-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.guest-view .site-name {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 30px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.guest-view .time-display {
  text-align: center;
  margin-bottom: 40px;
}

.time-display {
  text-align: center;
}

.time-display .time {
  font-size: 72px;
  font-weight: 300;
  margin-bottom: 10px;
}

.time-display .date {
  font-size: 18px;
  opacity: 0.8;
}

.search-container {
  width: 100%;
  max-width: 650px;
  margin-bottom: 40px;
}

.auth-buttons {
  display: flex;
  gap: 20px;
}

.login-btn {
  width: 120px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4);
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
}

.login-btn:active {
  transform: translateY(0);
}

.register-btn {
  width: 120px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: #fff;
  transition: all 0.3s ease;
}

.register-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.register-btn:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .guest-view .site-name {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .time-display .time {
    font-size: 48px;
  }

  .time-display .date {
    font-size: 14px;
  }

  .search-container {
    max-width: 100%;
  }

  .auth-buttons {
    gap: 12px;
  }

  .login-btn, .register-btn {
    width: 100px;
    height: 42px;
    font-size: 14px;
  }
}
</style>