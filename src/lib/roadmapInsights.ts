import { detectSubscriptions } from "@/lib/optimizer";
import type { BufferTargets, BudgetBand, ContributionModel } from "@/components/budget/BudgetProvider";
import type { Transaction } from "@/types/finance";

export interface CategoryPatternInsight {
  category: string;
  averageMonthly: number;
  currentMonth: number;
  stabilityScore: number;
  classification: "frequent" | "irregular";
  monthsCovered: number;
  baselineDeltaPercent: number;
  recommendedSinkingFund: number;
}

export interface SpendingAlert {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  reason: string;
  recommendation: string;
}

export interface SavingsOpportunity {
  id: string;
  title: string;
  monthlySaving: number;
  annualSaving: number;
  impact: "high" | "medium" | "low";
  reason: string;
  action: string;
}

export interface NextBestAction {
  id: string;
  title: string;
  expectedMonthlyImpact: number;
  explainability: string;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
}

function std(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function classifyCategoryPatterns(txs: Transaction[]): CategoryPatternInsight[] {
  const spendingByMonthCategory = new Map<string, Map<string, number>>();

  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const month = monthKey(tx.date);
    const category = tx.category ?? "Other";
    const byCategory = spendingByMonthCategory.get(month) ?? new Map<string, number>();
    byCategory.set(category, (byCategory.get(category) ?? 0) + Math.abs(tx.amount));
    spendingByMonthCategory.set(month, byCategory);
  }

  const months = Array.from(spendingByMonthCategory.keys()).sort();
  const categorySeries = new Map<string, number[]>();

  for (const month of months) {
    const byCategory = spendingByMonthCategory.get(month) ?? new Map<string, number>();
    const categories = new Set([...categorySeries.keys(), ...byCategory.keys()]);
    for (const category of categories) {
      const values = categorySeries.get(category) ?? Array(months.indexOf(month)).fill(0);
      values.push(byCategory.get(category) ?? 0);
      categorySeries.set(category, values);
    }
  }

  const currentMonth = months[months.length - 1];
  const currentByCategory = currentMonth ? spendingByMonthCategory.get(currentMonth) ?? new Map<string, number>() : new Map();

  return Array.from(categorySeries.entries())
    .map(([category, monthlyValues]) => {
      const avg = mean(monthlyValues);
      const deviation = std(monthlyValues, avg);
      const stabilityScore = avg <= 0 ? 0 : Math.max(0, Math.min(100, (1 - deviation / (avg || 1)) * 100));
      const nonZeroMonths = monthlyValues.filter((v) => v > 0).length;
      const classification = nonZeroMonths >= Math.max(2, Math.ceil(monthlyValues.length * 0.6)) ? "frequent" : "irregular";
      const current = currentByCategory.get(category) ?? 0;
      const baselineDeltaPercent = avg > 0 ? ((current - avg) / avg) * 100 : 0;
      const recommendedSinkingFund = classification === "irregular" ? avg * 1.5 : avg * 0.5;

      return {
        category,
        averageMonthly: avg,
        currentMonth: current,
        stabilityScore,
        classification,
        monthsCovered: nonZeroMonths,
        baselineDeltaPercent,
        recommendedSinkingFund,
      } satisfies CategoryPatternInsight;
    })
    .sort((a, b) => b.averageMonthly - a.averageMonthly);
}

export function monthlyVolatilityIndex(txs: Transaction[]): number {
  const byMonth = new Map<string, number>();
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const key = monthKey(tx.date);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.abs(tx.amount));
  }
  const values = Array.from(byMonth.values());
  if (values.length < 2) return 0;
  const avg = mean(values);
  if (avg === 0) return 0;
  return (std(values, avg) / avg) * 100;
}

export function buildSpendingAlerts(
  txs: Transaction[],
  patterns: CategoryPatternInsight[],
  bands: BudgetBand[],
  bufferTargets: BufferTargets,
): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];
  const volatility = monthlyVolatilityIndex(txs);

  if (volatility > 35) {
    alerts.push({
      id: "volatility-high",
      severity: "high",
      title: "High spending volatility",
      reason: `Monthly spending variance is ${volatility.toFixed(0)}%.`,
      recommendation: `Build/maintain at least ${bufferTargets.monthlyVolatility.toFixed(0)} buffer for monthly fluctuations.`,
    });
  }

  for (const pattern of patterns.slice(0, 8)) {
    if (pattern.baselineDeltaPercent > 20) {
      alerts.push({
        id: `category-spike-${pattern.category}`,
        severity: pattern.baselineDeltaPercent > 40 ? "high" : "medium",
        title: `${pattern.category} is above baseline`,
        reason: `${pattern.category} is ${pattern.baselineDeltaPercent.toFixed(0)}% above normal month average.`,
        recommendation: "Review top merchants in this category and set a temporary cap for next month.",
      });
    }
  }

  for (const band of bands) {
    const match = patterns.find((p) => p.category === band.category);
    if (!match) continue;
    if (match.currentMonth > band.max) {
      alerts.push({
        id: `band-breach-${band.category}`,
        severity: "high",
        title: `${band.category} exceeded max band`,
        reason: `Current month ${match.currentMonth.toFixed(0)} is above max ${band.max.toFixed(0)}.`,
        recommendation: "Run a category-specific spending freeze for 2 weeks.",
      });
    }
  }

  return alerts.slice(0, 6);
}

