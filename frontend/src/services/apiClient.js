import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

export const getUsers = () => {
  return apiClient.get('/users/');
};

export const getItems = () => {
  return apiClient.get('/items/');
};

export default apiClient;
