"use client";

import GoalsPlannerPanel from "@/components/budget/GoalsPlannerPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function GoalsPage() {
  const { goals, setGoals, filteredTxs, currency } = useBudget();

  return (
    <div className="grid gap-4">
      <GoalsPlannerPanel goals={goals} setGoals={setGoals} txs={filteredTxs} currency={currency} />
    </div>
  );
}