function isLikelyDining(category: string): boolean {
  return category.toLowerCase().includes("dining");
}

function isLikelyShopping(category: string): boolean {
  return category.toLowerCase().includes("shopping");
}

export function findSavingsOpportunities(txs: Transaction[], patterns: CategoryPatternInsight[]): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = [];
  const subscriptions = detectSubscriptions(txs);

  if (subscriptions.length > 0) {
    const expensive = subscriptions.slice(0, 3);
    const monthlySaving = expensive.reduce((sum, sub) => sum + Math.abs(sub.amount) * 0.4, 0);
    opportunities.push({
      id: "subscriptions-rightsize",
      title: "Right-size recurring subscriptions",
      monthlySaving,
      annualSaving: monthlySaving * 12,
      impact: "high",
      reason: `${expensive.length} recurring subscriptions dominate recurring outflow.`,
      action: "Pause/cancel lowest-value subscriptions and move to free alternatives.",
    });
  }

  const dining = patterns.find((p) => isLikelyDining(p.category));
  if (dining && dining.currentMonth > 0) {
    const monthlySaving = dining.currentMonth * 0.2;
    opportunities.push({
      id: "dining-reduction",
      title: "Reduce dining out by 20%",
      monthlySaving,
      annualSaving: monthlySaving * 12,
      impact: monthlySaving > 800 ? "high" : "medium",
      reason: "Dining spend is one of the easiest discretionary levers.",
      action: "Set weekly dining cap and replace one paid meal with home-cooked meals.",
    });
  }

  const shopping = patterns.find((p) => isLikelyShopping(p.category));
  if (shopping && shopping.currentMonth > shopping.averageMonthly) {
    const monthlySaving = shopping.currentMonth * 0.15;
    opportunities.push({
      id: "shopping-throttle",
      title: "Throttle discretionary shopping",
      monthlySaving,
      annualSaving: monthlySaving * 12,
      impact: monthlySaving > 500 ? "medium" : "low",
      reason: "Current shopping is above personal baseline.",
      action: "Apply 24-hour wait rule for non-essential purchases over 300 SEK.",
    });
  }

  return opportunities.sort((a, b) => b.monthlySaving - a.monthlySaving).slice(0, 5);
}

export function calculateContributionBreakdown(
  selfIncome: number,
  partnerIncome: number,
  contributionModel: ContributionModel,
): { selfShare: number; partnerShare: number } {
  if (contributionModel === "income_weighted") {
    const total = selfIncome + partnerIncome;
    if (total > 0) {
      return {
        selfShare: selfIncome / total,
        partnerShare: partnerIncome / total,
      };
    }
  }
  return { selfShare: 0.5, partnerShare: 0.5 };
}

function startOfWeek(date: Date): Date {
  const out = new Date(date);
  const day = out.getDay();
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function buildWeeklySummary(txs: Transaction[], currency: string): string {
  const now = new Date();
  const weekStart = startOfWeek(now).getTime();
  const prevWeekStart = new Date(weekStart - 7 * 24 * 60 * 60 * 1000).getTime();

  let thisWeekSpend = 0;
  let lastWeekSpend = 0;
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const ts = new Date(tx.date).getTime();
    const abs = Math.abs(tx.amount);
    if (ts >= weekStart) thisWeekSpend += abs;
    else if (ts >= prevWeekStart && ts < weekStart) lastWeekSpend += abs;
  }

  const delta = lastWeekSpend > 0 ? ((thisWeekSpend - lastWeekSpend) / lastWeekSpend) * 100 : 0;
  return `This week spending: ${thisWeekSpend.toFixed(0)} ${currency}. Last week: ${lastWeekSpend.toFixed(0)} ${currency}. Week-over-week change: ${delta.toFixed(0)}%.`;
}

export function buildNextBestActions(opportunities: SavingsOpportunity[], alerts: SpendingAlert[]): NextBestAction[] {
  const actions: NextBestAction[] = [];

  for (const opportunity of opportunities.slice(0, 2)) {
    actions.push({
      id: `opp-${opportunity.id}`,
      title: opportunity.title,
      expectedMonthlyImpact: opportunity.monthlySaving,
      explainability: `${opportunity.reason} Action: ${opportunity.action}`,
    });
  }

  const topAlert = alerts.find((alert) => alert.severity !== "low") ?? alerts[0];
  if (topAlert) {
    actions.push({
      id: `alert-${topAlert.id}`,
      title: `Resolve: ${topAlert.title}`,
      expectedMonthlyImpact: 0,
      explainability: `${topAlert.reason} Recommendation: ${topAlert.recommendation}`,
    });
  }

  return actions.slice(0, 3);
}
