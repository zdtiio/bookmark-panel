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

const configApi = {
  getConfig: async () => {
    return axiosInstance.get('/configs');
  },

  updateConfig: async (config) => {
    return axiosInstance.put('/configs', config);
  },

  exportUserData: async () => {
    const response = await axiosInstance.get('/configs/export', {
      responseType: 'blob'
    });
    return response;
  },

  importUserData: async (data) => {
    return axiosInstance.post('/configs/import', data);
  }
};

export default configApi;
