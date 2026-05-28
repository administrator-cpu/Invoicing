import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import apiClient from '@/config/axios';

export const useSearchCustomers = (searchQuery) => {
  return useInfiniteQuery({
    queryKey: ['crm', 'customers', searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      let url = '';
      
      if (searchQuery && searchQuery.trim() !== '') {
        url = `/crm/customers?search=${encodeURIComponent(searchQuery)}&page=${pageParam}&limit=15`;
      } else {
        url = `/crm/customers/all?page=${pageParam}&limit=15`;
      }

      const response = await apiClient.get(url);
      
      return response.data; 
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination && lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });
};

export const useCustomerDetails = (customerId) => {
  return useQuery({
    queryKey: ['crm', 'details', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/crm/customers/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
  });
};