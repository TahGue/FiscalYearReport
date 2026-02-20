"use client";

import AIAdvisor from "@/components/budget/AIAdvisor";
import ConjointConsultationChat from "@/components/budget/ConjointConsultationChat";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function AIPage() {
  const {
    filteredTxs,
    aiSettings,
    currency,
    budgetBands,
    bufferTargets,
    selfFilteredTxs,
    partnerFilteredTxs,
  } = useBudget();

  return (
    <div className="grid gap-4">
      <AIAdvisor
        txs={filteredTxs}
        settings={aiSettings}
        currency={currency}
        budgetBands={budgetBands}
        bufferTargets={bufferTargets}
      />
      <ConjointConsultationChat
        selfTxs={selfFilteredTxs}
        partnerTxs={partnerFilteredTxs}
        settings={aiSettings}
        currency={currency}
      />
    </div>
  );
}
