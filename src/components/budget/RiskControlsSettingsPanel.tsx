"use client";

import type { BufferTargets, BudgetBand } from "@/components/budget/BudgetProvider";

interface Props {
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
  onBandsChange: (bands: BudgetBand[]) => void;
  onBufferTargetsChange: (targets: BufferTargets) => void;
}

const DEFAULT_CATEGORIES = ["Groceries", "Transport", "Dining", "Shopping", "Housing"];

export default function RiskControlsSettingsPanel({ budgetBands, bufferTargets, onBandsChange, onBufferTargetsChange }: Props) {
  const resolvedBands = budgetBands.length > 0
    ? budgetBands
    : DEFAULT_CATEGORIES.map((category) => ({ category, min: 0, target: 0, max: 0 }));

  const updateBand = (index: number, patch: Partial<BudgetBand>) => {
    const next = resolvedBands.map((band, current) => (current === index ? { ...band, ...patch } : band));
    onBandsChange(next);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Riskkontroller</h2>
      <p className="mt-1 text-sm text-slate-500">Konfigurera kategoribudgetband och fluktuationsbuffertar.</p>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Månatlig volatilitetsbuffert</span>
          <input
            type="number"
            value={bufferTargets.monthlyVolatility}
            onChange={(event) =>
              onBufferTargetsChange({
                ...bufferTargets,
                monthlyVolatility: Number(event.target.value) || 0,
              })
            }
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Oregelbunden fond</span>
          <input
            type="number"
            value={bufferTargets.irregularFund}
            onChange={(event) =>
              onBufferTargetsChange({
                ...bufferTargets,
                irregularFund: Number(event.target.value) || 0,
              })
            }
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Nödfond</span>
          <input
            type="number"
            value={bufferTargets.emergencyFund}
            onChange={(event) =>
              onBufferTargetsChange({
                ...bufferTargets,
                emergencyFund: Number(event.target.value) || 0,
              })
            }
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">Budgetband per kategori</h3>
      <div className="mt-2 space-y-2">
        {resolvedBands.map((band, index) => (
          <div key={band.category} className="grid grid-cols-1 gap-2 rounded border border-slate-200 p-3 md:grid-cols-4">
            <input
              value={band.category}
              onChange={(event) => updateBand(index, { category: event.target.value })}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={band.min}
              onChange={(event) => updateBand(index, { min: Number(event.target.value) || 0 })}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Min"
            />
            <input
              type="number"
              value={band.target}
              onChange={(event) => updateBand(index, { target: Number(event.target.value) || 0 })}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Mål"
            />
            <input
              type="number"
              value={band.max}
              onChange={(event) => updateBand(index, { max: Number(event.target.value) || 0 })}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Max"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
