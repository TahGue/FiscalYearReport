"use client";

import type { Transaction } from "@/types/finance";
import type { ContributionModel } from "@/components/budget/BudgetProvider";
import { calculateContributionBreakdown } from "@/lib/roadmapInsights";

interface Props {
  selfTxs: Transaction[];
  partnerTxs: Transaction[];
  contributionModel: ContributionModel;
  currency: string;
}

interface CategorySplit {
  category: string;
  selfAmount: number;
  partnerAmount: number;
  householdAmount: number;
  selfShare: number;
  partnerShare: number;
  householdShare: number;
  shareGap: number;
}

function formatAmount(value: number, currency: string): string {
  return `${value.toFixed(0)} ${currency}`;
}

function collectSpendByCategory(txs: Transaction[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const category = tx.category ?? "Other";
    out.set(category, (out.get(category) ?? 0) + Math.abs(tx.amount));
  }
  return out;
}

function buildCategoryRows(selfTxs: Transaction[], partnerTxs: Transaction[]): CategorySplit[] {
  const selfMap = collectSpendByCategory(selfTxs);
  const partnerMap = collectSpendByCategory(partnerTxs);

  const selfTotal = Array.from(selfMap.values()).reduce((sum, value) => sum + value, 0);
  const partnerTotal = Array.from(partnerMap.values()).reduce((sum, value) => sum + value, 0);
  const householdTotal = selfTotal + partnerTotal;

  const categories = new Set([...selfMap.keys(), ...partnerMap.keys()]);

  return Array.from(categories)
    .map((category) => {
      const selfAmount = selfMap.get(category) ?? 0;
      const partnerAmount = partnerMap.get(category) ?? 0;
      const householdAmount = selfAmount + partnerAmount;
      const selfShare = selfTotal > 0 ? selfAmount / selfTotal : 0;
      const partnerShare = partnerTotal > 0 ? partnerAmount / partnerTotal : 0;
      const householdShare = householdTotal > 0 ? householdAmount / householdTotal : 0;
      const shareGap = Math.abs(selfShare - partnerShare);

      return {
        category,
        selfAmount,
        partnerAmount,
        householdAmount,
        selfShare,
        partnerShare,
        householdShare,
        shareGap,
      };
    })
    .sort((a, b) => b.householdAmount - a.householdAmount);
}

function calculateAlignmentScore(rows: CategorySplit[]): number {
  if (rows.length === 0) return 0;
  const diffSum = rows.reduce((sum, row) => sum + row.shareGap, 0);
  const normalized = Math.min(1, diffSum / 2);
  return Math.max(0, 100 - normalized * 100);
}

export default function ConjointAnalysisPanel({ selfTxs, partnerTxs, contributionModel, currency }: Props) {
  const rows = buildCategoryRows(selfTxs, partnerTxs);

  const selfIncome = selfTxs.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const partnerIncome = partnerTxs.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const contribution = calculateContributionBreakdown(selfIncome, partnerIncome, contributionModel);

  const householdSpend = rows.reduce((sum, row) => sum + row.householdAmount, 0);
  const alignmentScore = calculateAlignmentScore(rows);

  const alignedPriorities = rows
    .filter((row) => row.householdShare >= 0.12 && row.shareGap <= 0.08)
    .slice(0, 3);

  const divergenceHotspots = rows
    .filter((row) => row.shareGap >= 0.12)
    .sort((a, b) => b.shareGap - a.shareGap)
    .slice(0, 3);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Gemensam analys</h3>
          <p className="mt-1 text-sm text-slate-500">
            Jämför utgiftsbeteende mellan dig och din partner för att anpassa hushållsbeslut.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wide text-emerald-700">Anpassningspoäng</div>
          <div className="text-xl font-bold text-emerald-800">{alignmentScore.toFixed(0)}%</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Hushållsutgifter</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{formatAmount(householdSpend, currency)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Dina transaktioner</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{selfTxs.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Partners transaktioner</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{partnerTxs.length}</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Föreslaget delat kostnadsbidrag ({contributionModel.replace("_", " ")})</p>
        <p className="mt-1">
          Jag: {(contribution.selfShare * 100).toFixed(0)}% · Partner: {(contribution.partnerShare * 100).toFixed(0)}%
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Delade prioriteringar</h4>
          {alignedPriorities.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Ingen stark delad kategori ännu. Ladda upp fler månader för bättre signal.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {alignedPriorities.map((row) => (
                <li key={row.category} className="flex items-center justify-between">
                  <span>{row.category}</span>
                  <span className="font-medium">{(row.householdShare * 100).toFixed(0)}% av hushållsutgifterna</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Divergensvarmaste</h4>
          {divergenceHotspots.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Bra balans: ingen större kategoridivergens upptäckt.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {divergenceHotspots.map((row) => (
                <li key={row.category} className="flex items-center justify-between">
                  <span>{row.category}</span>
                  <span className="font-medium">{(row.shareGap * 100).toFixed(0)} pkn differens</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Jag</th>
              <th className="px-3 py-2">Partner</th>
              <th className="px-3 py-2">Hushåll</th>
              <th className="px-3 py-2">Differens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {rows.slice(0, 8).map((row) => (
              <tr key={row.category}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.category}</td>
                <td className="px-3 py-2">
                  {formatAmount(row.selfAmount, currency)} <span className="text-slate-400">({(row.selfShare * 100).toFixed(0)}%)</span>
                </td>
                <td className="px-3 py-2">
                  {formatAmount(row.partnerAmount, currency)} <span className="text-slate-400">({(row.partnerShare * 100).toFixed(0)}%)</span>
                </td>
                <td className="px-3 py-2 font-medium">{formatAmount(row.householdAmount, currency)}</td>
                <td className="px-3 py-2">{(row.shareGap * 100).toFixed(0)} pkn</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
