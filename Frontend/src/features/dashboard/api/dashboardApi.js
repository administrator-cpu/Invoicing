import apiClient from '@/config/axios';

export const fetchDashboardData = async () => {
  const response = await apiClient.get('/dashboard');
  return response;
};

export const fetchPendingCustomers = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`/dashboard/pending?page=${page}&limit=${limit}`);
  return response;
};