// Shares "who is logged in" with the whole app using React context.
// Any component can call useAuth() to read the user or to log in and out.
import { createContext, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we've asked the server

  // On first load, ask the API whether the session cookie is still valid.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    async login(username, password) {
      const data = await api.login(username, password);
      setUser(data.user);
    },
    async register(username, password) {
      const data = await api.register(username, password);
      setUser(data.user);
    },
    async logout() {
      try {
        await api.logout();
      } finally {
        setUser(null);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
