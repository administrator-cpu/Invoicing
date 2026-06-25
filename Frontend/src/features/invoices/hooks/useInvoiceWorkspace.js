import { useQuery } from '@tanstack/react-query';
import apiClient from '@/config/axios';

export const useInvoiceWorkspace = (customerId) => {
  return useQuery({
    queryKey: ['workspace', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/invoices/workspace/${customerId}`);
      return response.data?.data || response.data;
    },
    enabled: !!customerId,
    staleTime: 0,
    cacheTime: 0,
  });
};