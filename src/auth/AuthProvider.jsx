import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken, clearToken } from "./token";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTok] = useState(getToken());

  function login(newToken) {
    setToken(newToken);
    setTok(newToken);
  }
  function logout() {
    clearToken();
    setTok("");
  }

  // sincroniza si otro tab cambia el storage
  useEffect(() => {
    const onStorage = () => setTok(getToken());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthCtx.Provider value={{ token, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
