import apiClient from '@/config/axios';

export const loginApi = async (credentials) => {
  return await apiClient.post('/auth/login', credentials);
};

export const onboardInitApi = (payload) => apiClient.post('/auth/onboard-init', payload);
export const forgotPasswordApi = (email) => apiClient.post('/auth/forgot-password', { email });
export const verifyOtpApi = (payload) => apiClient.post('/auth/verify-otp', payload);
export const resetPasswordApi = (payload) => apiClient.patch('/auth/reset-password', payload);

export const getMeApi = async () => {
  return await apiClient.get('/auth/me');
};

export const logoutApi = async () => {
  return await apiClient.post('/auth/logout'); // Adjust if your backend logout route is different
};
