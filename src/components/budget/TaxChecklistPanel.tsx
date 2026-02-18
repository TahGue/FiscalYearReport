"use client";

import { useMemo, useState } from "react";

interface ChecklistItem {
  id: string;
  label: string;
  details: string;
}

const TAX_CHECKLIST: ChecklistItem[] = [
  {
    id: "commute",
    label: "Reseavdrag bevis",
    details: "Spara kvitton för pendling, passerkort och årliga sammanställningar.",
  },
  {
    id: "interest",
    label: "Räntebesked (årsbesked)",
    details: "Samla årsbesked från långivare för exakta avdragsgilla räntevärden.",
  },
  {
    id: "tools",
    label: "Arbetsverktygsfakturor",
    details: "Dokumentera arbetsnödvändighet och att arbetsgivaren inte ersatt.",
  },
  {
    id: "akassa",
    label: "Fack/A-kassa kontroll",
    details: "Verifiera att automatisk skattereduktion visas i din deklaration.",
  },
  {
    id: "rot-rut",
    label: "ROT/RUT fakturaverifiering",
    details: "Bekräfta att arbetskostnadsavdrag applicerats och visas under Mina Sidor.",
  },
];

export default function TaxChecklistPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const progress = useMemo(() => {
    const done = TAX_CHECKLIST.filter((i) => checked[i.id]).length;
    return { done, total: TAX_CHECKLIST.length, pct: Math.round((done / TAX_CHECKLIST.length) * 100) };
  }, [checked]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Checklista för deklarationsberedskap</h3>
          <p className="text-xs text-slate-500">Spåra beviskvalitet innan du deklarerar hos Skatteverket.</p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {progress.done}/{progress.total} ({progress.pct}%)
        </span>
      </div>

      <ul className="space-y-2">
        {TAX_CHECKLIST.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-200 p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={(e) => setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.details}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
