import Papa from "papaparse";
import { categorize } from "@/lib/categorize";
import type { ParseResult, Transaction } from "@/types/finance";

type Field =
  | "date"
  | "date2"
  | "description"
  | "amount"
  | "debit"
  | "credit"
  | "type"
  | "account"
  | "category"
  | "currency"
  | "balance";

const HEADER_ALIASES: Record<string, Field> = {
  date: "date",
  datum: "date",
  bokforingsdag: "date",
  bokforingsdatum: "date",
  posted: "date",
  bookingdate: "date",
  valuedate: "date",
  transaktionsdag: "date2",
  transaktionsdatum: "date2",
  transactiondate: "date2",
  transactionday: "date2",
  description: "description",
  text: "description",
  beskrivning: "description",
  beskr: "description",
  descriptiontext: "description",
  verwendungszweck: "description",
  memo: "description",
  payee: "description",
  mottagare: "description",
  name: "description",
  referens: "description",
  amount: "amount",
  belopp: "amount",
  betrag: "amount",
  value: "amount",
  auftragswert: "amount",
  debit: "debit",
  withdrawal: "debit",
  lastschrift: "debit",
  ut: "debit",
  credit: "credit",
  deposit: "credit",
  gutschrift: "credit",
  in: "credit",
  type: "type",
  transactiontype: "type",
  art: "type",
  produkt: "type",
  account: "account",
  konto: "account",
  kontonummer: "account",
  category: "category",
  kategorie: "category",
  currency: "currency",
  valuta: "currency",
  wahrung: "currency",
  balance: "balance",
  bokfortsaldo: "balance",
  saldo: "balance",
  runningbalance: "balance",
};

const POSSIBLE_DELIMITERS = [",", ";", "\t", "|"] as const;

const MONTHS: Record<string, number> = {
  jan: 1,
  januari: 1,
  feb: 2,
  februari: 2,
  mar: 3,
  mars: 3,
  apr: 4,
  april: 4,
  maj: 5,
  jun: 6,
  juni: 6,
  jul: 7,
  juli: 7,
  aug: 8,
  augusti: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function parseCSVBuffer(buffer: Uint8Array): ParseResult {
  const text = decodeBuffer(buffer);
  return parseCSV(text);
}

export function parseCSV(text: string): ParseResult {
  const delimiter = detectDelimiter(text);
  const prepared = stripPreface(text, delimiter);
  const usedHeaders = new Map<string, number>();

  const { data } = Papa.parse<Record<string, string>>(prepared, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader(header: string) {
      const normalized = normalizeHeader(header);
      const alias = HEADER_ALIASES[normalized];
      const safeName = alias ?? (normalized || "column");
      const count = usedHeaders.get(safeName) ?? 0;
      usedHeaders.set(safeName, count + 1);
      return count === 0 ? safeName : `${safeName}_${count + 1}`;
    },
    transform(value: string) {
      if (typeof value !== "string") return value;
      return value.trim();
    },
  });

  let detectedCurrency = "SEK";
  const txs: Transaction[] = [];

  for (const row of data) {
    if (!row) continue;
    const amount = parseAmount(row);
    if (amount == null) continue;

    const rowCurrency = getField(row, "currency")?.toUpperCase();
    if (rowCurrency && rowCurrency.length === 3) detectedCurrency = rowCurrency;

    const rawBalance = getField(row, "balance");
    const balance = rawBalance ? toNumber(rawBalance) ?? undefined : undefined;
    const dateRaw = getField(row, "date2") || getField(row, "date") || "";
    const description = normalizeDescription(
      getField(row, "description") ?? getField(row, "type") ?? "Transaction",
    );

    txs.push({
      date: normalizeDate(dateRaw),
      description,
      amount,
      type: amount >= 0 ? "credit" : "debit",
      currency: rowCurrency || undefined,
      account: getField(row, "account")?.trim() || undefined,
      category: getField(row, "category")?.trim() || categorize(description),
      balance,
    });
  }

  return { transactions: txs, currency: detectedCurrency };
}

function detectDelimiter(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 10);
  const counts = POSSIBLE_DELIMITERS.map((d) => ({ delimiter: d, count: 0 }));
  for (const line of lines) {
    for (const entry of counts) {
      entry.count += (line.match(new RegExp(escapeRegex(entry.delimiter), "g")) || []).length;
    }
  }
  const best = counts.sort((a, b) => b.count - a.count)[0];
  return best && best.count > 0 ? best.delimiter : undefined;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getField(row: Record<string, string>, field: Field): string | undefined {
  if (row[field]) return row[field];
  const altKey = Object.keys(row).find((key) => key.startsWith(`${field}_`) && row[key]);
  return altKey ? row[altKey] : undefined;
}

