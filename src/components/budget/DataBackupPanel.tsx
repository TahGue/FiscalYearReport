"use client";

import type { BufferTargets, BudgetBand, ContributionModel, ViewScope } from "@/components/budget/BudgetProvider";
import type { AISettings, Transaction } from "@/types/finance";
import type { BudgetGoal } from "@/lib/optimizer";

interface BackupPayload {
  exportedAt: string;
  version: string;
  selfTxs: Transaction[];
  partnerTxs: Transaction[];
  currency: string;
  selectedMonth: string;
  viewScope: ViewScope;
  contributionModel: ContributionModel;
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
  goals: BudgetGoal[];
  aiSettings: AISettings;
}

interface Props {
  payload: BackupPayload;
  onImport: (payload: BackupPayload) => void;
}

function createDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DataBackupPanel({ payload, onImport }: Props) {
  const exportData = () => {
    const content = JSON.stringify(payload, null, 2);
    createDownload(`financial-advisor-backup-${new Date().toISOString().slice(0, 10)}.json`, content);
  };

  const importData = async (file: File | null) => {
    if (!file) return;
    const raw = await file.text();
    const parsed = JSON.parse(raw) as BackupPayload;
    onImport(parsed);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Local backup / restore</h2>
      <p className="mt-1 text-sm text-slate-500">Export your local data to JSON and restore it later on this device.</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={exportData} className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
          Export backup JSON
        </button>

        <label className="cursor-pointer rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
          Import backup JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void importData(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );
}
