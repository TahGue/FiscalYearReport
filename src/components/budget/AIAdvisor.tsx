"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { buildFinancialContext } from "@/lib/aiContext";
import { requestBudgetAdvice } from "@/lib/aiClient";
import { parseCSVBuffer } from "@/lib/parse";
import type { BufferTargets, BudgetBand } from "@/components/budget/BudgetProvider";
import {
  buildNextBestActions,
  buildSpendingAlerts,
  buildWeeklySummary,
  classifyCategoryPatterns,
  findSavingsOpportunities,
} from "@/lib/roadmapInsights";
import { buildFiscalComparison, buildFiscalComparisonContext, type FiscalComparisonMode } from "@/lib/fiscalComparison";
import type { AISettings, Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  settings: AISettings;
  currency: string;
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
}

const quickPrompts = [
  "Ge mig en 3-stegsplan för att spara 2 000 kr denna månad.",
  "Vilka prenumerationer bör jag avsluta först och varför?",
  "Hitta mitt högriskiga utgiftstänkande och ge en plan för att minska risken.",
  "Skapa en konservativ 90-dagars plan för att stabilisera kassaflödet.",
  "Förklara månad för månad varför detta räkenskapsår ändrades jämfört med förra.",
];

function fmtSigned(value: number, currency: string) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)} ${currency}`;
}

export default function AIAdvisor({ txs, settings, currency, budgetBands, bufferTargets }: Props) {
  const context = useMemo(() => buildFinancialContext(txs, currency), [txs, currency]);
  const weeklySummary = useMemo(() => buildWeeklySummary(txs, currency), [txs, currency]);
  const explainableActions = useMemo(() => {
    const patterns = classifyCategoryPatterns(txs);
    const opportunities = findSavingsOpportunities(txs, patterns);
    const alerts = buildSpendingAlerts(txs, patterns, budgetBands, bufferTargets);
    return buildNextBestActions(opportunities, alerts);
  }, [txs, budgetBands, bufferTargets]);
  const [question, setQuestion] = useState(
    "Ge mig en budgetförbättringsplan för denna månad med konkreta åtgärder.",
  );
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<FiscalComparisonMode>("different_year");
  const [baseReportTxs, setBaseReportTxs] = useState<Transaction[]>([]);
  const [compareReportTxs, setCompareReportTxs] = useState<Transaction[]>([]);
  const [baseReportName, setBaseReportName] = useState("");
  const [compareReportName, setCompareReportName] = useState("");
  const [baseReportStatus, setBaseReportStatus] = useState("");
  const [compareReportStatus, setCompareReportStatus] = useState("");

  const fiscalComparison = useMemo(
    () => buildFiscalComparison(baseReportTxs, compareReportTxs, comparisonMode),
    [baseReportTxs, compareReportTxs, comparisonMode],
  );

  const fiscalComparisonContext = useMemo(() => {
    if (!fiscalComparison) return "No fiscal year comparison uploaded.";
    return buildFiscalComparisonContext(fiscalComparison, currency);
  }, [fiscalComparison, currency]);

  const parseFiscalReport = async (
    event: ChangeEvent<HTMLInputElement>,
    setTxs: (next: Transaction[]) => void,
    setName: (name: string) => void,
    setStatus: (status: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("Analyserar rapport...");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCSVBuffer(new Uint8Array(buffer));
      setTxs(parsed.transactions);
      setName(file.name);
      setStatus(`Laddade ${parsed.transactions.length} transaktioner från ${file.name}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Kunde inte läsa rapporten");
    } finally {
      event.target.value = "";
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    try {
      const recentHistory = history.slice(-6);
      const result = await requestBudgetAdvice(settings, [
        {
          role: "system",
          content: `Du är en privat budgetrådgivare. Användarens transaktioner är i ${currency}. Ge koncis, handlingsbar finansiell vägledning med riskanteckningar. Gör aldrig anspråk på visshet och undvik juridisk/skatteåtgärd. Förklara alltid beräkningar och antaganden. Föredra numrerade åtgärder med förväntad besparingseffekt.`,
        },
        ...recentHistory.map((entry) => ({ role: entry.role, content: entry.content })),
        {
          role: "user",
          content: `Financial data summary:\n${context}\n\nWeekly summary:\n${weeklySummary}\n\nFiscal comparison:\n${fiscalComparisonContext}\n\nNext best actions:\n${explainableActions
            .map((action, index) => `${index + 1}. ${action.title} (${action.expectedMonthlyImpact.toFixed(0)} monthly impact) - ${action.explainability}`)
            .join("\n")}\n\nUser question: ${question}`,
        },
      ]);
      setAnswer(result);
      setHistory((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: result }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to contact model");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">AI Budgetrådgivning</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setQuestion(prompt)}
            className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
          >
            {prompt}
          </button>
        ))}
      </div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600" htmlFor="comparison-mode">
            <span className="mb-1 block font-medium text-slate-700">Jämförelseläge</span>
            <select
              id="comparison-mode"
              value={comparisonMode}
              onChange={(event) => setComparisonMode(event.target.value as FiscalComparisonMode)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="same_year">Samma räkenskapsår (månad vs månad)</option>
              <option value="different_year">Olika räkenskapsår (år över år)</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-2">
            <label className="text-xs font-medium text-slate-700" htmlFor="base-fiscal-report">
              Referensrapport
            </label>
            <input
              id="base-fiscal-report"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => parseFiscalReport(event, setBaseReportTxs, setBaseReportName, setBaseReportStatus)}
              className="mt-2 block w-full cursor-pointer rounded border border-slate-300 bg-white p-2 text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-slate-900 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
            />
            {baseReportName && <p className="mt-1 text-xs text-slate-500">Rapport: {baseReportName}</p>}
            {baseReportStatus && <p className="mt-1 text-xs text-slate-600">{baseReportStatus}</p>}
          </div>

          <div className="rounded border border-slate-200 bg-white p-2">
            <label className="text-xs font-medium text-slate-700" htmlFor="compare-fiscal-report">
              Jämförelserapport
            </label>
            <input
              id="compare-fiscal-report"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => parseFiscalReport(event, setCompareReportTxs, setCompareReportName, setCompareReportStatus)}
              className="mt-2 block w-full cursor-pointer rounded border border-slate-300 bg-white p-2 text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-emerald-700 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
            />
            {compareReportName && <p className="mt-1 text-xs text-slate-500">Rapport: {compareReportName}</p>}
            {compareReportStatus && <p className="mt-1 text-xs text-slate-600">{compareReportStatus}</p>}
          </div>
        </div>

        {fiscalComparison && (
          <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white p-2">
            <p className="text-xs font-medium text-slate-700">
              Månatliga delta ({fiscalComparison.baseLabel} → {fiscalComparison.compareLabel})
            </p>
            <table className="mt-2 min-w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1">Månad</th>
                  <th className="px-2 py-1">Inkomst Δ</th>
                  <th className="px-2 py-1">Utgift Δ</th>
                  <th className="px-2 py-1">Netto Δ</th>
                  <th className="px-2 py-1">Huvudsaklig orsak</th>
                </tr>
              </thead>
              <tbody>
                {fiscalComparison.rows.map((row) => (
                  <tr key={row.month} className="border-t border-slate-100 text-slate-700">
                    <td className="px-2 py-1 font-medium">{row.monthLabel}</td>
                    <td className="px-2 py-1">{fmtSigned(row.deltaIncome, currency)}</td>
                    <td className="px-2 py-1">{fmtSigned(row.deltaSpending, currency)}</td>
                    <td className="px-2 py-1">{fmtSigned(row.deltaNet, currency)}</td>
                    <td className="px-2 py-1">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <button
        onClick={ask}
        disabled={loading || txs.length === 0}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyserar..." : "Fråga AI"}
      </button>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Veckosammanfattning</p>
        <p className="mt-1 text-xs text-slate-600">{weeklySummary}</p>
        {explainableActions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {explainableActions.map((action) => (
              <li key={action.id} className="rounded bg-white px-2 py-1 text-xs text-slate-700">
                <span className="font-medium">{action.title}:</span> {action.explainability}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {answer && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {answer}
        </div>
      )}
      {history.length > 0 && (
        <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Konversationsminne (lokalt)</summary>
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {history.slice(-8).map((entry, i) => (
              <li key={`${entry.role}-${i}`}>
                <span className="font-semibold">{entry.role}:</span> {entry.content}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-3 text-xs text-slate-500">
        För Ollama, se till att servern körs och att en modell är nedladdad först.
      </p>
    </div>
  );
}
