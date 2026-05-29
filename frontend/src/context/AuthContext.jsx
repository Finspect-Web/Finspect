import { createContext, useEffect, useMemo, useState } from "react";
import { AUTH_SESSION_EXPIRED_EVENT } from "../api/axios";
import { loginRequest } from "../api/authApi";

export const AuthContext = createContext(null);

const STORAGE_KEY = "finspect_auth";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { token: null, user: null };
    }

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return { token: null, user: null };
    }
  });

  useEffect(() => {
    if (auth.token && auth.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setAuth({ token: null, user: null });
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  const login = async (credentials) => {
    const data = await loginRequest(credentials);
    setAuth({ token: data.token, user: data.user });
    return data.user;
  };

  const logout = () => {
    setAuth({ token: null, user: null });
  };

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      isAuthenticated: Boolean(auth.token && auth.user),
      login,
      logout
    }),
    [auth.token, auth.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
