import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '../api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || null);

  const isAuthenticated = () => {
    return !!token.value && !!user.value;
  };

  const applyAuth = (data) => {
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    applyAuth(response);
  };

  const register = async (username, email, password) => {
    const response = await authApi.register(username, email, password);
    applyAuth(response);
  };

  /**
   * 使用 API Token（浏览器插件配置）换取登录态，实现免密登录。
   */
  const loginWithToken = async (apiToken) => {
    const response = await authApi.tokenLogin(apiToken);
    applyAuth(response);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Failed to logout from server:', error);
    } finally {
      token.value = null;
      user.value = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('siteName');
      localStorage.removeItem('bookmark-panel-config');
      document.title = 'Bookmark-Panel';
    }
  };

  const checkAuth = () => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      token.value = savedToken;
      user.value = JSON.parse(savedUser);
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    loginWithToken,
    logout,
    checkAuth
  };
});
