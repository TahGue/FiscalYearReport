"use client";

import GoalsPlannerPanel from "@/components/budget/GoalsPlannerPanel";
import ScenarioComparisonPanel from "@/components/budget/ScenarioComparisonPanel";
import WhatIfSimulatorPanel from "@/components/budget/WhatIfSimulatorPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function GoalsPage() {
  const {
    goals,
    setGoals,
    filteredTxs,
    baseFilteredTxs,
    simulationScenario,
    setSimulationScenario,
    currency,
  } = useBudget();

  return (
    <div className="grid gap-4">
      <WhatIfSimulatorPanel
        baseTxs={baseFilteredTxs}
        scenario={simulationScenario}
        onChange={setSimulationScenario}
        currency={currency}
      />
      <ScenarioComparisonPanel
        baseTxs={baseFilteredTxs}
        simulatedTxs={filteredTxs}
        goals={goals}
        currency={currency}
      />
      <GoalsPlannerPanel goals={goals} setGoals={setGoals} txs={filteredTxs} currency={currency} />
    </div>
  );
}
