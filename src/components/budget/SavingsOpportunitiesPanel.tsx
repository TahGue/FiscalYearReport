"use client";

import { classifyCategoryPatterns, findSavingsOpportunities } from "@/lib/roadmapInsights";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

function fmt(value: number, currency: string): string {
  return `${value.toFixed(0)} ${currency}`;
}

export default function SavingsOpportunitiesPanel({ txs, currency }: Props) {
  const patterns = classifyCategoryPatterns(txs);
  const opportunities = findSavingsOpportunities(txs, patterns);

  const totalMonthly = opportunities.reduce((sum, opportunity) => sum + opportunity.monthlySaving, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Savings opportunities</h3>
          <p className="mt-1 text-sm text-slate-500">High-impact actions based on your real spending behavior.</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
          <p className="text-xs text-emerald-700">Potential monthly</p>
          <p className="text-lg font-semibold text-emerald-800">{fmt(totalMonthly, currency)}</p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Not enough discretionary/recurring signal yet to recommend savings actions.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {opportunities.map((opportunity) => (
            <li key={opportunity.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">{opportunity.title}</p>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    opportunity.impact === "high"
                      ? "bg-emerald-100 text-emerald-700"
                      : opportunity.impact === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {opportunity.impact}
                </span>
              </div>
              <p className="mt-1 text-slate-600">{opportunity.reason}</p>
              <p className="mt-2 text-xs text-slate-700">Action: {opportunity.action}</p>
              <div className="mt-2 flex gap-3 text-xs">
                <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Monthly {fmt(opportunity.monthlySaving, currency)}</span>
                <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Annual {fmt(opportunity.annualSaving, currency)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
