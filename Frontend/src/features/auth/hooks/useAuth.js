import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../api/authApi';
import useAuthStore from '@/store/useAuthStore';

export const useLogin = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (response) => {
      setUser(response.data.user);
      
      navigate('/dashboard');
    },
  });
};