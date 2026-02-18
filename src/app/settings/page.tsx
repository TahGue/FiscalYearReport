"use client";

import { useState } from "react";
import AISettingsPanel from "@/components/budget/AISettings";
import CategoryOverride from "@/components/budget/CategoryOverride";
import DataBackupPanel from "@/components/budget/DataBackupPanel";
import RiskControlsSettingsPanel from "@/components/budget/RiskControlsSettingsPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function SettingsPage() {
  const {
    aiSettings,
    setAISettings,
    filteredTxs,
    reApplyCategories,
    selfTxs,
    partnerTxs,
    currency,
    selectedMonth,
    viewScope,
    contributionModel,
    budgetBands,
    bufferTargets,
    goals,
    setBudgetBands,
    setBufferTargets,
    restoreFromBackup,
  } = useBudget();
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  return (
    <div className="grid gap-4">
      <AISettingsPanel settings={aiSettings} onChange={setAISettings} />
      <RiskControlsSettingsPanel
        budgetBands={budgetBands}
        bufferTargets={bufferTargets}
        onBandsChange={setBudgetBands}
        onBufferTargetsChange={setBufferTargets}
      />
      <DataBackupPanel
        payload={{
          exportedAt: new Date().toISOString(),
          version: "1.0.0",
          selfTxs,
          partnerTxs,
          currency,
          selectedMonth,
          viewScope,
          contributionModel,
          budgetBands,
          bufferTargets,
          goals,
          aiSettings,
        }}
        onImport={restoreFromBackup}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => setShowCategoryEditor((v) => !v)}
          className="mb-2 text-sm text-blue-600 underline"
        >
          {showCategoryEditor ? "Hide category editor" : "Fix categories"}
        </button>
        {showCategoryEditor && <CategoryOverride txs={filteredTxs} onUpdated={reApplyCategories} />}
      </div>
    </div>
  );
}
