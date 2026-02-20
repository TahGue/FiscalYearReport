"use client";

import { useMemo, useState } from "react";
import { basicInsights } from "@/lib/analyze";
import {
  applyScenario,
  buildForecast,
  computeHealthScore,
  detectSubscriptions,
  type SimulationScenario,
} from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  baseTxs: Transaction[];
  scenario: SimulationScenario;
  onChange: (next: SimulationScenario) => void;
  currency: string;
}

interface ScenarioPreset {
  id: string;
  name: string;
  scenario: SimulationScenario;
}

interface ScenarioSnapshot {
  id: string;
  createdAt: string;
  scenario: SimulationScenario;
  estimatedSubscriptionSavePerMonth: number;
}

interface PresetImpact {
  id: string;
  name: string;
  netDelta: number;
  forecast90Delta: number;
  healthDelta: number;
}

const PRESETS_KEY = "budget-consultation-scenario-presets";
const SNAPSHOTS_KEY = "budget-consultation-scenario-snapshots";

const builtInPresets: ScenarioPreset[] = [
  {
    id: "job-loss",
    name: "Jobbförlust stress-test",
    scenario: {
      incomeMultiplier: 55,
      spendingReductionPercent: 12,
      canceledSubscriptions: [],
      oneTimeShock: -8000,
    },
  },
  {
    id: "frugal-mode",
    name: "Sparläge",
    scenario: {
      incomeMultiplier: 100,
      spendingReductionPercent: 20,
      canceledSubscriptions: [],
      oneTimeShock: 0,
    },
  },
  {
    id: "aggressive-savings",
    name: "Aggressiv sparspurt",
    scenario: {
      incomeMultiplier: 108,
      spendingReductionPercent: 28,
      canceledSubscriptions: [],
      oneTimeShock: 3000,
    },
  },
];

