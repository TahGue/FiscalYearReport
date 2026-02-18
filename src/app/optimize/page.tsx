"use client";

import SubscriptionOptimizerPanel from "@/components/budget/SubscriptionOptimizerPanel";
import ScenarioComparisonPanel from "@/components/budget/ScenarioComparisonPanel";
import WhatIfSimulatorPanel from "@/components/budget/WhatIfSimulatorPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function OptimizePage() {
  const { filteredTxs, baseFilteredTxs, simulationScenario, setSimulationScenario, goals, currency } = useBudget();
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
      <SubscriptionOptimizerPanel txs={filteredTxs} currency={currency} />
    </div>
  );
}
