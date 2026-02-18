"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildForecast } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(0)} ${currency}`;
}

export default function CashflowForecastPanel({ txs, currency }: Props) {
  const forecast = buildForecast(txs);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Cashflow Forecast (30/60/90 days)</h2>
      <p className="mt-1 text-sm text-slate-500">Forward projection from historical monthly net trend.</p>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric title="Now" value={fmt(forecast.startBalance, currency)} />
        <Metric title="In 30 days" value={fmt(forecast.in30, currency)} />
        <Metric title="In 60 days" value={fmt(forecast.in60, currency)} />
        <Metric title="In 90 days" value={fmt(forecast.in90, currency)} />
      </div>

      {forecast.riskDate && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Risk alert: projected negative balance around <strong>{forecast.riskDate}</strong>.
        </div>
      )}

      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecast.points}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(0)} ${currency}`, "Projected"]} />
            <Line type="monotone" dataKey="projectedBalance" stroke="#0284c7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
