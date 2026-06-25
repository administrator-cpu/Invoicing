import apiClient from '@/config/axios';

export const fetchDashboardData = async () => {
  const response = await apiClient.get('/dashboard');
  return response;
};