import { useEffect, useState } from "react";
import { getCurrentUser, loginUser, registerUser } from "../services/authApi";
import { AuthContext } from "./authContextValue";

const AUTH_STORAGE_KEY = "gadgethub_auth";

const readStoredSession = () => {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
};

const persistSession = (session) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session?.token) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const AuthProvider = ({ children }) => {
  const storedSession = readStoredSession();
  const [token, setToken] = useState(storedSession.token || null);
  const [user, setUser] = useState(storedSession.user || null);
  const [status, setStatus] = useState(token ? "loading" : "guest");

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const restoreSession = async () => {
      try {
        const response = await getCurrentUser(token);

        if (!isMounted) {
          return;
        }

        setUser(response.user);
        setStatus("authenticated");
        persistSession({ token, user: response.user });
      } catch {
        if (!isMounted) {
          return;
        }

        setToken(null);
        setUser(null);
        setStatus("guest");
        persistSession(null);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const saveSession = (nextSession) => {
    setToken(nextSession.token);
    setUser(nextSession.user);
    setStatus("authenticated");
    persistSession(nextSession);
  };

  const login = async (credentials) => {
    const session = await loginUser(credentials);
    saveSession(session);
    return session;
  };

  const register = async (details) => {
    const session = await registerUser(details);
    saveSession(session);
    return session;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setStatus("guest");
    persistSession(null);
  };

  const value = {
    token,
    user,
    status,
    login,
    register,
    logout,
    isAuthenticated: status === "authenticated",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
