"use client";

import { monthlyVolatilityIndex } from "@/lib/roadmapInsights";
import type { BufferTargets } from "@/components/budget/BudgetProvider";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  bufferTargets: BufferTargets;
  currency: string;
}

function fmt(value: number, currency: string): string {
  return `${value.toFixed(0)} ${currency}`;
}

export default function BufferHealthPanel({ txs, bufferTargets, currency }: Props) {
  const volatility = monthlyVolatilityIndex(txs);

  const monthlyNeed = bufferTargets.monthlyVolatility;
  const irregularNeed = bufferTargets.irregularFund;
  const emergencyNeed = bufferTargets.emergencyFund;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Buffer health</h3>
      <p className="mt-1 text-sm text-slate-500">Recommended reserves to absorb volatility and irregular costs.</p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric
          label="Monthly volatility buffer"
          value={fmt(monthlyNeed, currency)}
          hint={`Current volatility index: ${volatility.toFixed(0)}%`}
        />
        <Metric label="Irregular expense fund" value={fmt(irregularNeed, currency)} hint="Covers repairs, travel, and seasonal spikes" />
        <Metric label="Emergency fund" value={fmt(emergencyNeed, currency)} hint="Target 3-6 months of core living cost" />
      </div>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
