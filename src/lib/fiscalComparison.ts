import type { Transaction } from "@/types/finance";

export type FiscalComparisonMode = "same_year" | "different_year";

interface MonthlyTotals {
  income: number;
  spending: number;
  net: number;
}

export interface FiscalComparisonRow {
  month: number;
  monthLabel: string;
  base: MonthlyTotals;
  compare: MonthlyTotals;
  deltaIncome: number;
  deltaSpending: number;
  deltaNet: number;
  reason: string;
}

export interface FiscalComparisonResult {
  mode: FiscalComparisonMode;
  baseLabel: string;
  compareLabel: string;
  rows: FiscalComparisonRow[];
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export function buildFiscalComparison(
  baseTxs: Transaction[],
  compareTxs: Transaction[],
  mode: FiscalComparisonMode,
): FiscalComparisonResult | null {
  if (baseTxs.length === 0 || compareTxs.length === 0) return null;

  const baseYear = pickDominantYear(baseTxs);
  const compareYear = pickDominantYear(compareTxs);
  if (!baseYear || !compareYear) return null;

  const sameYear = mode === "same_year";
  const effectiveBaseYear = sameYear
    ? pickSharedOrFallbackYear(baseTxs, compareTxs, baseYear, compareYear)
    : baseYear;
  const effectiveCompareYear = sameYear ? effectiveBaseYear : compareYear;

  const baseTotals = aggregateByMonth(baseTxs, effectiveBaseYear);
  const compareTotals = aggregateByMonth(compareTxs, effectiveCompareYear);

  const rows: FiscalComparisonRow[] = [];
  for (let month = 1; month <= 12; month++) {
    const base = baseTotals.get(month) ?? { income: 0, spending: 0, net: 0 };
    const compare = compareTotals.get(month) ?? { income: 0, spending: 0, net: 0 };
    if (base.income === 0 && base.spending === 0 && compare.income === 0 && compare.spending === 0) {
      continue;
    }

    const baseMonthTxs = filterByMonth(baseTxs, month, effectiveBaseYear);
    const compareMonthTxs = filterByMonth(compareTxs, month, effectiveCompareYear);

    rows.push({
      month,
      monthLabel: MONTH_LABELS[month - 1],
      base,
      compare,
      deltaIncome: compare.income - base.income,
      deltaSpending: compare.spending - base.spending,
      deltaNet: compare.net - base.net,
      reason: inferPrimaryReason(baseMonthTxs, compareMonthTxs),
    });
  }

  if (rows.length === 0) return null;

  const baseLabel = `${effectiveBaseYear}`;
  const compareLabel = `${effectiveCompareYear}`;

  return {
    mode,
    baseLabel,
    compareLabel,
    rows,
  };
}

export function buildFiscalComparisonContext(result: FiscalComparisonResult, currency: string): string {
  const totalDeltaNet = result.rows.reduce((sum, row) => sum + row.deltaNet, 0);
  const strongestUp = result.rows.slice().sort((a, b) => b.deltaNet - a.deltaNet)[0];
  const strongestDown = result.rows.slice().sort((a, b) => a.deltaNet - b.deltaNet)[0];

  const lines = [
    `Fiscal comparison mode: ${result.mode === "same_year" ? "same fiscal year" : "different fiscal years"}`,
    `Reference period label: ${result.baseLabel}`,
    `Comparison period label: ${result.compareLabel}`,
    `Total net delta over compared months: ${signed(totalDeltaNet)} ${currency}`,
  ];

  if (strongestUp) {
    lines.push(
      `Best month delta: ${strongestUp.monthLabel} ${signed(strongestUp.deltaNet)} ${currency} (reason: ${strongestUp.reason})`,
    );
  }
  if (strongestDown) {
    lines.push(
      `Worst month delta: ${strongestDown.monthLabel} ${signed(strongestDown.deltaNet)} ${currency} (reason: ${strongestDown.reason})`,
    );
  }

  lines.push(
    "Month-by-month deltas:",
    ...result.rows.map(
      (row) =>
        `${row.monthLabel}: net ${signed(row.deltaNet)} ${currency}, income ${signed(row.deltaIncome)} ${currency}, spending ${signed(row.deltaSpending)} ${currency}. Driver: ${row.reason}`,
    ),
  );

  return lines.join("\n");
}

function aggregateByMonth(txs: Transaction[], year: number): Map<number, MonthlyTotals> {
  const totals = new Map<number, MonthlyTotals>();
  for (const tx of txs) {
    const parsed = parseYearMonth(tx.date);
    if (!parsed || parsed.year !== year) continue;
    const current = totals.get(parsed.month) ?? { income: 0, spending: 0, net: 0 };
    if (tx.amount >= 0) {
      current.income += tx.amount;
    } else {
      current.spending += Math.abs(tx.amount);
    }
    current.net += tx.amount;
    totals.set(parsed.month, current);
  }
  return totals;
}

function filterByMonth(txs: Transaction[], month: number, year: number): Transaction[] {
  return txs.filter((tx) => {
    const parsed = parseYearMonth(tx.date);
    return Boolean(parsed && parsed.month === month && parsed.year === year);
  });
}

function parseYearMonth(date: string): { year: number; month: number } | null {
  const match = date.match(/^(\d{4})-(\d{2})-/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

function pickDominantYear(txs: Transaction[]): number | null {
  const yearCounts = new Map<number, number>();
  for (const tx of txs) {
    const parsed = parseYearMonth(tx.date);
    if (!parsed) continue;
    yearCounts.set(parsed.year, (yearCounts.get(parsed.year) ?? 0) + 1);
  }
  const sorted = Array.from(yearCounts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function pickSharedOrFallbackYear(
  baseTxs: Transaction[],
  compareTxs: Transaction[],
  baseYear: number,
  compareYear: number,
): number {
  const baseYears = new Set(baseTxs.map((tx) => parseYearMonth(tx.date)?.year).filter((year): year is number => Boolean(year)));
  const compareYears = new Set(compareTxs.map((tx) => parseYearMonth(tx.date)?.year).filter((year): year is number => Boolean(year)));
  const shared = Array.from(baseYears).filter((year) => compareYears.has(year));
  if (shared.length > 0) return shared.sort((a, b) => b - a)[0];
  return baseYear === compareYear ? baseYear : Math.max(baseYear, compareYear);
}

function inferPrimaryReason(baseMonthTxs: Transaction[], compareMonthTxs: Transaction[]): string {
  const categoryDelta = topDelta(baseMonthTxs, compareMonthTxs, (tx) => tx.category || "Övrigt");
  const merchantDelta = topDelta(baseMonthTxs, compareMonthTxs, (tx) => tx.description || "Okänd");

  if (categoryDelta && Math.abs(categoryDelta.delta) > 0) {
    const direction = categoryDelta.delta > 0 ? "ökade" : "minskade";
    return `${categoryDelta.key} ${direction} mest`;
  }
  if (merchantDelta && Math.abs(merchantDelta.delta) > 0) {
    const direction = merchantDelta.delta > 0 ? "ökade" : "minskade";
    return `${merchantDelta.key} ${direction} mest`;
  }
  return "Ingen tydlig förändringsdrivare";
}

function topDelta(
  base: Transaction[],
  compare: Transaction[],
  keySelector: (tx: Transaction) => string,
): { key: string; delta: number } | null {
  const baseMap = collectSpendBy(base, keySelector);
  const compareMap = collectSpendBy(compare, keySelector);
  const keys = new Set<string>([...baseMap.keys(), ...compareMap.keys()]);

  let best: { key: string; delta: number } | null = null;
  for (const key of keys) {
    const delta = (compareMap.get(key) ?? 0) - (baseMap.get(key) ?? 0);
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { key, delta };
    }
  }
  return best;
}

function collectSpendBy(txs: Transaction[], keySelector: (tx: Transaction) => string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const key = keySelector(tx).trim();
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.amount));
  }
  return totals;
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}`;
}
