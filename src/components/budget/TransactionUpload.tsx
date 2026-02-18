"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { parseCSVBuffer } from "@/lib/parse";
import type { ParseResult } from "@/types/finance";

interface Props {
  onParsed: (result: ParseResult) => void;
}

export default function TransactionUpload({ onParsed }: Props) {
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setStatus("Parsing transactions...");
    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      const parsed = buffers.map((buf) => parseCSVBuffer(new Uint8Array(buf)));
      const merged: ParseResult = {
        transactions: parsed.flatMap((r) => r.transactions),
        currency: parsed[0]?.currency ?? "SEK",
      };
      onParsed(merged);
      setStatus(`Loaded ${merged.transactions.length} transactions from ${files.length} file(s).`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Upload bank transactions (CSV)</h2>
      <p className="mt-1 text-sm text-slate-500">No data leaves your browser. Processed locally.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        multiple
        className="mt-3 block w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
      />
      {status && (
        <p className="mt-2 text-sm text-slate-600" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
