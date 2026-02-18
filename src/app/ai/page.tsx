"use client";

import AIAdvisor from "@/components/budget/AIAdvisor";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function AIPage() {
  const { filteredTxs, aiSettings, currency, budgetBands, bufferTargets } = useBudget();

  return (
    <AIAdvisor
      txs={filteredTxs}
      settings={aiSettings}
      currency={currency}
      budgetBands={budgetBands}
      bufferTargets={bufferTargets}
    />
  );
}
