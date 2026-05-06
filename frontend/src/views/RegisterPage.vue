<template>
  <div class="register-container">
    <div class="register-card">
      <div class="card-header">
        <div class="logo">
          <span class="logo-icon">B</span>
        </div>
        <h2>创建账号</h2>
        <p class="subtitle">开启您的书签管理之旅</p>
      </div>
      <el-form :model="form" @submit.prevent="handleRegister" class="register-form">
        <el-form-item class="form-item">
          <el-input 
            v-model="form.username" 
            placeholder="请输入用户名" 
            class="input-field"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item class="form-item">
          <el-input 
            v-model="form.email" 
            type="email" 
            placeholder="请输入邮箱" 
            class="input-field"
            :prefix-icon="Mail"
          />
        </el-form-item>
        <el-form-item class="form-item">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码" 
            class="input-field"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item class="form-item">
          <el-input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="请确认密码" 
            class="input-field"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item class="form-item">
          <el-button type="primary" @click="handleRegister" class="submit-btn">注册</el-button>
        </el-form-item>
      </el-form>
      <p class="login-link">
        已有账号？<a href="#" @click="$emit('navigate', 'LoginPage')">立即登录</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { ElMessage } from 'element-plus';
import { User, Mail, Lock } from 'lucide-vue-next';

defineEmits(['navigate']);

const authStore = useAuthStore();
const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

const handleRegister = async () => {
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.error('两次输入的密码不一致');
    return;
  }

  try {
    await authStore.register(form.value.username, form.value.email, form.value.password);
    ElMessage.success('注册成功');
    window.location.href = '/';
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败');
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.register-card {
  background: rgba(30, 30, 50, 0.9);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 420px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-header {
  text-align: center;
  margin-bottom: 35px;
}

.logo {
  margin-bottom: 20px;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 16px;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.card-header h2 {
  margin: 0 0 8px 0;
  font-size: 26px;
  font-weight: 600;
  color: #fff;
}

.subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  margin-bottom: 0;
}

.input-field {
  width: 100%;
}

.input-field :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.input-field :deep(.el-input__wrapper:hover) {
  border-color: rgba(64, 158, 255, 0.5);
}

.input-field :deep(.el-input__wrapper.is-focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.input-field :deep(.el-input__inner) {
  color: #fff;
  font-size: 15px;
}

.input-field :deep(.el-input__placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

.input-field :deep(.el-input__prefix) {
  color: rgba(255, 255, 255, 0.5);
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

.login-link {
  text-align: center;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.login-link a {
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.login-link a:hover {
  color: #67c23a;
}

@media (max-width: 768px) {
  .register-container {
    padding: 15px;
  }

  .register-card {
    padding: 30px 24px;
    border-radius: 16px;
  }

  .logo-icon {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }

  .card-header h2 {
    font-size: 22px;
  }

  .subtitle {
    font-size: 13px;
  }

  .input-field :deep(.el-input__inner) {
    font-size: 14px;
  }

  .submit-btn {
    height: 44px;
    font-size: 15px;
  }

  .login-link {
    font-size: 13px;
    margin-top: 20px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .register-card {
    padding: 35px;
    max-width: 380px;
  }
}
</style>