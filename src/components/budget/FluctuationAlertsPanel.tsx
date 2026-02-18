"use client";

import { buildSpendingAlerts, classifyCategoryPatterns } from "@/lib/roadmapInsights";
import type { BufferTargets, BudgetBand } from "@/components/budget/BudgetProvider";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
}

export default function FluctuationAlertsPanel({ txs, budgetBands, bufferTargets }: Props) {
  const patterns = classifyCategoryPatterns(txs);
  const alerts = buildSpendingAlerts(txs, patterns, budgetBands, bufferTargets);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Fluctuation alerts</h3>
      <p className="mt-1 text-sm text-slate-500">Early warnings when spending drifts outside normal bands.</p>

      {alerts.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-700">No active alert. Spending is currently within expected ranges.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-lg border p-3 text-sm ${
                alert.severity === "high"
                  ? "border-red-200 bg-red-50"
                  : alert.severity === "medium"
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">{alert.title}</p>
                <span className="rounded bg-white px-2 py-0.5 text-xs capitalize text-slate-600">{alert.severity}</span>
              </div>
              <p className="mt-1 text-slate-700">{alert.reason}</p>
              <p className="mt-1 text-xs text-slate-600">{alert.recommendation}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
