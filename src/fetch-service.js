// src/fetch-service.js
// Simple client to call n8n KPIs webhook directly from the frontend (Vite)
//
// Usage:
//   import { fetchKpis } from './fetch-service'
//   const data = await fetchKpis({ date_from: '2024-01-01', date_to: '2025-12-31' })

const BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678';
const ENDPOINT = import.meta.env.VITE_N8N_ENDPOINT || '/webhook-test/etl-ibmi-kpis';
const API_KEY = import.meta.env.VITE_N8N_API_KEY; // optional

export async function fetchKpis(filters = {}) {
  const url = `${BASE_URL}${ENDPOINT}`;
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-N8N-API-KEY'] = API_KEY;

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(filters),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`KPIs request failed: ${resp.status} ${text}`);
  }
  return resp.json();
}
