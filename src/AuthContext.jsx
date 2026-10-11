import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "./api/client";

const AuthContext = createContext(null);

// Именованный экспорт хука useAuth:
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (form) => {
    const data = await api.register(form);
    setToken(data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}