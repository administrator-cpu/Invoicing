import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "../../../config/axios.js";

export const useInvoiceCustomerSettings = (customerId) => {
  return useQuery({
    queryKey: ["invoice-customer-settings", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/invoice-customer-settings/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
  });
};

export const useUpdateInvoiceCustomerSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, recipients }) => {
      const response = await apiClient.patch(`/invoice-customer-settings/${customerId}`, { recipients });
      return response.data.settings;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-customer-settings", variables.customerId] });
      toast.success("Invoice delivery settings updated successfully.");
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong.");
    },
  });
};