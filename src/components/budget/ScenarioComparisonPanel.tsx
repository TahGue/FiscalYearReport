"use client";

import { basicInsights } from "@/lib/analyze";
import { buildForecast, computeHealthScore, detectSubscriptions, projectGoals, type BudgetGoal } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

interface Props {
  baseTxs: Transaction[];
  simulatedTxs: Transaction[];
  goals: BudgetGoal[];
  currency: string;
}

function fmtDelta(value: number, currency: string, positiveGood = true): string {
  const sign = value >= 0 ? "+" : "";
  const suffix = ` ${currency}`;
  const absText = `${sign}${value.toFixed(0)}${suffix}`;
  if (value === 0) return `${absText} (ingen förändring)`;
  const good = positiveGood ? value > 0 : value < 0;
  return `${absText} (${good ? "förbättrad" : "försämrad"})`;
}

export default function ScenarioComparisonPanel({ baseTxs, simulatedTxs, goals, currency }: Props) {
  const baseInsights = basicInsights(baseTxs);
  const simInsights = basicInsights(simulatedTxs);
  const netDelta = simInsights.net - baseInsights.net;

  const baseForecast = buildForecast(baseTxs);
  const simForecast = buildForecast(simulatedTxs);
  const forecast90Delta = simForecast.in90 - baseForecast.in90;

  const baseHealth = computeHealthScore(baseTxs, detectSubscriptions(baseTxs));
  const simHealth = computeHealthScore(simulatedTxs, detectSubscriptions(simulatedTxs));
  const healthDelta = simHealth.score - baseHealth.score;

  const baseOnTrack = projectGoals(goals, baseTxs).filter((g) => g.onTrack).length;
  const simOnTrack = projectGoals(goals, simulatedTxs).filter((g) => g.onTrack).length;
  const goalsDelta = simOnTrack - baseOnTrack;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Scenariopåverkan (Bas vs What-If)</h3>
          <p className="text-xs text-slate-500">Direkt delta baserat på dina aktuella scenariovärden.</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DeltaCard label="Månadsnetto" value={fmtDelta(netDelta, currency, true)} tone={netDelta >= 0 ? "good" : "bad"} />
        <DeltaCard
          label="90-d prognos"
          value={fmtDelta(forecast90Delta, currency, true)}
          tone={forecast90Delta >= 0 ? "good" : "bad"}
        />
        <DeltaCard
          label="Hälsopoäng"
          value={`${healthDelta >= 0 ? "+" : ""}${healthDelta.toFixed(0)} p`}
          tone={healthDelta >= 0 ? "good" : "bad"}
        />
        <DeltaCard
          label="Mål på rätt spår"
          value={`${goalsDelta >= 0 ? "+" : ""}${goalsDelta} mål`}
          tone={goalsDelta >= 0 ? "good" : "bad"}
        />
      </div>
    </div>
  );
}

function DeltaCard({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" }) {
  const toneClass = tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50";
  const textClass = tone === "good" ? "text-emerald-700" : "text-red-700";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${textClass}`}>{value}</p>
    </div>
  );
}
