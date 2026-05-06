import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '../api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || null);

  const isAuthenticated = () => {
    return !!token.value && !!user.value;
  };

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    token.value = response.token;
    user.value = response.user;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const register = async (username, email, password) => {
    const response = await authApi.register(username, email, password);
    token.value = response.token;
    user.value = response.user;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const logout = async () => {
    await authApi.logout();
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('siteName');
    document.title = 'Bookmark-Panel';
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
    logout,
    checkAuth
  };
});
