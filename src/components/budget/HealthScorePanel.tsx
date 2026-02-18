"use client";

import { computeHealthScore, detectSubscriptions } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
}

export default function HealthScorePanel({ txs }: Props) {
  const subscriptions = detectSubscriptions(txs);
  const score = computeHealthScore(txs, subscriptions);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Financial Health Score</h2>
          <p className="mt-1 text-sm text-slate-500">Composite score from savings, recurring burden, and volatility risk.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">{score.score}</p>
          <p className="text-xs text-slate-500">Grade {score.grade}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Savings rate" value={`${score.savingsRate.toFixed(1)}%`} />
        <Metric label="Subscription burden" value={`${score.subscriptionBurden.toFixed(1)}%`} />
        <Metric label="Anomaly risk" value={`${(score.anomalyRisk * 100).toFixed(0)}%`} />
      </div>

      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {score.recommendations.map((r) => (
          <li key={r}>• {r}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
