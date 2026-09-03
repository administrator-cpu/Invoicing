import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "@/config/axios";

export const usePreviewCreditNote = () => {
  return useMutation({
    mutationFn: async (previewPayload) => {
      const response = await apiClient.post("/credit-notes/preview", previewPayload);
      return response.data;
    },
    onSuccess: () => { toast.success("Credit Note Preview Loaded Successfully!"); },
    onError: (error) => { toast.error(error.message || "Something Went Wrong!"); },
  });
};

export const useCreateCreditNote = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ invoiceId, payload }) => {
      return await apiClient.post(`/credit-notes/invoice/${invoiceId}`, payload);
    },

    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"], });
      toast.success("Credit Note Draft Created Successfully!");
      const creditNoteId = response.data.creditNote._id;
      navigate(`/credit-notes/${creditNoteId}`);
    },

    onError: (error) => { toast.error(error.message || "Something Went Wrong!"); },
  });
};

export const useCreditNoteCreationData = (invoiceId) => {
  return useQuery({
    queryKey: ["credit-notes", "create", invoiceId],
    queryFn: async () => {
      const response = await apiClient.get(`/credit-notes/create/${invoiceId}`);
      return response.data.invoice;
    },
    enabled: !!invoiceId,
  });
};

export const useCreditNoteDetails = (id) => {
  return useQuery({
    queryKey: ["credit-notes", "details", id],

    queryFn: async () => {
      const response = await apiClient.get(`/credit-notes/${id}`);
      return response.data;
    },

    enabled: !!id,
  });
};

export const useCreditNotes = (filters = {}) => {
  return useQuery({
    queryKey: ["credit-notes", filters],

    queryFn: async () => {
      const { status, page = 1, limit = 10, search, invoiceNumber, customerId } = filters;

      let queryStr = `?page=${page}&limit=${limit}`;
      if (status && status !== "ALL") {
        queryStr += `&status=${status}`;
      }
      if (search) {
        queryStr += `&search=${encodeURIComponent(search)}`;
      }
      if (invoiceNumber) {
        queryStr += `&invoiceNumber=${encodeURIComponent(invoiceNumber)}`;
      }
      if (customerId) {
        queryStr += `&customerId=${encodeURIComponent(customerId)}`;
      }

      const response = await apiClient.get(`/credit-notes${queryStr}`);
      return response.data;
    },

    placeholderData: (previousData) => previousData,
  });
};

export const useUpdateCreditNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiClient.patch(`/credit-notes/${id}`, payload);
    },

    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"], });
      queryClient.invalidateQueries({ queryKey: ["credit-notes", "details", variables.id], });
      toast.success("Credit Note Draft Updated Successfully!");
      return response;
    },

    onError: (error) => { toast.error(error.message || "Something Went Wrong!"); },
  });
};

export const useFinalizeCreditNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.patch(`/credit-notes/${id}/finalize`);
    },

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"], });
      queryClient.invalidateQueries({ queryKey: ["credit-notes", "details", id], });
      queryClient.invalidateQueries({ queryKey: ["invoices"], });
      toast.success("Credit Note finalized successfully.");
    },

    onError: (error) => { toast.error(error.message || "Something Went Wrong!"); },
  });
};

export const useCancelCreditNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.patch(`/credit-notes/${id}/cancel`);
    },

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"], });
      queryClient.invalidateQueries({ queryKey: ["credit-notes", "details", id], });
      queryClient.invalidateQueries({ queryKey: ["invoices"], });
      toast.success("Credit Note cancelled successfully.");
    },

    onError: (error) => { toast.error(error.message || "Something Went Wrong!"); },
  });
};

export const useDeleteCreditNote = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/credit-notes/${id}`);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"], });
      toast.success("Credit Note deleted successfully.");
      navigate("/credit-notes");
    },

    onError: (error) => { toast.error(error.message || "Something Went Wrong!"); },
  });
};