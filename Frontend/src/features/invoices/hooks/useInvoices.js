import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/config/axios';

export const usePreviewInvoice = () => {
  return useMutation({
    mutationFn: async (previewPayload) => {
      const response = await apiClient.post('/invoices/preview', previewPayload);
      return response.data;
    }
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (invoicePayload) => {
      return await apiClient.post('/invoices/draft', invoicePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/invoices');
    },
  });
};

export const useInvoices = (filters) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const { status, page = 1, limit = 10, searchDate, searchMonth } = filters;

      let queryStr = `?page=${page}&limit=${limit}`;
      if (status && status !== 'ALL') {
        queryStr += `&status=${status}`;
      }
      if (searchDate) {
        queryStr += `&date=${searchDate}`; // Format: YYYY-MM-DD
      }
      if (searchMonth) {
        queryStr += `&month=${searchMonth}`; // Format: YYYY-MM
      }

      const response = await apiClient.get(`/invoices${queryStr}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useInvoiceDetails = (id) => {
  return useQuery({
    queryKey: ['invoices', 'details', id],
    queryFn: async () => {
      const response = await apiClient.get(`/invoices/${id}`);
      return response.data.invoice;
    },
    enabled: !!id,
  });
};

export const useFinalizeInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.patch(`/invoices/${id}/finalize`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'details', id] });
    },
  });
};

export const useCancelInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.patch(`/invoices/${id}/cancel`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'details', id] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiClient.put(`/invoices/${id}`, payload);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'details', id] });
      navigate(`/invoices/${id}`);
    },
  });
};

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard');
      return response.data;
    },
    refetchOnWindowFocus: true,
  });
};