"use client";

import Dashboard from "@/components/budget/Dashboard";
import BufferHealthPanel from "@/components/budget/BufferHealthPanel";
import ConjointAnalysisPanel from "@/components/budget/ConjointAnalysisPanel";
import FluctuationAlertsPanel from "@/components/budget/FluctuationAlertsPanel";
import SpendingPatternPanel from "@/components/budget/SpendingPatternPanel";
import WeeklyDecisionPanel from "@/components/budget/WeeklyDecisionPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function HomePage() {
  const {
    filteredTxs,
    baseFilteredTxs,
    selfFilteredTxs,
    partnerFilteredTxs,
    hasPartnerData,
    contributionModel,
    budgetBands,
    bufferTargets,
    currency,
  } = useBudget();

  return (
    <div className="grid gap-4">
      {hasPartnerData && (
        <ConjointAnalysisPanel
          selfTxs={selfFilteredTxs}
          partnerTxs={partnerFilteredTxs}
          contributionModel={contributionModel}
          currency={currency}
        />
      )}
      <SpendingPatternPanel txs={baseFilteredTxs} currency={currency} />
      <FluctuationAlertsPanel txs={baseFilteredTxs} budgetBands={budgetBands} bufferTargets={bufferTargets} />
      <BufferHealthPanel txs={baseFilteredTxs} bufferTargets={bufferTargets} currency={currency} />
      <WeeklyDecisionPanel txs={baseFilteredTxs} budgetBands={budgetBands} bufferTargets={bufferTargets} currency={currency} />
      <Dashboard txs={filteredTxs} currency={currency} />
    </div>
  );
}
