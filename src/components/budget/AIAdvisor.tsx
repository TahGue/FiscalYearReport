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
  "Give me a 3-step plan to save 2,000 SEK this month.",
  "Which subscriptions should I cancel first and why?",
  "Find my highest-risk spending pattern and provide a mitigation plan.",
  "Create a conservative 90-day cashflow stabilization plan.",
  "Explain month-by-month why this fiscal year changed versus last fiscal year.",
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
    "Give me a budget improvement plan for this month with concrete actions.",
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

    setStatus("Analyzing report...");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCSVBuffer(new Uint8Array(buffer));
      setTxs(parsed.transactions);
      setName(file.name);
      setStatus(`Loaded ${parsed.transactions.length} transactions from ${file.name}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to parse report");
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
          content: `You are a private budget consultant. The user's transactions are in ${currency}. Provide concise, actionable financial guidance with risk notes. Never claim certainty and avoid legal/tax advice. Always explain calculations and assumptions. Prefer numbered actions with expected savings impact.`,
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
      <h2 className="text-base font-semibold text-slate-800">AI Budget Consultation</h2>
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
            <span className="mb-1 block font-medium text-slate-700">Comparison mode</span>
            <select
              id="comparison-mode"
              value={comparisonMode}
              onChange={(event) => setComparisonMode(event.target.value as FiscalComparisonMode)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="same_year">Same fiscal year (month vs month)</option>
              <option value="different_year">Different fiscal years (YoY month comparison)</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-2">
            <label className="text-xs font-medium text-slate-700" htmlFor="base-fiscal-report">
              Reference report
            </label>
            <input
              id="base-fiscal-report"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => parseFiscalReport(event, setBaseReportTxs, setBaseReportName, setBaseReportStatus)}
              className="mt-2 block w-full cursor-pointer rounded border border-slate-300 bg-white p-2 text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-slate-900 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
            />
            {baseReportName && <p className="mt-1 text-xs text-slate-500">Report: {baseReportName}</p>}
            {baseReportStatus && <p className="mt-1 text-xs text-slate-600">{baseReportStatus}</p>}
          </div>

          <div className="rounded border border-slate-200 bg-white p-2">
            <label className="text-xs font-medium text-slate-700" htmlFor="compare-fiscal-report">
              Comparison report
            </label>
            <input
              id="compare-fiscal-report"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => parseFiscalReport(event, setCompareReportTxs, setCompareReportName, setCompareReportStatus)}
              className="mt-2 block w-full cursor-pointer rounded border border-slate-300 bg-white p-2 text-xs text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-emerald-700 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
            />
            {compareReportName && <p className="mt-1 text-xs text-slate-500">Report: {compareReportName}</p>}
            {compareReportStatus && <p className="mt-1 text-xs text-slate-600">{compareReportStatus}</p>}
          </div>
        </div>

        {fiscalComparison && (
          <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white p-2">
            <p className="text-xs font-medium text-slate-700">
              Monthly deltas ({fiscalComparison.baseLabel} → {fiscalComparison.compareLabel})
            </p>
            <table className="mt-2 min-w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1">Month</th>
                  <th className="px-2 py-1">Income Δ</th>
                  <th className="px-2 py-1">Spending Δ</th>
                  <th className="px-2 py-1">Net Δ</th>
                  <th className="px-2 py-1">Primary driver</th>
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
        {loading ? "Analyzing..." : "Ask AI"}
      </button>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Weekly summary</p>
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
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Conversation memory (local)</summary>
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
        For Ollama, make sure the server is running and a model is pulled first.
      </p>
    </div>
  );
}
