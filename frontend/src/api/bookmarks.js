import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api',
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

const bookmarkApi = {
  getAllBookmarks: async () => {
    return axiosInstance.get('/bookmarks');
  },

  getBookmarkById: async (id) => {
    return axiosInstance.get(`/bookmarks/${id}`);
  },

  createBookmark: async (data) => {
    return axiosInstance.post('/bookmarks', data);
  },

  updateBookmark: async (id, data) => {
    return axiosInstance.put(`/bookmarks/${id}`, data);
  },

  updateBookmarkFolder: async (id, folderId) => {
    return axiosInstance.put(`/bookmarks/${id}/folder`, { folderId });
  },

  batchUpdateBookmarkFolder: async (ids, folderId) => {
    return axiosInstance.put('/bookmarks/batch/folder', { ids, folderId });
  },

  updateBookmarkOrder: async (bookmarks) => {
    return axiosInstance.put('/bookmarks/order', { bookmarks });
  },

  deleteBookmark: async (id) => {
    return axiosInstance.delete(`/bookmarks/${id}`);
  },

  importBookmarks: async (format, bookmarks) => {
    return axiosInstance.post('/bookmarks/import', { format, bookmarks });
  },

  exportBookmarks: async (format = 'chrome') => {
    const response = await axiosInstance.get(`/bookmarks/export?format=${format}`, {
      responseType: 'blob'
    });
    return response;
  },

  uploadIcon: async (file) => {
    const formData = new FormData();
    formData.append('icon', file);
    return axiosInstance.post('/bookmarks/icon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default bookmarkApi;
