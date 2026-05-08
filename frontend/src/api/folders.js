import createAxiosInstance from './config';

const axiosInstance = createAxiosInstance();

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