import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,

  // Actions
  setUser: (userData) => set({
    user: userData,
    isAuthenticated: true,
    isCheckingAuth: false
  }),
  clearAuth: () => set({
    user: null,
    isAuthenticated: false,
    isCheckingAuth: false
  }),
  setCheckingAuth: (status) => set({ isCheckingAuth: status }),
}));

export default useAuthStore;