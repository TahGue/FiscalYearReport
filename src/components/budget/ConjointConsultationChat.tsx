"use client";

import { useMemo, useState } from "react";
import { buildConjointFinancialContext } from "@/lib/aiContext";
import { requestBudgetAdvice } from "@/lib/aiClient";
import { analyzeConjointInterconnection } from "@/lib/conjointInsights";
import type { AISettings, Transaction } from "@/types/finance";

interface Props {
  selfTxs: Transaction[];
  partnerTxs: Transaction[];
  settings: AISettings;
  currency: string;
}

const quickPrompts = [
  "Analysera våra transferflöden och föreslå rättvis utjämning varje månad.",
  "Var är vi ekonomiskt mest beroende av varandra och hur minskar vi risk?",
  "Skapa en gemensam plan för boende, mat och transport med tydlig ansvarsfördelning.",
  "Föreslå veckovisa check-ins för att undvika konflikter kring pengar.",
];

export default function ConjointConsultationChat({ selfTxs, partnerTxs, settings, currency }: Props) {
  const [question, setQuestion] = useState("Ge oss en gemensam ekonomiplan baserat på våra transferflöden och konsumtionsmönster.");
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasPartnerData = partnerTxs.length > 0;
  const conjointContext = useMemo(
    () => buildConjointFinancialContext(selfTxs, partnerTxs, currency),
    [selfTxs, partnerTxs, currency],
  );
  const interconnection = useMemo(
    () => analyzeConjointInterconnection(selfTxs, partnerTxs),
    [selfTxs, partnerTxs],
  );

  const ask = async () => {
    if (!question.trim() || !hasPartnerData) return;
    setLoading(true);
    setError("");

    try {
      const result = await requestBudgetAdvice(settings, [
        {
          role: "system",
          content:
            "Du är en gemensam hushållsrådgivare för två partners. Fokusera på rättvis fördelning, transferflöden mellan parter, beroenderisker, konfliktreducering och konkreta överenskommelser. Svara kort, handlingsbart, numrerat och med uppskattad månadsimpact i SEK.",
        },
        ...history.slice(-6),
        {
          role: "user",
          content: `Conjoint context:\n${conjointContext}\n\nInterconnection KPIs:\nSelf->Partner ${interconnection.selfToPartnerMonthly.toFixed(0)} ${currency}/month\nPartner->Self ${interconnection.partnerToSelfMonthly.toFixed(0)} ${currency}/month\nDependency score ${interconnection.transferDependencyScore.toFixed(0)}/100\nShared overlap ${interconnection.sharedCategoryOverlapScore.toFixed(0)}/100\n\nQuestion: ${question}`,
        },
      ]);

      setAnswer(result);
      setHistory((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: result }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte nå AI-modellen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">AI för gemensam konsultation</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fokuserad rådgivning för hur pengar skickas mellan er, ekonomiskt beroende och gemensamma beslut.
      </p>

      {!hasPartnerData && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ladda upp partnertransaktioner för att aktivera gemensam konsultation.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
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
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <button
        onClick={ask}
        disabled={!hasPartnerData || loading}
        className="mt-3 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyserar gemensam ekonomi..." : "Fråga AI om vår gemensamma ekonomi"}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {answer && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {answer}
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Konversationsminne (gemensamt)</summary>
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {history.slice(-8).map((entry, i) => (
              <li key={`${entry.role}-${i}`}>
                <span className="font-semibold">{entry.role}:</span> {entry.content}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
