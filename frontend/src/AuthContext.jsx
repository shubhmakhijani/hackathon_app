import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ims_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ims_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (nextToken, nextUser) => {
    localStorage.setItem("ims_token", nextToken);
    localStorage.setItem("ims_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("ims_token");
    localStorage.removeItem("ims_user");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
