"use client";

import FluctuationAlertsPanel from "@/components/budget/FluctuationAlertsPanel";
import SavingsOpportunitiesPanel from "@/components/budget/SavingsOpportunitiesPanel";
import SubscriptionOptimizerPanel from "@/components/budget/SubscriptionOptimizerPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function OptimizePage() {
  const { filteredTxs, baseFilteredTxs, currency, budgetBands, bufferTargets } = useBudget();

  return (
    <div className="grid gap-4">
      <SavingsOpportunitiesPanel txs={baseFilteredTxs} currency={currency} />
      <FluctuationAlertsPanel txs={baseFilteredTxs} budgetBands={budgetBands} bufferTargets={bufferTargets} />
      <SubscriptionOptimizerPanel txs={filteredTxs} currency={currency} />
    </div>
  );
}
