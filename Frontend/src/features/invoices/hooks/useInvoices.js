import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/config/axios';

export const usePreviewInvoice = () => {
  return useMutation({
    mutationFn: async (previewPayload) => {
      const response = await apiClient.post('/invoices/preview', previewPayload);
      toast.success('Preview Loaded Successfully!');
      return response.data;
    },
    onError: (error) => {
      toast.error(error.message || "Something Went Wrong!");
    },
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
      toast.success('Invoice Created Successfully!');
      navigate('/invoices');
    },
    onError: (error) => {
      toast.error(error.message || "Something Went Wrong!");
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
    refetchInterval: (query) => {
      return query.state.data?.email?.status === "PROCESSING" ? 2000 : false;
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
    onError: (error) => {
      toast.error(error.message || "Something Went Wrong!");
    },
  });
};

export const useCancelInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiClient.patch(`/invoices/${id}/cancel`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"], });
      queryClient.invalidateQueries({ queryKey: ["invoices", "details", variables.id], });
      toast.success("Invoice cancelled successfully.");
    },
    onError: (error) => {
      toast.error(error.message || "Something Went Wrong!");
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/invoices/${id}`);
    },

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"], });
      queryClient.invalidateQueries({ queryKey: ["invoices", "details", id], });
      toast.success("Draft invoice deleted successfully.");
    },

    onError: (error) => {
      toast.error(error.message || "Something Went Wrong!");
    },
  });
};

export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.post(`/invoices/${id}/send`);
    },

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"], });
      queryClient.invalidateQueries({ queryKey: ["invoices", "details", id], });
      toast.success("Invoice queued for email delivery.");
    },

    onError: (error) => {
      toast.error(error.message || "Failed to queued invoice for email delivery.");
    },
  });
};

export const useInvoiceEmailHistory = (invoiceId, enabled = true) => {
  return useQuery({
    queryKey: ["invoice-email-history", invoiceId],
    queryFn: async () => {
      const response = await apiClient.get(`/emails/invoice/${invoiceId}/history`);
      return response.data;
    },
    enabled: enabled && !!invoiceId,
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload) => {
      console.log("Mutation Payload:", payload);
      return await apiClient.put(`/invoices/${payload.invoiceId}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['invoices']
      });
      queryClient.invalidateQueries({
        queryKey: ['invoices', 'details', variables.invoiceId]
      });
      navigate(`/invoices/${variables.invoiceId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Something Went Wrong!");
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