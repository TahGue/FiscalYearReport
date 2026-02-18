"use client";

interface Props {
  onDismiss: () => void;
}

const SAMPLE_CSV = `Date,Description,Amount,Currency\n2026-01-03,Salary,32000,SEK\n2026-01-04,ICA,-625,SEK\n2026-01-07,Netflix,-159,SEK\n2026-01-11,SL,-1020,SEK\n`;

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "financial-advisor-sample.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function OnboardingPanel({ onDismiss }: Props) {
  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Välkommen till Financial Advisor</h2>
          <p className="mt-1 text-sm text-slate-600">
            1) Ladda upp din CSV. 2) Ladda vid behov upp partnerns CSV. 3) Granska varningar, sparmöjligheter och veckans åtgärder.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadSample} className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white">
            Ladda ned exempel-CSV
          </button>
          <button onClick={onDismiss} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
