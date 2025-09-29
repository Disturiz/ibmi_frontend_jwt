// src/auth/token.js
const TOKEN_KEYS = ["access_token", "token", "jwt", "auth_token"];

/** Guarda el token (por defecto en 'access_token') */
export function setToken(token, key = "access_token") {
  if (token) localStorage.setItem(key, token);
}

/** Intenta leer el token desde varias claves comunes */
export function getToken() {
  const bag = localStorage;
  // Si guardaste un objeto 'auth' con access_token adentro
  try {
    const authObj = JSON.parse(bag.getItem("auth") || "null");
    if (authObj?.access_token) return authObj.access_token;
  } catch {}
  // Claves típicas
  for (const k of TOKEN_KEYS) {
    const v = bag.getItem(k);
    if (v) return v;
  }
  return "";
}

/** Borra el token de las claves conocidas */
export function clearToken() {
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
  localStorage.removeItem("auth");
}

/** Construye headers con Authorization si hay token */
export function authHeaders(token = getToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
