import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    let message = error.message || 'An unexpected error occurred';

    // When responseType: 'blob' is requested, axios puts the error response body in a Blob
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        if (json.message || json.detail) {
          message = json.message || (typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail));
        }
      } catch {
        // Not a JSON error blob
      }
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.response?.data?.detail) {
      message = typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : JSON.stringify(error.response.data.detail);
    }

    // Auto logout on 401 Unauthorized if not on login page
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }

    const err = new Error(message);
    err.status = error.response?.status;
    err.response = error.response;
    return Promise.reject(err);
  }
);

export default api;

