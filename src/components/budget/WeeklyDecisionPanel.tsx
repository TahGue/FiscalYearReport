"use client";

import { buildNextBestActions, buildSpendingAlerts, buildWeeklySummary, classifyCategoryPatterns, findSavingsOpportunities } from "@/lib/roadmapInsights";
import type { BufferTargets, BudgetBand } from "@/components/budget/BudgetProvider";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
  currency: string;
}

function fmt(value: number, currency: string): string {
  return `${value.toFixed(0)} ${currency}`;
}

export default function WeeklyDecisionPanel({ txs, budgetBands, bufferTargets, currency }: Props) {
  const patterns = classifyCategoryPatterns(txs);
  const alerts = buildSpendingAlerts(txs, patterns, budgetBands, bufferTargets);
  const opportunities = findSavingsOpportunities(txs, patterns);
  const actions = buildNextBestActions(opportunities, alerts);
  const summary = buildWeeklySummary(txs, currency);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Veckosammanfattning & nästa bästa åtgärder</h3>
      <p className="mt-1 text-sm text-slate-600">{summary}</p>

      {actions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {actions.map((action) => (
            <li key={action.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">{action.title}</p>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {action.expectedMonthlyImpact > 0 ? `+${fmt(action.expectedMonthlyImpact, currency)}/mån` : "stabilitetsåtgärd"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">Varför detta visas: {action.explainability}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
