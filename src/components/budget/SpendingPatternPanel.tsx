"use client";

import { classifyCategoryPatterns } from "@/lib/roadmapInsights";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

function fmt(value: number, currency: string): string {
  return `${value.toFixed(0)} ${currency}`;
}

export default function SpendingPatternPanel({ txs, currency }: Props) {
  const patterns = classifyCategoryPatterns(txs);
  const frequent = patterns.filter((p) => p.classification === "frequent");
  const irregular = patterns.filter((p) => p.classification === "irregular");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Frekventa vs oregelbundna utgifter</h3>
          <p className="mt-1 text-sm text-slate-500">Identifiera stabila kategorier, toppar och rekommenderade buffertnivåer.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Badge label="Frekventa" value={`${frequent.length}`} tone="emerald" />
          <Badge label="Oregelbundna" value={`${irregular.length}`} tone="amber" />
        </div>
      </div>

      {patterns.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Ladda upp minst en månads utgiftsdata för att beräkna mönster.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Typ</th>
                <th className="px-3 py-2">Stabilitet</th>
                <th className="px-3 py-2">Baslinje (snitt)</th>
                <th className="px-3 py-2">Nuvarande månad</th>
                <th className="px-3 py-2">Delta</th>
                <th className="px-3 py-2">Föreslagen buffert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {patterns.slice(0, 10).map((pattern) => (
                <tr key={pattern.category}>
                  <td className="px-3 py-2 font-medium text-slate-900">{pattern.category}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        pattern.classification === "frequent" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {pattern.classification === "frequent" ? "Frekvent" : "Oregelbunden"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{pattern.stabilityScore.toFixed(0)}%</td>
                  <td className="px-3 py-2">{fmt(pattern.averageMonthly, currency)}</td>
                  <td className="px-3 py-2">{fmt(pattern.currentMonth, currency)}</td>
                  <td className={`px-3 py-2 ${pattern.baselineDeltaPercent >= 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {pattern.baselineDeltaPercent >= 0 ? "+" : ""}
                    {pattern.baselineDeltaPercent.toFixed(0)}%
                  </td>
                  <td className="px-3 py-2">{fmt(pattern.recommendedSinkingFund, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Badge({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" }) {
  const toneClass = tone === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  return (
    <div className={`rounded px-2 py-1 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
