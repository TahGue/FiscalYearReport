"use client";

import { detectSubscriptions, findSubscriptionAlternatives } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(0)} ${currency}`;
}

export default function SubscriptionOptimizerPanel({ txs, currency }: Props) {
  const subscriptions = detectSubscriptions(txs);
  const alternatives = findSubscriptionAlternatives(subscriptions);
  const totalAnnual = subscriptions.reduce((s, c) => s + c.annualCost, 0);
  const optimizedAnnual = Math.max(
    0,
    totalAnnual - alternatives.reduce((s, a) => s + Math.max(0, a.monthlyEstimate - a.alternativeMonthly) * 12, 0),
  );

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Subscription Optimizer</h2>
        <p className="mt-1 text-sm text-slate-500">Detect recurring charges and suggest cheaper/free swaps.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Metric title="Detected subscriptions" value={`${subscriptions.length}`} />
          <Metric title="Estimated annual spend" value={fmt(totalAnnual, currency)} />
          <Metric title="Potential optimized annual" value={fmt(optimizedAnnual, currency)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-slate-800">Detected recurring subscriptions</h3>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-slate-500">No recurring subscriptions detected yet.</p>
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((sub) => (
              <li key={sub.merchant} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{sub.merchant}</p>
                    <p className="text-xs text-slate-500">
                      {sub.frequency} · confidence {(sub.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{fmt(Math.abs(sub.amount), currency)}</p>
                    <p className="text-xs text-slate-500">{fmt(sub.annualCost, currency)}/yr</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-slate-800">Suggested alternatives</h3>
        {alternatives.length === 0 ? (
          <p className="text-sm text-slate-500">No catalog matches yet. Add more known services to get swap suggestions.</p>
        ) : (
          <ul className="space-y-2">
            {alternatives.map((alt) => {
              const yearlySaving = Math.max(0, alt.monthlyEstimate - alt.alternativeMonthly) * 12;
              return (
                <li key={alt.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{alt.service} → {alt.alternative}</p>
                      <p className="text-xs text-slate-600">{alt.notes}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">Save {fmt(yearlySaving, currency)}/yr</p>
                      <p className="text-xs text-slate-500">{alt.type.replace("_", " ")}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
