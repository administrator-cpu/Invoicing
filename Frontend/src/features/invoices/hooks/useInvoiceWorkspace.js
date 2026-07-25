import { useQuery } from '@tanstack/react-query';
import apiClient from '@/config/axios';

export const useInvoiceWorkspace = (customerId) => {
  return useQuery({
    queryKey: ['workspace', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/invoices/workspace/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
    staleTime: 0,
    cacheTime: 0,
  });
};

export const useInvoiceEditWorkspace = (invoiceId) => {
  return useQuery({
    queryKey: ["invoices", "edit-workspace", invoiceId],
    queryFn: async () => {
      const response = await apiClient.get(`/invoices/${invoiceId}/edit-workspace`);
      return response.data;
    },
    enabled: !!invoiceId,
  });
};

export const useCreditNoteWorkspace = (invoiceId) => {
  return useQuery({
    queryKey: ["credit-notes", "workspace", invoiceId],
    queryFn: async () => {
      const response = await apiClient.get(`/invoices/${invoiceId}/credit-note-workspace`);
      return response.data;
    },
    enabled: !!invoiceId,
  });
};