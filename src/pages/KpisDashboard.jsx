import React, { useEffect, useState } from "react";
import KpisCharts from "../components/KpisCharts";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8020";

export default function KpisDashboard() {
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2025-12-31");
  const [granularity, setGranularity] = useState("monthly");
  const [topDim, setTopDim] = useState("product");
  const [limitTop, setLimitTop] = useState(10);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [metric, setMetric] = useState("totalrev");
  const [timeseries, setTimeseries] = useState([]);
  const [top, setTop] = useState([]);

  const token =
    window.sessionStorage.getItem("ibmi_token") ||
    window.localStorage.getItem("access_token");

  async function fetchKpis() {
    try {
      const body = {
        date_from: dateFrom,
        date_to: dateTo,
        series_granularity: granularity,
        top_dim: topDim,
        limit_top: Number(limitTop),
        country: country.trim() || null,
        city: city.trim() || null,
      };

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API}/kpis/query`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      const ts = (data.timeseries || []).map((d) => ({
        dt: d.dt,
        totalrev: Number(d.totalrev ?? 0),
        qty: Number(d.qty ?? 0),
      }));
      const tp = (data.top || []).map((d) => ({
        label: d.label ?? "N/A",
        totalrev: Number(d.totalrev ?? 0),
        qty: Number(d.qty ?? 0),
      }));

      setTimeseries(ts);
      setTop(tp);
      setMetric(data.meta?.metric || "totalrev");
      setTopDim(data.top_dim || "product");

      console.log("[KPIs] ts:", ts.length, ts.slice(0, 3));
      console.log("[KPIs] top:", tp.length, tp);
    } catch (e) {
      console.error("KPIs error:", e);
      setTimeseries([]);
      setTop([]);
      alert(`Error KPIs: ${e.message}`);
    }
  }

  useEffect(() => {
    fetchKpis();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">KPIs</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <div>
          <label className="block text-sm mb-1">Desde</label>
          <input type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1 w-full"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Hasta</label>
          <input type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1 w-full"/>
        </div>
        <div>
          <label className="block text-sm mb-1">País</label>
          <input placeholder="(vacío = todos)" value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="border rounded px-2 py-1 w-full"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Ciudad</label>
          <input placeholder="(vacío = todas)" value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border rounded px-2 py-1 w-full"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Granularidad</label>
          <select value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="border rounded px-2 py-1 w-full">
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Top N</label>
          <input type="number" min="1" max="20" value={limitTop}
            onChange={(e) => setLimitTop(e.target.value)}
            className="border rounded px-2 py-1 w-full"/>
        </div>
        <div className="md:col-span-6">
          <label className="block text-sm mb-1">Top por</label>
          <select value={topDim}
            onChange={(e) => setTopDim(e.target.value)}
            className="border rounded px-2 py-1">
            <option value="product">Producto</option>
            <option value="city">Ciudad</option>
            <option value="country">País</option>
          </select>
          <button onClick={fetchKpis}
            className="ml-3 bg-black text-white px-4 py-2 rounded">
            Consultar KPIs
          </button>
        </div>
      </div>

      <KpisCharts
        timeseries={timeseries}
        top={top}
        metric={metric}
        onMetricChange={setMetric}
        topDim={topDim}
      />

      <div className="text-sm text-gray-500 mt-3">
        {timeseries.length} puntos en serie — {top.length} items en top
      </div>
    </div>
  );
}
