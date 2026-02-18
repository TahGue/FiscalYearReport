"use client";

import { projectGoals, type BudgetGoal } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  goals: BudgetGoal[];
  setGoals: (goals: BudgetGoal[]) => void;
  txs: Transaction[];
  currency: string;
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(0)} ${currency}`;
}

export default function GoalsPlannerPanel({ goals, setGoals, txs, currency }: Props) {
  const projections = projectGoals(goals, txs);

  const updateGoal = (id: string, patch: Partial<BudgetGoal>) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const addGoal = () => {
    const now = new Date();
    const target = new Date(now);
    target.setMonth(now.getMonth() + 8);
    setGoals([
      ...goals,
      {
        id: `goal-${Date.now()}`,
        title: "New savings goal",
        currentAmount: 0,
        targetAmount: 5000,
        targetDate: target.toISOString().slice(0, 10),
      },
    ]);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Goals Planner</h2>
        <button onClick={addGoal} className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          Add goal
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">Set deadlines and weekly targets based on your real cashflow.</p>

      <div className="mt-3 space-y-3">
        {projections.map((entry) => (
          <div key={entry.goal.id} className="rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                value={entry.goal.title}
                onChange={(e) => updateGoal(entry.goal.id, { title: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                value={entry.goal.currentAmount}
                onChange={(e) => updateGoal(entry.goal.id, { currentAmount: Number(e.target.value) || 0 })}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                value={entry.goal.targetAmount}
                onChange={(e) => updateGoal(entry.goal.id, { targetAmount: Number(e.target.value) || 0 })}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={entry.goal.targetDate}
                onChange={(e) => updateGoal(entry.goal.id, { targetDate: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <Badge label="Remaining" value={fmt(entry.remaining, currency)} />
              <Badge label="Days left" value={`${entry.daysLeft}`} />
              <Badge label="Needed / week" value={fmt(entry.neededPerWeek, currency)} />
              <Badge label="Status" value={entry.onTrack ? "On track" : "At risk"} tone={entry.onTrack ? "green" : "red"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, value, tone = "slate" }: { label: string; value: string; tone?: "green" | "red" | "slate" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${toneClass}`}>
      {label}: {value}
    </span>
  );
}
