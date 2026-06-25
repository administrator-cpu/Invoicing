import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../api/dashboardApi';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
};