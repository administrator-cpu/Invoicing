import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response.data,

  async (error) => {

    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    let message = "An unexpected error occurred";

    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        message = json.message || message;
      } catch {
        // ignore parse failure
      }
    } else {
      message = error.response?.data?.message || message;
    }

    return Promise.reject({
      message,
      status: error.response?.status,
      originalError: error,
    });
  }
);

export default apiClient;