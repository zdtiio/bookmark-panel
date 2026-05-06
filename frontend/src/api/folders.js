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

const folderApi = {
  getAllFolders: async () => {
    return axiosInstance.get('/folders');
  },

  getFolderById: async (id) => {
    return axiosInstance.get(`/folders/${id}`);
  },

  createFolder: async (name, sortOrder = null, parentId = null) => {
    const data = { name, parentId };
    if (sortOrder !== null) {
      data.sortOrder = sortOrder;
    }
    return axiosInstance.post('/folders', data);
  },

  updateFolder: async (id, name) => {
    return axiosInstance.put(`/folders/${id}`, { name });
  },

  updateFolderParent: async (id, parentId) => {
    return axiosInstance.put(`/folders/${id}/parent`, { parentId });
  },

  updateFolderOrder: async (folders) => {
    return axiosInstance.put('/folders/order', { folders });
  },

  deleteFolder: async (id) => {
    return axiosInstance.delete(`/folders/${id}`);
  }
};

export default folderApi;
