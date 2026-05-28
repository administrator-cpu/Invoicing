import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/config/axios';

// --- API CALLS ---
const fetchProfiles = async () => {
  const response = await apiClient.get('/company-profiles');
  return response.data.profiles;
};

const createProfile = async (data) => {
  return await apiClient.post('/company-profiles', data);
};

const updateProfile = async ({ id, data }) => {
  return await apiClient.patch(`/company-profiles/${id}`, data);
};

const deactivateProfile = async (id) => {
  return await apiClient.delete(`/company-profiles/${id}`);
};

// --- HOOKS ---
export const useCompanyProfiles = () => {
  return useQuery({
    queryKey: ['companyProfiles'],
    queryFn: fetchProfiles,
  });
};

export const useCreateCompanyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfiles'] });
    },
  });
};

export const useUpdateCompanyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfiles'] });
    },
  });
};

export const useDeactivateCompanyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfiles'] });
    },
  });
};