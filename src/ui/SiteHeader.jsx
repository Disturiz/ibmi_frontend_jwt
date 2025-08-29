
// src/ui/SiteHeader.jsx
// src/ui/SiteHeader.jsx
import React, { useState } from "react";

const getApiBase = () =>
  (import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, "")) || "/api";

export default function SiteHeader() {
  const [state, setState] = useState("idle");   // idle | loading | ok | error
  const [msg, setMsg] = useState("");

  const authHeaders = () => {
    const t = sessionStorage.getItem("ibmi_token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const testHealth = async () => {
    setState("loading"); setMsg("");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000); // 7s timeout

    try {
      const res = await fetch(`${getApiBase()}/health`, {
        method: "GET",
        headers: { ...authHeaders() },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      try { text = JSON.parse(text)?.status || text; } catch {}
      setState("ok"); setMsg(text || "OK");
    } catch (err) {
      clearTimeout(timer);
      setState("error");
      setMsg(err?.name === "AbortError" ? "Timeout" : (err?.message || "Error"));
    }
  };

  const Badge = () => {
    if (state === "loading")
      return (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-200">
          <span className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
          Probando…
        </span>
      );
    if (state === "ok")
      return (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          OK
        </span>
      );
    if (state === "error")
      return (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-200">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          {msg || "Error"}
        </span>
      );
    return null;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3 px-3">
            {/* Logo simple con gradiente */}
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M12 21c-4.8-3.5-8-5.7-8-9.6C4 8.5 5.8 6.7 8 6.7c1.3 0 2.5.6 3.3 1.6.8-1 2-1.6 3.3-1.6 2.2 0 4 1.8 4 4.7 0 3.9-3.2 6.1-8 9.6z" fill="url(#g1)" />
            </svg>
            <span className="font-semibold tracking-tight text-white">IBMi Table Search</span>
          </div>
          <div className="flex items-center gap-2 pr-3">
            <a className="hidden sm:inline text-sm px-3 py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-white" href="#" onClick={(e)=>e.preventDefault()}>
              Documentación
            </a>
            <button
              onClick={testHealth}
              className="text-sm px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white"
              aria-live="polite"
            >
              Probar conexión
            </button>
            <Badge />
          </div>
        </div>
        {/* Mensaje breve debajo (opcional) */}
        {state !== "idle" && (
          <div className="px-3 pt-1 text-xs text-white/80">{msg}</div>
        )}
      </div>
    </header>
  );
}