function parseAmount(row: Record<string, string>): number | null {
  const primary = getField(row, "amount");
  let amount = primary ? toNumber(primary) : null;
  if (amount == null) {
    const debit = getField(row, "debit");
    if (debit) {
      const parsed = toNumber(debit);
      if (parsed != null) amount = -Math.abs(parsed);
    }
  }
  if (amount == null) {
    const credit = getField(row, "credit");
    if (credit) {
      const parsed = toNumber(credit);
      if (parsed != null) amount = Math.abs(parsed);
    }
  }
  return amount;
}

function normalizeDescription(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoFirst = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoFirst) {
    return buildDate(isoFirst[1], isoFirst[2], isoFirst[3]);
  }

  const dayFirst = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dayFirst) {
    return buildDate(dayFirst[3], dayFirst[2], dayFirst[1]);
  }

  const textMatch = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/^(\d{1,2})\s+([a-z\u00e5\u00e4\u00f6]+)\s+(\d{2,4})/);

  if (textMatch) {
    const monthNum = MONTHS[textMatch[2]];
    if (monthNum) {
      return buildDate(textMatch[3], String(monthNum), textMatch[1]);
    }
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("-");
  }

  return trimmed;
}

function buildDate(yearRaw: string, monthRaw: string, dayRaw: string): string {
  const year = normalizeYear(Number(yearRaw));
  const month = pad(Number(monthRaw));
  const day = pad(Number(dayRaw));
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function normalizeYear(value: number): number {
  if (value >= 100) return value;
  return value >= 70 ? 1900 + value : 2000 + value;
}

function pad(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return n < 10 ? `0${Math.trunc(n)}` : `${Math.trunc(n)}`;
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const normalized = value
    .replace(/[\s\u00A0]/g, "")
    .replace(/(,)(?=\d{2}(\D|$))/g, ".")
    .replace(/[^0-9+\-.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function escapeRegex(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripPreface(text: string, delimiter: string | undefined): string {
  const lines = text.split(/\r?\n/);
  const delim = delimiter ?? guessDelimiterFromContent(lines) ?? ",";
  const headerIndex = lines.findIndex((line) => isLikelyHeader(line, delim));
  if (headerIndex <= 0) return text;
  return lines.slice(headerIndex).join("\n");
}

function guessDelimiterFromContent(lines: string[]): string | undefined {
  const joined = lines.slice(0, 5).join("\n");
  let best: { delimiter: string; count: number } | null = null;
  for (const d of POSSIBLE_DELIMITERS) {
    const count = (joined.match(new RegExp(escapeRegex(d), "g")) || []).length;
    if (!best || count > best.count) best = { delimiter: d, count };
  }
  return best && best.count > 0 ? best.delimiter : undefined;
}

function isLikelyHeader(line: string, delimiter: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const sepCount = (trimmed.match(new RegExp(escapeRegex(delimiter), "g")) || []).length;
  if (sepCount < 2) return false;
  const lower = trimmed.toLowerCase();
  if (/date|datum|transaction|radnummer|amount|belopp|description|beskrivning/.test(lower)) {
    return true;
  }
  const cellCount = trimmed.split(delimiter).length;
  return cellCount >= 4;
}

function decodeBuffer(buffer: Uint8Array): string {
  if (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    if (b0 === 0xff && b1 === 0xfe) return new TextDecoder("utf-16le").decode(buffer.slice(2));
    if (b0 === 0xfe && b1 === 0xff) return new TextDecoder("utf-16be").decode(buffer.slice(2));
    if (b0 === 0xef && b1 === 0xbb && buffer[2] === 0xbf) {
      return new TextDecoder("utf-8").decode(buffer.slice(3));
    }
  }

  if (looksLikeWindows1252(buffer)) {
    try {
      return new TextDecoder("windows-1252").decode(buffer);
    } catch {
      // no-op
    }
  }

  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const replacementRate = (utf8.match(/\uFFFD/g)?.length ?? 0) / Math.max(utf8.length, 1);
  if (replacementRate < 0.01) return utf8;

  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch {
    return utf8;
  }
}

function looksLikeWindows1252(buffer: Uint8Array): boolean {
  let win1252Bytes = 0;
  let highBytes = 0;
  for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
    const b = buffer[i];
    if (b >= 0x80 && b <= 0x9f) {
      win1252Bytes++;
    } else if (b >= 0x80) {
      highBytes++;
    }
  }
  if (win1252Bytes > 0) return true;
  if (highBytes === 0) return false;

  const sample = buffer.slice(0, Math.min(buffer.length, 4096));
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return false;
  } catch {
    return true;
  }
}
