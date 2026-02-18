"use client";

import { useState } from "react";
import AISettingsPanel from "@/components/budget/AISettings";
import CategoryOverride from "@/components/budget/CategoryOverride";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function SettingsPage() {
  const { aiSettings, setAISettings, filteredTxs, reApplyCategories } = useBudget();
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  return (
    <div className="grid gap-4">
      <AISettingsPanel settings={aiSettings} onChange={setAISettings} />
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
