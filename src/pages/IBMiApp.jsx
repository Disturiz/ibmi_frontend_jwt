import React, { useEffect, useState } from "react";
import AuroraBackground from "../ui/AuroraBackground.jsx";
import SiteHeader from "../ui/SiteHeader.jsx";
import { setToken as saveToken, clearToken } from "../auth/token";

// === API base (frontend .env: VITE_API_BASE=http://localhost:8020) ===
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8020").replace(/\/$/, "");
console.log("[IBMiApp] API_BASE =", API_BASE);

// === POST helper con logs útiles ===
async function post(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });

  const txt = await res.text();
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? (txt ? JSON.parse(txt) : {}) : txt;

  if (!res.ok) {
    console.error("[POST fail]", path, res.status, data);
    throw new Error((data && data.detail) || txt || `HTTP ${res.status}`);
  }
  console.log("[POST ok]", path, data);
  return data;
}

// === debounce simple para autocompletado ===
const useDebounce = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

export default function IBMiApp() {
  const [step, setStep] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [token, setTokenState] = useState(() =>
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("ibmi_token") ||
    ""
  );

  // credenciales IBMi
  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  // parámetros de extracción
  const [library, setLibrary] = useState("");
  const [table, setTable] = useState("");
  const [limit, setLimit] = useState(200);

  // preview
  const [count, setCount] = useState(0);
  const [preview, setPreview] = useState([]);

  // autocompletar
  const [schemaOpts, setSchemaOpts] = useState([]);
  const [tableOpts, setTableOpts] = useState([]);
  const debLib = useDebounce(library, 350);
  const debTable = useDebounce(table, 350);

  // mensaje ETL
  const [etlMsg, setEtlMsg] = useState("");

  const logout = () => {
    clearToken();
    setTokenState("");
    sessionStorage.removeItem("ibmi_token");
    setStep("login");
  };

  // === Login contra /login (backend genera JWT) ===
  const onLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!host || !user || !password) {
      setError("Host, usuario y contraseña son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      const data = await post("/login", { host, user, password });

      // guarda token
      saveToken(data.access_token);                          // localStorage.access_token
      localStorage.setItem("auth", JSON.stringify(data));    // opcional
      sessionStorage.setItem("ibmi_token", data.access_token);

      setTokenState(data.access_token);
      setStep("params");
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // === Preview /extract ===
  const onExtract = async (e) => {
    e.preventDefault();
    setError("");

    if (!library || !table) {
      setError("Library y Table son obligatorios.");
      return;
    }
    try {
      setLoading(true);
      const data = await post(
        "/extract?format=json",
        { library: library.toUpperCase(), table: table.toUpperCase(), limit },
        token
      );
      setCount(data.count || 0);
      setPreview((data.rows || []).slice(0, 20));
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // === Descargar CSV/XLSX ===
  const download = async (format, ext) => {
    setError("");
    try {
      const blob = await post(
        `/extract?format=${format}`,
        { library: library.toUpperCase(), table: table.toUpperCase(), limit },
        token
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `${library}_${table}_${ts}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`${format.toUpperCase()}: ${String(err.message || err)}`);
    }
  };

  // === Autocompletar librerías ===
  useEffect(() => {
    if (!token) return;
    const pat = debLib.trim().toUpperCase();
    if (!pat) { setSchemaOpts([]); return; }
    (async () => {
      try {
        const out = await post("/catalog/schemas", { pattern: pat + "%" }, token);
        setSchemaOpts(out.schemas || []);
      } catch { /* noop */ }
    })();
  }, [debLib, token]);

  // === Autocompletar tablas ===
  useEffect(() => {
    if (!token) return;
    const lib = debLib.trim().toUpperCase();
    const pat = debTable.trim().toUpperCase();
    if (!lib || !pat) { setTableOpts([]); return; }
    (async () => {
      try {
        const out = await post("/catalog", { library: lib, pattern: pat + "%", limit: 20 }, token);
        setTableOpts((out.items || []).map(x => x.table));
      } catch { /* noop */ }
    })();
  }, [debLib, debTable, token]);

  // === Disparar workflow de n8n vía backend (/etl/ingest) ===
  const sendToN8n = async () => {
    setError("");
    setEtlMsg("");

    try {
      const lib = library.trim().toUpperCase();
      const tbl = table.trim().toUpperCase();

      // 1) Trae filas frescas para enviar
      const data = await post("/extract?format=json", { library: lib, table: tbl, limit }, token);
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      if (!rows.length) {
        setError("Error ETL: no hay filas para enviar (consulta vacía).");
        return;
      }

      // 2) Envía al proxy del backend (que reenvía a n8n)
      const out = await post("/etl/ingest", { library: lib, table: tbl, limit, rows }, token);

      const count = out?.count ?? rows.length;
      setEtlMsg(`✅ Datos enviados correctamente a n8n (${count} filas). Destino: ${out?.forwarded_to ?? "desconocido"}`);
    } catch (err) {
      setError("Error ETL: " + String(err.message || err));
    }
  };

  return (
    <AuroraBackground>
      <SiteHeader />

      <div className="mt-20 w-full max-w-3xl mx-auto bg-white/90 text-gray-900 shadow-2xl rounded-2xl p-8 backdrop-blur-sm border border-white/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">IBMi Table Search — JWT por Douglas Isturiz</h1>
            <p className="text-gray-600">Login con token + autocompletado + preview.</p>
          </div>
          <div className="flex items-center gap-2">
            {token && <button className="rounded-xl px-3 py-2 border" onClick={logout}>Cerrar sesión</button>}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}

        {step === "login" && (
          <form onSubmit={onLogin} className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium">Host (IBM i)</label>
                <input className="mt-1 w-full border rounded-xl p-2" placeholder="PUB400.COM o IP" value={host} onChange={e => setHost(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Usuario IBM i</label>
                <input className="mt-1 w-full border rounded-xl p-2" value={user} onChange={e => setUser(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Contraseña</label>
                <input type="password" className="mt-1 w-full border rounded-xl p-2" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="bg-black text-white rounded-xl px-4 py-2 disabled:opacity-60">
                {loading ? 'Validando...' : 'Iniciar sesión'}
              </button>
            </div>
          </form>
        )}

        {step === "params" && token && (
          <form onSubmit={onExtract} className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium">Library</label>
                <input className="mt-1 w-full border rounded-xl p-2" placeholder="QIWS o tu lib" value={library} onChange={e => setLibrary(e.target.value)} />
                {schemaOpts.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded-xl w-full max-h-48 overflow-auto">
                    {schemaOpts.map((s, i) => (
                      <div key={i} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setLibrary(s); setSchemaOpts([]); }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium">Table</label>
                <input className="mt-1 w-full border rounded-xl p-2" placeholder="QCUSTCDT o tu tabla" value={table} onChange={e => setTable(e.target.value)} />
                {tableOpts.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded-xl w-full max-h-48 overflow-auto">
                    {tableOpts.map((t, i) => (
                      <div key={i} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setTable(t); setTableOpts([]); }}>
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Límite</label>
                <input
                  type="number" min={1} max={5000}
                  className="mt-1 w-full border rounded-xl p-2"
                  value={limit}
                  onChange={e => setLimit(parseInt(e.target.value || '0', 10))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={() => setStep("login")}>Atrás</button>

              <button type="submit" disabled={loading} className="bg-black text-white rounded-xl px-4 py-2 disabled:opacity-60">
                {loading ? 'Consultando...' : 'Consultar (preview)'}
              </button>

              <button type="button" className="rounded-xl px-4 py-2 border" onClick={() => download('csv', 'csv')}>CSV</button>
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={() => download('xlsx', 'xlsx')}>XLSX</button>

              {/* Disparar workflow n8n */}
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={sendToN8n}>
                Enviar a n8n
              </button>

              {/* Descargar JSON local */}
              <button
                type="button"
                className="rounded-xl px-4 py-2 border"
                onClick={async () => {
                  try {
                    const data = await post(
                      "/extract?format=json",
                      { library: library.toUpperCase(), table: table.toUpperCase(), limit },
                      token
                    );
                    const pretty = JSON.stringify(data, null, 2);
                    const blob = new Blob([pretty], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url;
                    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
                    a.download = `${library}_${table}_${ts}.json`; a.click(); URL.revokeObjectURL(url);
                  } catch (err) { setError(`JSON: ${String(err.message || err)}`); }
                }}
              >
                Descargar JSON
              </button>
            </div>

            {/* Mensaje de éxito del ETL */}
            {etlMsg && <div className="bg-green-50 text-green-700 p-3 rounded-xl mt-3 text-sm">{etlMsg}</div>}

            {(count || preview.length) > 0 && (
              <div className="grid gap-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Filas: {count} — Vista previa: {preview.length}
                    </p>
                    <p className="text-xs text-gray-500">Se muestran hasta 20 filas.</p>
                  </div>
                </div>

                <div className="overflow-auto border rounded-xl bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {preview[0] && Object.keys(preview[0]).map(k => (
                          <th key={k} className="text-left p-2 border-b">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="odd:bg-white even:bg-gray-50">
                          {Object.keys(row).map(k => (
                            <td key={k} className="p-2 border-b whitespace-nowrap">
                              {String(row[k] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </AuroraBackground>
  );
}