function loadCustomPresets(): ScenarioPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScenarioPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSnapshots(): ScenarioSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScenarioSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fmtAmount(value: number, currency: string) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} ${currency}`;
}

export default function WhatIfSimulatorPanel({ baseTxs, scenario, onChange, currency }: Props) {
  const subscriptions = detectSubscriptions(baseTxs);
  const [customPresets, setCustomPresets] = useState<ScenarioPreset[]>(loadCustomPresets);
  const [snapshots, setSnapshots] = useState<ScenarioSnapshot[]>(loadSnapshots);
  const [newPresetName, setNewPresetName] = useState("");
  const [importPayload, setImportPayload] = useState("");
  const [importError, setImportError] = useState("");

  const presetList = useMemo(() => [...builtInPresets, ...customPresets], [customPresets]);

  const baseInsights = useMemo(() => basicInsights(baseTxs), [baseTxs]);
  const baseForecast = useMemo(() => buildForecast(baseTxs), [baseTxs]);
  const baseHealth = useMemo(
    () => computeHealthScore(baseTxs, detectSubscriptions(baseTxs)),
    [baseTxs],
  );

  const presetImpacts = useMemo<PresetImpact[]>(() => {
    return presetList.slice(0, 8).map((preset) => {
      const simulated = applyScenario(baseTxs, preset.scenario);
      const simInsights = basicInsights(simulated);
      const simForecast = buildForecast(simulated);
      const simHealth = computeHealthScore(simulated, detectSubscriptions(simulated));
      return {
        id: preset.id,
        name: preset.name,
        netDelta: simInsights.net - baseInsights.net,
        forecast90Delta: simForecast.in90 - baseForecast.in90,
        healthDelta: simHealth.score - baseHealth.score,
      };
    });
  }, [presetList, baseTxs, baseInsights.net, baseForecast.in90, baseHealth.score]);

  const set = <K extends keyof SimulationScenario>(key: K, value: SimulationScenario[K]) => {
    onChange({ ...scenario, [key]: value });
  };

  const toggleSubscription = (merchant: string) => {
    const exists = scenario.canceledSubscriptions.includes(merchant);
    const next = exists
      ? scenario.canceledSubscriptions.filter((m) => m !== merchant)
      : [...scenario.canceledSubscriptions, merchant];
    set("canceledSubscriptions", next);
  };

  const resetScenario = () => {
    onChange({
      incomeMultiplier: 100,
      spendingReductionPercent: 0,
      canceledSubscriptions: [],
      oneTimeShock: 0,
    });
  };

  const applyPreset = (preset: ScenarioPreset) => {
    onChange({ ...preset.scenario });
  };

  const saveCurrentAsPreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mall";
    const next = [
      ...customPresets,
      {
        id: `custom-${customPresets.length + 1}-${safeName}`,
        name,
        scenario: { ...scenario, canceledSubscriptions: [...scenario.canceledSubscriptions] },
      },
    ];
    setCustomPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    setNewPresetName("");
  };

  const deletePreset = (id: string) => {
    const next = customPresets.filter((p) => p.id !== id);
    setCustomPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  };

  const exportPresets = useMemo(() => JSON.stringify(customPresets, null, 2), [customPresets]);

  const importPresets = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importPayload) as ScenarioPreset[];
      if (!Array.isArray(parsed)) {
        setImportError("Importdata måste vara en JSON-lista med scenarier.");
        return;
      }

      const sanitized: ScenarioPreset[] = parsed
        .filter((p) => p && typeof p.name === "string" && p.scenario)
        .map((p, idx) => ({
          id: typeof p.id === "string" && p.id.length > 0 ? p.id : `imported-${customPresets.length + idx + 1}`,
          name: p.name,
          scenario: {
            incomeMultiplier: Number(p.scenario.incomeMultiplier) || 100,
            spendingReductionPercent: Number(p.scenario.spendingReductionPercent) || 0,
            canceledSubscriptions: Array.isArray(p.scenario.canceledSubscriptions)
              ? p.scenario.canceledSubscriptions.filter((s) => typeof s === "string")
              : [],
            oneTimeShock: Number(p.scenario.oneTimeShock) || 0,
          },
        }));

      const existingIds = new Set(customPresets.map((p) => p.id));
      const merged = [...customPresets];
      for (const preset of sanitized) {
        const id = existingIds.has(preset.id) ? `${preset.id}-copy` : preset.id;
        merged.push({ ...preset, id });
      }

      setCustomPresets(merged);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(merged));
      setImportPayload("");
    } catch {
      setImportError("Ogiltig JSON-data.");
    }
  };

  const estimatedMonthlySubscriptionSave = subscriptions
    .filter((s) => scenario.canceledSubscriptions.includes(s.merchant))
    .reduce((sum, s) => sum + s.annualCost / 12, 0);

  const saveSnapshot = () => {
    const run = snapshots.length + 1;
    const next: ScenarioSnapshot[] = [
      {
        id: `snapshot-${run}`,
        createdAt: `Körning ${run}`,
        scenario: { ...scenario, canceledSubscriptions: [...scenario.canceledSubscriptions] },
        estimatedSubscriptionSavePerMonth: estimatedMonthlySubscriptionSave,
      },
      ...snapshots,
    ].slice(0, 10);
    setSnapshots(next);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">What-If-simulator</h2>
          <p className="mt-1 text-sm text-slate-500">Modellera inkomstförändringar, utgiftsminskningar, avslutade prenumerationer och engångschocker.</p>
        </div>
        <button onClick={resetScenario} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
          Återställ
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenariomallar</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {presetList.map((preset) => {
            const isCustom = preset.id.startsWith("custom-");
            return (
              <div key={preset.id} className="flex items-center gap-1">
                <button
                  onClick={() => applyPreset(preset)}
                  className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {preset.name}
                </button>
                {isCustom && (
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="rounded bg-red-50 px-1.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    x
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="Spara aktuellt scenario som mall"
          />
          <button
            onClick={saveCurrentAsPreset}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Spara
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Effektöversikt för mallar</p>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          {presetImpacts.map((impact) => (
            <div key={impact.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
              <p className="font-semibold text-slate-800">{impact.name}</p>
              <p className={impact.netDelta >= 0 ? "text-emerald-700" : "text-red-700"}>
                Nettodelta: {fmtAmount(impact.netDelta, currency)}
              </p>
              <p className={impact.forecast90Delta >= 0 ? "text-emerald-700" : "text-red-700"}>
                90-d prognosdelta: {fmtAmount(impact.forecast90Delta, currency)}
              </p>
              <p className={impact.healthDelta >= 0 ? "text-emerald-700" : "text-red-700"}>
                Hälsodelta: {impact.healthDelta >= 0 ? "+" : ""}
                {impact.healthDelta.toFixed(0)} p
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exportera/importera egna mallar</p>
        <textarea
          value={exportPresets}
          readOnly
          rows={5}
          className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700"
        />
        <textarea
          value={importPayload}
          onChange={(e) => setImportPayload(e.target.value)}
          rows={4}
          placeholder="Klistra in JSON-lista med mallar här"
          className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={importPresets}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Importera mallar
          </button>
          {importError && <span className="text-xs text-red-600">{importError}</span>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Inkomstmultiplikator: {scenario.incomeMultiplier}%</span>
          <input
            type="range"
            min={50}
            max={170}
            value={scenario.incomeMultiplier}
            onChange={(e) => set("incomeMultiplier", Number(e.target.value))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Utgiftsminskning: {scenario.spendingReductionPercent}%</span>
          <input
            type="range"
            min={0}
            max={50}
            value={scenario.spendingReductionPercent}
            onChange={(e) => set("spendingReductionPercent", Number(e.target.value))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Engångsschock ({currency})</span>
          <input
            type="number"
            value={scenario.oneTimeShock}
            onChange={(e) => set("oneTimeShock", Number(e.target.value) || 0)}
            className="rounded border border-slate-300 px-2 py-1.5"
            placeholder="-5000 eller 3000"
          />
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avsluta prenumerationer i simuleringen</p>
        {subscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Inga återkommande prenumerationer upptäckta för denna period.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            {subscriptions.map((s) => {
              const checked = scenario.canceledSubscriptions.includes(s.merchant);
              return (
                <label key={s.merchant} className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm">
                  <span className="truncate text-slate-700">{s.merchant}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{fmtAmount(s.amount, currency)}/mån</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleSubscription(s.merchant)} />
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
          Prenumerationsbesparing: {fmtAmount(estimatedMonthlySubscriptionSave, currency)}/mån
        </span>
        <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">
          Inkomstscenario: {scenario.incomeMultiplier}%
        </span>
        <span className="rounded bg-orange-50 px-2 py-1 font-medium text-orange-700">
          Utgiftsminskning: {scenario.spendingReductionPercent}%
        </span>
        <button
          onClick={saveSnapshot}
          className="rounded bg-slate-900 px-2 py-1 font-medium text-white hover:bg-slate-800"
        >
          Spara körning
        </button>
      </div>

      {snapshots.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Senaste scenariokörningar</p>
          <ul className="mt-2 space-y-1">
            {snapshots.slice(0, 5).map((entry) => (
              <li key={entry.id} className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                {entry.createdAt} · Inkomst {entry.scenario.incomeMultiplier}% · Utgiftsminskning {entry.scenario.spendingReductionPercent}% · Schock {fmtAmount(entry.scenario.oneTimeShock, currency)} · Pren besparing {fmtAmount(entry.estimatedSubscriptionSavePerMonth, currency)}/mån
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
