import createAxiosInstance from './config';

const axiosInstance = createAxiosInstance();

const tokenApi = {
  getTokens: async () => {
    return axiosInstance.get('/tokens');
  },

  createToken: async (name) => {
    return axiosInstance.post('/tokens', { name });
  },

  deleteToken: async (id) => {
    return axiosInstance.delete(`/tokens/${id}`);
  },

  rotateToken: async (id) => {
    return axiosInstance.put(`/tokens/${id}/rotate`);
  },

  verifyToken: async (token) => {
    return axiosInstance.post('/tokens/verify', { token });
  }
};

export default tokenApi;