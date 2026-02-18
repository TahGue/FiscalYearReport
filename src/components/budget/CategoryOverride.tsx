"use client";

import { useState } from "react";
import { ALL_CATEGORIES, saveOverride, type Category } from "@/lib/categorize";
import type { Transaction } from "@/types/finance";

interface Props {
  txs: Transaction[];
  onUpdated: () => void;
}

export default function CategoryOverride({ txs, onUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const unique = Array.from(new Map(txs.map((t) => [t.description, t])).values()).sort((a, b) =>
    a.description.localeCompare(b.description),
  );

  const filtered = search.trim()
    ? unique.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()))
    : unique;

  const handleChange = (description: string, category: Category) => {
    saveOverride(description, category);
    setSaved(description);
    setTimeout(() => setSaved(null), 1200);
    onUpdated();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">Fix categories</h3>
      <input
        type="text"
        placeholder="Search merchant..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {filtered.slice(0, 150).map((t) => (
          <div key={t.description} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-slate-700">{t.description}</span>
            <select
              value={t.category ?? "Other"}
              onChange={(e) => handleChange(t.description, e.target.value as Category)}
              className="shrink-0 rounded border border-slate-300 px-1.5 py-1 text-xs"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {saved === t.description && <span className="shrink-0 text-xs text-green-600">✓</span>}
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-sm text-slate-400">No merchants found.</p>}
      <p className="mt-2 text-xs text-slate-400">Changes are saved locally and applied on next upload.</p>
    </div>
  );
}
