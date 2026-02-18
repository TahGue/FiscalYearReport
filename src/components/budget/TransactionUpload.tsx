"use client";

import { useRef, useState, type ChangeEvent, type RefObject } from "react";
import { parseCSVBuffer } from "@/lib/parse";
import type { ParseResult } from "@/types/finance";

interface Props {
  onParsedSelf: (result: ParseResult) => void;
  onParsedPartner: (result: ParseResult) => void;
}

export default function TransactionUpload({ onParsedSelf, onParsedPartner }: Props) {
  const [selfStatus, setSelfStatus] = useState("");
  const [partnerStatus, setPartnerStatus] = useState("");
  const selfInputRef = useRef<HTMLInputElement | null>(null);
  const partnerInputRef = useRef<HTMLInputElement | null>(null);

  const parseFiles = async (
    e: ChangeEvent<HTMLInputElement>,
    owner: "self" | "partner",
    setStatus: (next: string) => void,
    onParsed: (result: ParseResult) => void,
    inputRef: RefObject<HTMLInputElement | null>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setStatus(owner === "self" ? "Parsing your transactions..." : "Parsing partner transactions...");
    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      const parsed = buffers.map((buf) => parseCSVBuffer(new Uint8Array(buf)));
      const merged: ParseResult = {
        transactions: parsed.flatMap((r) => r.transactions),
        currency: parsed[0]?.currency ?? "SEK",
      };
      onParsed(merged);
      setStatus(
        `Loaded ${merged.transactions.length} ${owner === "self" ? "your" : "partner"} transactions from ${files.length} file(s).`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Upload household bank transactions (CSV)</h2>
      <p className="mt-1 text-sm text-slate-500">Add your CSV and your partner&apos;s CSV to enable conjoint analysis.</p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-sm font-medium text-slate-700" htmlFor="self-csv-upload">
            Your transactions
          </label>
          <input
            id="self-csv-upload"
            ref={selfInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => parseFiles(e, "self", setSelfStatus, onParsedSelf, selfInputRef)}
            multiple
            className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
          {selfStatus && (
            <p className="mt-2 text-sm text-slate-600" role="status">
              {selfStatus}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          <label className="text-sm font-medium text-slate-700" htmlFor="partner-csv-upload">
            Partner transactions (optional)
          </label>
          <input
            id="partner-csv-upload"
            ref={partnerInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => parseFiles(e, "partner", setPartnerStatus, onParsedPartner, partnerInputRef)}
            multiple
            className="mt-2 block w-full cursor-pointer rounded-lg border border-emerald-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
          {partnerStatus && (
            <p className="mt-2 text-sm text-slate-600" role="status">
              {partnerStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
