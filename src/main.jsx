import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import IBMiApp from "./pages/IBMiApp.jsx";
import KpisDashboard from "./pages/KpisDashboard.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IBMiApp />} />
        <Route path="/kpis" element={<KpisDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);



