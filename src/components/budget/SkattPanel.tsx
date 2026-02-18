"use client";

import { useState } from "react";
import { analyzeDeductions, totalEstimatedSaving, type DetectedDeduction } from "@/lib/skatt";
import TaxChecklistPanel from "@/components/budget/TaxChecklistPanel";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

const TYPE_COLORS: Record<string, string> = {
  reseavdrag: "bg-blue-50 border-blue-200",
  trangselskatt: "bg-blue-50 border-blue-200",
  ranteavdrag: "bg-purple-50 border-purple-200",
  rot: "bg-orange-50 border-orange-200",
  rut: "bg-pink-50 border-pink-200",
  akassa: "bg-green-50 border-green-200",
  arbetsverktyg: "bg-yellow-50 border-yellow-200",
  tjansteresor: "bg-teal-50 border-teal-200",
  pension: "bg-indigo-50 border-indigo-200",
};

const TYPE_BADGE: Record<string, string> = {
  reseavdrag: "bg-blue-100 text-blue-800",
  trangselskatt: "bg-blue-100 text-blue-800",
  ranteavdrag: "bg-purple-100 text-purple-800",
  rot: "bg-orange-100 text-orange-800",
  rut: "bg-pink-100 text-pink-800",
  akassa: "bg-green-100 text-green-800",
  arbetsverktyg: "bg-yellow-100 text-yellow-800",
  tjansteresor: "bg-teal-100 text-teal-800",
  pension: "bg-indigo-100 text-indigo-800",
};

function fmt(n: number, currency: string) {
  return `${n.toFixed(0)} ${currency}`;
}

function DeductionCard({ d, currency }: { d: DetectedDeduction; currency: string }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLORS[d.rule.type] ?? "bg-slate-50 border-slate-200";
  const badge = TYPE_BADGE[d.rule.type] ?? "bg-slate-100 text-slate-700";

  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badge}`}>{d.rule.labelSv}</span>
            <span className="text-sm font-semibold text-slate-800">{d.rule.label}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            <span className="text-slate-500">
              Transactions: <span className="font-medium text-slate-800">{d.transactions.length}</span>
            </span>
            <span className="text-slate-500">
              Total paid: <span className="font-medium text-slate-800">{fmt(d.totalSpend, currency)}</span>
            </span>
            {d.estimatedTaxSaving > 0 && (
              <span className="text-slate-500">
                Est. tax saving: <span className="font-bold text-green-700">{fmt(d.estimatedTaxSaving, currency)}</span>
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="mt-1 shrink-0 text-xs text-blue-600 underline">
          {open ? "Hide" : "Details"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <p className="text-sm text-slate-700">{d.rule.explanation}</p>
          <p className="text-sm text-slate-700">{d.rule.howToClaim}</p>
          {d.notes.length > 0 && (
            <ul className="space-y-1">
              {d.notes.map((n, i) => (
                <li key={i} className="text-sm text-slate-600">
                  ⚠ {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkattPanel({ txs, currency }: Props) {
  const deductions = analyzeDeductions(txs);
  const totalSaving = totalEstimatedSaving(deductions);

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Skatt — Tax Deductions (2025)</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Based on your transactions. Estimates only — verify with Skatteverket.
            </p>
          </div>
          {totalSaving > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500">Estimated total tax saving</div>
              <div className="text-2xl font-bold text-green-700">{fmt(totalSaving, currency)}</div>
            </div>
          )}
        </div>
      </div>

      {deductions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No deductible transactions detected in this period.
        </div>
      ) : (
        <div className="grid gap-3">
          {deductions.map((d, i) => (
            <DeductionCard key={i} d={d} currency={currency} />
          ))}
        </div>
      )}

      <TaxChecklistPanel />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Estimates are pattern-based and indicative only. Always verify with Skatteverket or a tax advisor.
      </div>
    </div>
  );
}
