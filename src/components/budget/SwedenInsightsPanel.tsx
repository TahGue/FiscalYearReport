"use client";

import {
  buildBenchmarkReport,
  buildMacroIndicators,
  buildPurchasingPowerSnapshot,
  buildRegionalAdvice,
  buildSwitchRecommendations,
  estimateBenefits,
} from "@/lib/swedenInsights";
import type { Transaction } from "@/types/finance";
import type { SwedenSettings } from "@/types/sweden";

interface Props {
  txs: Transaction[];
  currency: string;
  settings: SwedenSettings;
}

function fmt(value: number, currency: string): string {
  return `${value.toFixed(0)} ${currency}`;
}

export default function SwedenInsightsPanel({ txs, currency, settings }: Props) {
  const macro = buildMacroIndicators();
  const purchasingPower = buildPurchasingPowerSnapshot(txs, macro);
  const benefits = estimateBenefits(settings);
  const benchmark = buildBenchmarkReport(txs, settings);
  const switchRecommendations = buildSwitchRecommendations(settings);
  const regionalAdvice = buildRegionalAdvice(settings, macro);

  const totalBenefit = benefits.reduce((sum, benefit) => sum + benefit.monthlyAmount, 0);
  const totalSwitchSaving = switchRecommendations.reduce((sum, item) => sum + item.monthlySaving, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Sverigeinsikter</h3>
          <p className="mt-1 text-sm text-slate-500">Bidrag, inflation, riktmärken och lokala rekommendationer i en vy.</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wide text-blue-700">Potentiellt månadsutrymme</div>
          <div className="text-lg font-semibold text-blue-900">{fmt(totalBenefit + totalSwitchSaving, currency)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Makroläge</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>KPI (årstakt): {macro.cpiYoY.toFixed(1)}%</li>
            <li>Styrränta: {macro.repoRate.toFixed(2)}%</li>
            <li>Snitt bolåneränta: {macro.mortgageRateAvg.toFixed(2)}%</li>
            <li>Real köpkraftserosion: {purchasingPower.erosionPercent.toFixed(1)}%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Bidragsprognos</h4>
          <p className="mt-1 text-xs text-slate-500">Förenklade uppskattningar. Verifiera alltid med officiella beslutsunderlag.</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {benefits.map((benefit) => (
              <li key={benefit.type} className="flex items-center justify-between gap-2">
                <span>{benefit.label}</span>
                <span className="font-medium">{fmt(benefit.monthlyAmount, currency)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-semibold text-emerald-700">Total estimat: {fmt(totalBenefit, currency)} / månad</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Riktmärken (svenska hushållsnormer)</h4>
          <p className="mt-1 text-xs text-slate-500">
            Jämförelse mot schablonprofil ({settings.profile.familyType}, {settings.profile.housingType}, {settings.profile.regionType}).
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {benchmark.categories.map((row) => (
              <li key={row.category} className="flex items-center justify-between gap-2">
                <span>{row.category}</span>
                <span className={row.status === "above" ? "text-red-600" : row.status === "below" ? "text-emerald-700" : "text-slate-700"}>
                  {row.deltaPercent >= 0 ? "+" : ""}
                  {row.deltaPercent.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Total utgift: {fmt(benchmark.actualTotal, currency)} · Riktmärke: {fmt(benchmark.benchmarkTotal, currency)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Bytesmöjligheter (el/försäkring)</h4>
          {switchRecommendations.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Inga positiva bytesdeltan upptäckta ännu.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {switchRecommendations.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>{item.provider}</span>
                  <span className="font-medium text-emerald-700">+{fmt(item.monthlySaving, currency)}/mån</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm font-semibold text-emerald-700">Total bytesbesparing: {fmt(totalSwitchSaving, currency)} / månad</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
        <h4 className="text-sm font-semibold text-slate-800">Region- och livssituationstips</h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {regionalAdvice.map((item) => (
            <li key={item.id}>
              <span className="font-medium">{item.title}:</span> {item.body}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
