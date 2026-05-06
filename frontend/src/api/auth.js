import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    throw error;
  }
);

const authApi = {
  login: async (email, password) => {
    return axiosInstance.post('/auth/login', { email, password });
  },

  register: async (username, email, password) => {
    return axiosInstance.post('/auth/register', { username, email, password });
  },

  logout: async () => {
    return axiosInstance.post('/auth/logout');
  },

  getMe: async () => {
    return axiosInstance.get('/auth/me');
  }
};

export default authApi;
