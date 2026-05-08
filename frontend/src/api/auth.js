import createAxiosInstance from './config';

const axiosInstance = createAxiosInstance();

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