"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { basicInsights, balanceSeries, detectAnomalies, detectRecurring } from "@/lib/analyze";
import CashflowForecastPanel from "@/components/budget/CashflowForecastPanel";
import HealthScorePanel from "@/components/budget/HealthScorePanel";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

const TRANSFER_DESC_PATTERN = /overforing via internet|överföring via internet|overforing|överföring|\btransfer\b|\bswish\b/i;

function isTransferLikeTx(tx: Transaction): boolean {
  const category = (tx.category ?? "").toLowerCase();
  const description = tx.description ?? "";
  return category === "transfers" || TRANSFER_DESC_PATTERN.test(description);
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(0)} ${currency}`;
}

function formatTooltipValue(value: unknown, currency: string, label: string) {
  const raw = Array.isArray(value) ? value[0] : value;
  const numeric = typeof raw === "number" ? raw : Number(raw ?? 0);
  return [`${numeric.toFixed(0)} ${currency}`, label] as [string, string];
}

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#16a34a",
  Transport: "#2563eb",
  Fuel: "#7c3aed",
  Parking: "#6366f1",
  Subscriptions: "#db2777",
  Dining: "#ea580c",
  Shopping: "#d97706",
  Insurance: "#0891b2",
  Healthcare: "#059669",
  Housing: "#dc2626",
  Savings: "#15803d",
  Income: "#22c55e",
  Transfers: "#94a3b8",
  Charity: "#8b5cf6",
  Other: "#9ca3af",
};

function buildCategoryData(txs: Transaction[]) {
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.amount >= 0) continue;
    const cat = t.category ?? "Other";
    totals.set(cat, (totals.get(cat) ?? 0) + Math.abs(t.amount));
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

export default function Dashboard({ txs, currency }: Props) {
  const externalTxs = txs.filter((tx) => !isTransferLikeTx(tx));

  const { income, spend, net, topMerchants } = basicInsights(externalTxs);
  const anomalies = detectAnomalies(externalTxs);
  const series = balanceSeries(txs);
  const recurring = detectRecurring(externalTxs);
  const categoryData = buildCategoryData(externalTxs);
  const merchantChartData = topMerchants.map(([name, value]) => ({ name, value }));
  const barColors = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Inkomst" value={fmt(income, currency)} color="text-green-600" />
        <Card title="Utgifter" value={fmt(spend, currency)} color="text-red-500" />
        <Card title="Netto" value={fmt(net, currency)} color={net >= 0 ? "text-green-600" : "text-red-500"} />
      </div>

      <HealthScorePanel txs={txs} />

      <CashflowForecastPanel txs={txs} currency={currency} />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-slate-800">Saldo över tid</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v) => formatTooltipValue(v, currency, "Saldo")} />
              <Area type="monotone" dataKey="balance" stroke="#16a34a" fillOpacity={1} fill="url(#balance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Topp utgifter per handlare</h3>
          <div className="mb-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatTooltipValue(v, currency, "Spenderat")} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {merchantChartData.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1 text-sm">
            {topMerchants.map(([m, v]) => (
              <li key={m} className="flex justify-between">
                <span className="max-w-[60%] truncate text-slate-700">{m}</span>
                <span className="font-medium text-slate-900">{fmt(v, currency)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">Upptäckta avvikelser</h3>
          {anomalies.length === 0 ? (
            <p className="text-sm text-slate-500">Inga avvikelser upptäckta.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {anomalies.map((a, i) => {
                const sev = a.severity ?? "medium";
                const borderColor =
                  sev === "high" ? "border-red-500" : sev === "medium" ? "border-orange-400" : "border-yellow-400";
                const amtColor =
                  sev === "high" ? "text-red-600" : sev === "medium" ? "text-orange-500" : "text-yellow-600";
                const badge =
                  sev === "high"
                    ? "bg-red-100 text-red-700"
                    : sev === "medium"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-yellow-100 text-yellow-700";
                return (
                  <li key={i} className={`border-l-2 ${borderColor} pl-2 text-sm`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="max-w-[55%] truncate font-medium text-slate-800">{a.description}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge}`}>{sev}</span>
                        <span className={`font-semibold ${amtColor}`}>{fmt(Math.abs(a.amount), currency)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {a.date} · {a.reason}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Utgifter per kategori</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "#9ca3af"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatTooltipValue(v, currency, "Spenderat")} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {categoryData.map((c) => (
                <li key={c.name} className="flex items-center justify-between">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="font-medium text-slate-900">{fmt(c.value, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {recurring.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">Återkommande betalningar upptäckta</h3>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {recurring.map((r) => (
              <li key={r.merchant} className="flex justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium capitalize text-slate-800">{r.merchant}</div>
                  <div className="text-xs capitalize text-slate-400">
                    {r.frequency} · {r.transactions.length}×
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-500">{fmt(Math.abs(r.amount), currency)}</div>
                  <div className="text-xs text-slate-400">{(Math.abs(r.amount) * 12).toFixed(0)} {currency}/år</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, color = "text-slate-900" }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
