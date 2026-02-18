import type { Anomaly, Transaction } from "@/types/finance";

export interface RecurringSeries {
  merchant: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
  transactions: Transaction[];
  regularityScore: number;
}

export type AnomalySeverity = "low" | "medium" | "high";

export interface EnhancedAnomaly extends Anomaly {
  severity: AnomalySeverity;
  merchantAvg?: number;
  multiplier?: number;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function std(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function normKey(desc: string): string {
  return desc.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30);
}

export function detectAnomalies(txs: Transaction[]): EnhancedAnomaly[] {
  const debits = txs.filter((t) => t.amount < 0);
  const amounts = debits.map((t) => Math.abs(t.amount));
  const globalMean = mean(amounts);
  const globalStd = std(amounts, globalMean) || 1;

  const byMerchant = new Map<string, number[]>();
  for (const t of debits) {
    const key = normKey(t.description);
    const list = byMerchant.get(key) ?? [];
    list.push(Math.abs(t.amount));
    byMerchant.set(key, list);
  }

  const out: EnhancedAnomaly[] = [];
  const seen = new Set<string>();

  debits.forEach((t, i) => {
    const abs = Math.abs(t.amount);
    const globalZ = (abs - globalMean) / globalStd;
    const key = normKey(t.description);
    const merchantAmounts = byMerchant.get(key) ?? [];
    const merchantMean = mean(merchantAmounts);
    const merchantStd = std(merchantAmounts, merchantMean) || 1;
    const merchantZ = merchantAmounts.length >= 3 ? (abs - merchantMean) / merchantStd : null;
    const multiplier = merchantMean > 0 ? abs / merchantMean : null;

    const dupKey = `${key}|${abs}|${t.date}`;
    const isDuplicate = seen.has(dupKey);
    seen.add(dupKey);

    let reason = "";
    let severity: AnomalySeverity = "low";

    if (isDuplicate) {
      reason = "Possible duplicate charge";
      severity = "high";
    } else if (merchantZ !== null && merchantZ > 2.5) {
      const mult = multiplier?.toFixed(1) ?? "?";
      reason = `${mult}× your usual ${t.description} spend`;
      severity = merchantZ > 4 ? "high" : "medium";
    } else if (globalZ > 3.5) {
      reason = "Very large debit (top 0.1% of all transactions)";
      severity = "high";
    } else if (globalZ > 2.5) {
      reason = `Unusually large debit (z=${globalZ.toFixed(1)})`;
      severity = "medium";
    } else if (multiplier !== null && multiplier > 5 && merchantAmounts.length >= 2) {
      reason = `${multiplier.toFixed(1)}× your usual spend here`;
      severity = "medium";
    }

    if (reason) {
      out.push({
        index: i,
        reason,
        severity,
        amount: t.amount,
        description: t.description,
        date: t.date,
        merchantAvg: merchantMean > 0 ? merchantMean : undefined,
        multiplier: multiplier ?? undefined,
      });
    }
  });

  return out.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

export function balanceSeries(txs: Transaction[]): Array<{ date: string; balance: number }> {
  let bal = 0;
  return txs
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => {
      bal += t.amount;
      return { date: t.date, balance: bal };
    });
}

export function basicInsights(txs: Transaction[]) {
  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spend = txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const net = income + spend;

  const byMerchant = new Map<string, number>();
  for (const t of txs) {
    if (t.amount < 0) {
      byMerchant.set(t.description, (byMerchant.get(t.description) || 0) + Math.abs(t.amount));
    }
  }
  const topMerchants = Array.from(byMerchant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { income, spend: Math.abs(spend), net, topMerchants };
}

export function detectRecurring(txs: Transaction[]): RecurringSeries[] {
  const debits = txs.filter((t) => t.amount < 0);
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of debits) {
    const key = normalizeMerchant(t.description);
    if (!key) continue;
    const list = byMerchant.get(key) ?? [];
    list.push(t);
    byMerchant.set(key, list);
  }

  const recurring: RecurringSeries[] = [];
  for (const [merchant, entries] of byMerchant.entries()) {
    if (entries.length < 3) continue;
    const sorted = entries
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.abs(
        new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime(),
      );
      gaps.push(diff / (1000 * 60 * 60 * 24));
    }
    if (gaps.length === 0) continue;
    const medianGap = median(gaps);
    const freq = classifyFrequency(medianGap);
    if (!freq) continue;
    const regularityScore = scoreRegularity(gaps, medianGap);
    const nominalAmount = -median(sorted.map((t) => Math.abs(t.amount)));
    if (regularityScore < 0.6) continue;
    recurring.push({
      merchant,
      amount: nominalAmount,
      frequency: freq,
      transactions: sorted,
      regularityScore,
    });
  }
  return recurring;
}

function normalizeMerchant(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function classifyFrequency(days: number): RecurringSeries["frequency"] | null {
  if (Math.abs(days - 7) <= 2) return "weekly";
  if (Math.abs(days - 14) <= 3) return "biweekly";
  if (Math.abs(days - 30) <= 5) return "monthly";
  if (Math.abs(days - 90) <= 7) return "quarterly";
  return null;
}

function scoreRegularity(gaps: number[], target: number): number {
  const deviations = gaps.map((gap) => Math.abs(gap - target));
  const avgDev = deviations.reduce((a, b) => a + b, 0) / gaps.length;
  const score = Math.max(0, 1 - avgDev / target);
  return Number.isFinite(score) ? Math.min(1, score) : 0;
}
