import React from "react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend, BarChart, Bar,
  PieChart, Pie, Cell,
} from "recharts";

const fmtCurrency = (v, locale = "en-US", currency = "USD") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(v ?? 0);
const fmtNumber = (v, locale = "en-US") =>
  new Intl.NumberFormat(locale).format(v ?? 0);

const dateTick = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB");
};

const palette = [
  "#3366CC","#DC3912","#FF9900","#109618","#990099",
  "#0099C6","#DD4477","#66AA00","#B82E2E","#316395",
];

export default function KpisCharts({
  timeseries = [],
  top = [],
  metric = "totalrev",
  onMetricChange,
  topDim = "product",
  currency = "USD",
  currencyLocale = "en-US",
}) {
  const metricKey = metric === "totalrev" ? "totalrev" : "qty";
  const handleMetricChange = (e) => onMetricChange?.(e.target.value);

  const tooltipFormatter = (value) =>
    metricKey === "totalrev"
      ? [fmtCurrency(value, currencyLocale, currency), "totalrev"]
      : [fmtNumber(value, currencyLocale), "qty"];

  const yTickFormatter = (v) =>
    metricKey === "totalrev"
      ? fmtCurrency(v, currencyLocale, currency)
      : fmtNumber(v, currencyLocale);

  return (
    <div className="flex flex-col gap-8">
      <section className="w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">Serie temporal</h3>
          <select value={metric} onChange={handleMetricChange}
                  className="border rounded-md px-2 py-1">
            <option value="totalrev">totalrev</option>
            <option value="qty">qty</option>
          </select>
        </div>

        <div style={{ width: "100%", height: 380 }}>
          <ResponsiveContainer>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dt" tickFormatter={dateTick} minTickGap={24} height={40} />
              <YAxis tickFormatter={yTickFormatter} width={90} />
              <Tooltip formatter={tooltipFormatter}
                       labelFormatter={(v) => `Fecha: ${dateTick(v)}`} />
              <Legend />
              <Line type="monotone" dataKey={metricKey} activeDot={{ r: 6 }} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">{`Top ${topDim}`}</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={top}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis tickFormatter={yTickFormatter} width={80} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey={metricKey}>
                  {top.map((_, i) => (
                    <Cell key={`bar-${i}`} fill={palette[i % palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={top}
                  dataKey={metricKey}
                  nameKey="label"
                  cx="50%" cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {top.map((_, i) => (
                    <Cell key={`slice-${i}`} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
