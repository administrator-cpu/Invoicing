import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDashboardData, fetchPendingCustomers } from '../api/dashboardApi';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
};

export const usePendingCustomers = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["pending-customers", page, limit],
    queryFn: () => fetchPendingCustomers(page, limit),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};