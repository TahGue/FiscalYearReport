"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TransactionUpload from "@/components/budget/TransactionUpload";
import { useBudget } from "@/components/budget/BudgetProvider";

const tabs = [
  { href: "/", label: "Dashboard", emoji: "📊" },
  { href: "/optimize", label: "Optimize", emoji: "💡" },
  { href: "/goals", label: "Goals", emoji: "🎯" },
  { href: "/skatt", label: "Skatt", emoji: "🧾" },
  { href: "/ai", label: "AI Advisor", emoji: "🤖" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
];

export default function BudgetShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    txs,
    currency,
    selectedMonth,
    availableMonths,
    filteredTxs,
    simulationScenario,
    setSelectedMonth,
    loadParsedTransactions,
  } = useBudget();

  const scenarioActive =
    simulationScenario.incomeMultiplier !== 100 ||
    simulationScenario.spendingReductionPercent !== 0 ||
    simulationScenario.oneTimeShock !== 0 ||
    simulationScenario.canceledSubscriptions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/30">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-slate-800">Budget Consultation</h1>
          <span className="text-xs text-slate-500">Private · Local · Insightful</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
        <TransactionUpload onParsed={loadParsedTransactions} />

        {txs.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500" htmlFor="month-filter">
                  Period:
                </label>
                <select
                  id="month-filter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  <option value="all">All time</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">
                  {filteredTxs.length} transactions · {currency}
                </span>
              </div>
              {scenarioActive && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-800">What-if mode active</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Income {simulationScenario.incomeMultiplier}%</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Spend cut {simulationScenario.spendingReductionPercent}%</span>
                </div>
              )}
            </div>

            <nav className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 md:grid-cols-3 lg:grid-cols-6">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>

            {children}
          </>
        )}

        {txs.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">Start by uploading your transaction CSV</h2>
            <p className="mt-2 text-sm text-slate-500">
              Supports Swedbank exports and Windows-1252 Swedish characters. Your data stays on-device.
            </p>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">Your financial data stays on-device</footer>
    </div>
  );
}
