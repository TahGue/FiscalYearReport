"use client";

import { useEffect, useMemo, useState } from "react";
import { detectSubscriptions, findSubscriptionAlternatives } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  currency: string;
}

const SUBSCRIPTION_OVERRIDES_KEY = "budget-subscription-grouping-overrides";

interface SubscriptionOverrides {
  forceInclude: string[];
  exclude: string[];
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(0)} ${currency}`;
}

function loadOverrides(): SubscriptionOverrides {
  if (typeof window === "undefined") return { forceInclude: [], exclude: [] };
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_OVERRIDES_KEY);
    if (!raw) return { forceInclude: [], exclude: [] };
    const parsed = JSON.parse(raw) as Partial<SubscriptionOverrides>;
    return {
      forceInclude: Array.isArray(parsed.forceInclude) ? parsed.forceInclude : [],
      exclude: Array.isArray(parsed.exclude) ? parsed.exclude : [],
    };
  } catch {
    return { forceInclude: [], exclude: [] };
  }
}

function normalizeInput(value: string): string {
  return value.trim().toLowerCase();
}

export default function SubscriptionOptimizerPanel({ txs, currency }: Props) {
  const [overrides, setOverrides] = useState<SubscriptionOverrides>(loadOverrides);
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");

  useEffect(() => {
    localStorage.setItem(SUBSCRIPTION_OVERRIDES_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const subscriptions = useMemo(
    () =>
      detectSubscriptions(txs, {
        forceInclude: overrides.forceInclude,
        exclude: overrides.exclude,
      }),
    [txs, overrides],
  );
  const alternatives = findSubscriptionAlternatives(subscriptions);
  const totalAnnual = subscriptions.reduce((s, c) => s + c.annualCost, 0);
  const optimizedAnnual = Math.max(
    0,
    totalAnnual - alternatives.reduce((s, a) => s + Math.max(0, a.monthlyEstimate - a.alternativeMonthly) * 12, 0),
  );

  const addOverride = (type: "forceInclude" | "exclude") => {
    const value = normalizeInput(type === "forceInclude" ? includeInput : excludeInput);
    if (!value) return;
    setOverrides((prev) => {
      const nextValues = prev[type].includes(value) ? prev[type] : [...prev[type], value];
      return { ...prev, [type]: nextValues };
    });
    if (type === "forceInclude") {
      setIncludeInput("");
    } else {
      setExcludeInput("");
    }
  };

  const removeOverride = (type: "forceInclude" | "exclude", value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item !== value),
    }));
  };

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
        <h3 className="mb-2 font-semibold text-slate-800">Fix subscription grouping</h3>
        <p className="text-sm text-slate-500">
          Add keywords to force include missed subscriptions or exclude wrongly grouped merchants.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Force include</p>
            <div className="mt-2 flex gap-2">
              <input
                value={includeInput}
                onChange={(event) => setIncludeInput(event.target.value)}
                placeholder="e.g. spotify"
                className="w-full rounded border border-emerald-300 bg-white px-2 py-1.5 text-sm text-slate-700"
              />
              <button
                onClick={() => addOverride("forceInclude")}
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
            {overrides.forceInclude.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {overrides.forceInclude.map((entry) => (
                  <button
                    key={entry}
                    onClick={() => removeOverride("forceInclude", entry)}
                    className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                  >
                    {entry} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Exclude</p>
            <div className="mt-2 flex gap-2">
              <input
                value={excludeInput}
                onChange={(event) => setExcludeInput(event.target.value)}
                placeholder="e.g. swish"
                className="w-full rounded border border-rose-300 bg-white px-2 py-1.5 text-sm text-slate-700"
              />
              <button
                onClick={() => addOverride("exclude")}
                className="rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
            {overrides.exclude.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {overrides.exclude.map((entry) => (
                  <button
                    key={entry}
                    onClick={() => removeOverride("exclude", entry)}
                    className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-800"
                  >
                    {entry} ×
                  </button>
                ))}
              </div>
            )}
          </div>
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
