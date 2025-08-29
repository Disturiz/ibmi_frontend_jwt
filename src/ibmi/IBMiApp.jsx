
import React, { useEffect, useState } from "react";
import AuroraBackground from "../ui/AuroraBackground.jsx";
import SiteHeader from "../ui/SiteHeader.jsx";


const getApiBase = () => {
  const raw = (import.meta.env.VITE_API_BASE || "").trim();
  return raw ? raw.replace(/\/$/, "") : "/api";
};

const post = async (path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(getApiBase() + path, { method: "POST", headers, body: JSON.stringify(body || {}) });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const t = await res.text(); try { msg = JSON.parse(t)?.detail || t || msg; } catch { msg = t || msg; } } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.blob();
};

const useDebounce = (value, delay=300) => {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id); }, [value, delay]);
  return v;
};

export default function IBMiApp(){
  const [step, setStep] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(() => sessionStorage.getItem("ibmi_token") || "");

  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const [library, setLibrary] = useState("");
  const [table, setTable] = useState("");
  const [limit, setLimit] = useState(200);

  const [count, setCount] = useState(0);
  const [preview, setPreview] = useState([]);

  const [schemaOpts, setSchemaOpts] = useState([]);
  const [tableOpts, setTableOpts] = useState([]);
  const debLib = useDebounce(library, 350);
  const debTable = useDebounce(table, 350);

  const logout = () => { setToken(""); sessionStorage.removeItem("ibmi_token"); setStep("login"); };

  const onLogin = async (e) => {
    e.preventDefault(); setError("");
    if(!host || !user || !password){ setError("Host, usuario y contraseña son obligatorios."); return; }
    try{
      setLoading(true);
      const data = await post("/login", {host, user, password});
      setToken(data.access_token);
      sessionStorage.setItem("ibmi_token", data.access_token);
      setStep("params");
    }catch(err){ setError(String(err.message||err)); }
    finally{ setLoading(false); }
  };

  const onExtract = async (e) => {
    e.preventDefault(); setError("");
    if(!library || !table){ setError("Library y Table son obligatorios."); return; }
    try{
      setLoading(true);
      const data = await post("/extract?format=json",
        { library: library.toUpperCase(), table: table.toUpperCase(), limit },
        token
      );
      setCount(data.count || 0);
      setPreview((data.rows || []).slice(0, 20));
    }catch(err){ setError(String(err.message||err)); }
    finally{ setLoading(false); }
  };

  const download = async (format, ext) => {
    setError("");
    try{
      const blob = await post(`/extract?format=${format}`,
        { library: library.toUpperCase(), table: table.toUpperCase(), limit },
        token
      );
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
      const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
      a.download = `${library}_${table}_${ts}.${ext}`; a.click(); URL.revokeObjectURL(url);
    }catch(err){ setError(`${format.toUpperCase()}: ${String(err.message||err)}`); }
  };

  useEffect(() => {
    if (!token) return;
    const pat = debLib.trim().toUpperCase();
    if (!pat) { setSchemaOpts([]); return; }
    (async () => {
      try{
        const out = await post("/catalog/schemas", { pattern: pat+"%" }, token);
        setSchemaOpts(out.schemas||[]);
      }catch{}
    })();
  }, [debLib, token]);

  useEffect(() => {
    if (!token) return;
    const lib = debLib.trim().toUpperCase();
    const pat = debTable.trim().toUpperCase();
    if (!lib || !pat) { setTableOpts([]); return; }
    (async () => {
      try{
        const out = await post("/catalog", { library: lib, pattern: pat+"%", limit: 20 }, token);
        setTableOpts((out.items||[]).map(x => x.table));
      }catch{}
    })();
  }, [debLib, debTable, token]);

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

        {step==="login" && (
          <form onSubmit={onLogin} className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium">Host (IBM i)</label>
                <input className="mt-1 w-full border rounded-xl p-2" placeholder="PUB400.COM o IP" value={host} onChange={e=>setHost(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Usuario IBM i</label>
                <input className="mt-1 w-full border rounded-xl p-2" value={user} onChange={e=>setUser(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Contraseña</label>
                <input type="password" className="mt-1 w-full border rounded-xl p-2" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button disabled={loading} className="bg-black text-white rounded-xl px-4 py-2 disabled:opacity-60">{loading?'Validando...':'Iniciar sesión'}</button>
            </div>
          </form>
        )}

        {step==="params" && token && (
          <form onSubmit={onExtract} className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium">Library</label>
                <input className="mt-1 w-full border rounded-xl p-2" placeholder="QIWS o tu lib" value={library} onChange={e=>setLibrary(e.target.value)} />
                {schemaOpts.length>0 && (
                  <div className="absolute z-10 bg-white border rounded-xl w-full max-h-48 overflow-auto">
                    {schemaOpts.map((s,i)=>(
                      <div key={i} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={()=>{ setLibrary(s); setSchemaOpts([]); }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium">Table</label>
                <input className="mt-1 w-full border rounded-xl p-2" placeholder="QCUSTCDT o tu tabla" value={table} onChange={e=>setTable(e.target.value)} />
                {tableOpts.length>0 && (
                  <div className="absolute z-10 bg-white border rounded-xl w-full max-h-48 overflow-auto">
                    {tableOpts.map((t,i)=>(
                      <div key={i} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={()=>{ setTable(t); setTableOpts([]); }}>
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium">Límite</label>
                <input type="number" min={1} max={5000} className="mt-1 w-full border rounded-xl p-2" value={limit} onChange={e=>setLimit(parseInt(e.target.value||'0',10))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={()=>setStep("login")}>Atrás</button>
              <button disabled={loading} className="bg-black text-white rounded-xl px-4 py-2 disabled:opacity-60">{loading?'Consultando...':'Consultar (preview)'}</button>
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={()=>download('csv','csv')}>CSV</button>
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={()=>download('xlsx','xlsx')}>XLSX</button>
              <button type="button" className="rounded-xl px-4 py-2 border" onClick={async ()=>{
                try{
                  const data = await post("/extract?format=json",
                    { library: library.toUpperCase(), table: table.toUpperCase(), limit },
                    token
                  );
                  const pretty = JSON.stringify(data, null, 2);
                  const blob = new Blob([pretty], {type:"application/json"});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
                  a.download = `${library}_${table}_${ts}.json`; a.click(); URL.revokeObjectURL(url);
                }catch(err){ setError(`JSON: ${String(err.message||err)}`); }
              }}>JSON</button>
            </div>

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
