"use client";

import { useMemo, useState } from "react";
import { buildFinancialContext } from "@/lib/aiContext";
import { requestBudgetAdvice } from "@/lib/aiClient";
import type { AISettings, Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  settings: AISettings;
  currency: string;
}

const quickPrompts = [
  "Give me a 3-step plan to save 2,000 SEK this month.",
  "Which subscriptions should I cancel first and why?",
  "Find my highest-risk spending pattern and provide a mitigation plan.",
  "Create a conservative 90-day cashflow stabilization plan.",
];

export default function AIAdvisor({ txs, settings, currency }: Props) {
  const context = useMemo(() => buildFinancialContext(txs, currency), [txs, currency]);
  const [question, setQuestion] = useState(
    "Give me a budget improvement plan for this month with concrete actions.",
  );
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          content: `Financial data summary:\n${context}\n\nUser question: ${question}`,
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
      <button
        onClick={ask}
        disabled={loading || txs.length === 0}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Ask AI"}
      </button>
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
