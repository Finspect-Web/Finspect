import axios from "axios";

const STORAGE_KEY = "finspect_auth";
export const AUTH_SESSION_EXPIRED_EVENT = "finspect:auth-session-expired";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});

function readStoredAuth() {
  const authRaw = localStorage.getItem(STORAGE_KEY);

  if (!authRaw) {
    return null;
  }

  try {
    return JSON.parse(authRaw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

api.interceptors.request.use((config) => {
  const auth = readStoredAuth();

  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const authHeader = error?.config?.headers?.Authorization || error?.config?.headers?.authorization;
    const hasAuthenticatedRequest = Boolean(authHeader);

    if (status === 401 && hasAuthenticatedRequest) {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    }

    const message = error?.response?.data?.message || error.message || "Request failed.";
    return Promise.reject(new Error(message));
  }
);

export default api;
