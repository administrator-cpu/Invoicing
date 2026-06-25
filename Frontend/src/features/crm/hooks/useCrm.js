import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import apiClient from '@/config/axios';

export const useSearchCustomers = (searchQuery, sortOrder = 'recent') => {
  return useInfiniteQuery({
    queryKey: ['crm', 'customers', searchQuery, sortOrder], 
    queryFn: async ({ pageParam = 1 }) => {
      let url = `/crm/customers?page=${pageParam}&limit=15&sort=${sortOrder}`;
      
      if (searchQuery && searchQuery.trim().length >= 2) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await apiClient.get(url);
      const payload = response.data || response;
      
      if (payload?.customers && payload.customers.length > 0) {
        const totalCustomers = payload.customers.length;
        const customersWithZeroConnections = payload.customers.filter(
          c => !c.connections || c.connections.length === 0
        ).length;

        if (totalCustomers === customersWithZeroConnections) {
          console.error("❌ BACKEND RACE CONDITION CAUGHT: Connections array not populated!", payload);
        }
      }

      return payload; 
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
      return response.data || response;
    },
    enabled: !!customerId,
  });
};