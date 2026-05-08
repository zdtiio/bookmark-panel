import axios from 'axios';
import { ElMessage } from 'element-plus';

const createAxiosInstance = () => {
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
    response => {
      const data = response.data;
      if (data.success === false) {
        ElMessage.error(data.message || '操作失败');
        throw new Error(data.message || '操作失败');
      }
      return data.data;
    },
    error => {
      if (error.response) {
        const { status, data } = error.response;
        let message = '请求失败';
        
        if (data && data.message) {
          message = data.message;
        } else {
          switch (status) {
            case 400:
              message = '请求参数错误';
              break;
            case 401:
              message = '登录已过期，请重新登录';
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
              break;
            case 403:
              message = '没有权限访问此资源';
              break;
            case 404:
              message = '请求的资源不存在';
              break;
            case 500:
              message = '服务器内部错误，请稍后重试';
              break;
            default:
              message = `请求错误，状态码: ${status}`;
          }
        }
        
        ElMessage.error(message);
      } else if (error.request) {
        ElMessage.error('网络请求失败，请检查网络连接');
      } else {
        ElMessage.error('请求配置错误');
      }
      
      throw error;
    }
  );

  return axiosInstance;
};

export default createAxiosInstance;