import { categorize } from "@/lib/categorize";
import { basicInsights } from "@/lib/analyze";
import type { Transaction } from "@/types/finance";

export interface SubscriptionCandidate {
  merchant: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
  annualCost: number;
  confidence: number;
  category: string;
  transactions: Transaction[];
}

export interface SubscriptionAlternative {
  id: string;
  service: string;
  monthlyEstimate: number;
  alternative: string;
  alternativeMonthly: number;
  type: "free" | "same_price" | "cheaper";
  notes: string;
}

export interface ForecastPoint {
  date: string;
  projectedBalance: number;
}

export interface ForecastResult {
  startBalance: number;
  in30: number;
  in60: number;
  in90: number;
  riskDate: string | null;
  points: ForecastPoint[];
}

export interface BudgetGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface GoalProjection {
  goal: BudgetGoal;
  remaining: number;
  daysLeft: number;
  neededPerWeek: number;
  onTrack: boolean;
}

export interface HealthScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  savingsRate: number;
  subscriptionBurden: number;
  anomalyRisk: number;
  recommendations: string[];
}

export interface SimulationScenario {
  incomeMultiplier: number;
  spendingReductionPercent: number;
  canceledSubscriptions: string[];
  oneTimeShock: number;
}

export const DEFAULT_SIMULATION_SCENARIO: SimulationScenario = {
  incomeMultiplier: 100,
  spendingReductionPercent: 0,
  canceledSubscriptions: [],
  oneTimeShock: 0,
};

const alternativeCatalog: SubscriptionAlternative[] = [
  {
    id: "netflix-basic",
    service: "Netflix",
    monthlyEstimate: 159,
    alternative: "SVT Play / Pluto TV",
    alternativeMonthly: 0,
    type: "free",
    notes: "Use free ad-supported options for occasional streaming months.",
  },
  {
    id: "spotify",
    service: "Spotify",
    monthlyEstimate: 119,
    alternative: "YouTube Music Free / local library",
    alternativeMonthly: 0,
    type: "free",
    notes: "For premium audio, compare family plans if multiple users.",
  },
  {
    id: "windsurf",
    service: "Windsurf/Codeium Pro",
    monthlyEstimate: 15,
    alternative: "Continue + Ollama",
    alternativeMonthly: 0,
    type: "free",
    notes: "Local model workflows remove recurring SaaS cost.",
  },
  {
    id: "vercel",
    service: "Vercel Pro",
    monthlyEstimate: 20,
    alternative: "Cloudflare Pages + Workers",
    alternativeMonthly: 0,
    type: "free",
    notes: "Great for static and edge-heavy workloads.",
  },
  {
    id: "neon",
    service: "Neon paid",
    monthlyEstimate: 19,
    alternative: "Supabase Free / Neon Free",
    alternativeMonthly: 0,
    type: "free",
    notes: "For local-first apps, avoid DB spend until sync is required.",
  },
  {
    id: "openai",
    service: "OpenAI usage",
    monthlyEstimate: 20,
    alternative: "Groq / local Ollama",
    alternativeMonthly: 0,
    type: "free",
    notes: "Route low-risk prompts to low-cost providers.",
  },
];

const DEFAULT_GOALS: BudgetGoal[] = [
  {
    id: "emergency-fund",
    title: "Emergency fund",
    targetAmount: 25000,
    currentAmount: 0,
    targetDate: `${new Date().getFullYear()}-12-31`,
  },
  {
    id: "vacation",
    title: "Summer travel fund",
    targetAmount: 12000,
    currentAmount: 0,
    targetDate: `${new Date().getFullYear()}-06-15`,
  },
];

export function getDefaultGoals(): BudgetGoal[] {
  return DEFAULT_GOALS;
}

export function applyScenario(txs: Transaction[], scenario: SimulationScenario): Transaction[] {
  const cancelSet = new Set(scenario.canceledSubscriptions.map((s) => normalizeMerchant(s)));
  const spendingFactor = 1 - clamp(scenario.spendingReductionPercent / 100, 0, 0.95);
  const incomeFactor = clamp(scenario.incomeMultiplier / 100, 0.3, 3);

  const simulated: Transaction[] = txs
    .filter((t) => {
      const merchant = normalizeMerchant(t.description);
      if (t.amount >= 0) return true;
      if (cancelSet.size === 0) return true;
      for (const canceled of cancelSet.values()) {
        if (merchant.includes(canceled) || canceled.includes(merchant)) {
          return false;
        }
      }
      return true;
    })
    .map((t) => {
      if (t.amount > 0) {
        return { ...t, amount: t.amount * incomeFactor };
      }
      if (t.amount < 0) {
        return { ...t, amount: t.amount * spendingFactor };
      }
      return t;
    });

  if (scenario.oneTimeShock !== 0) {
    const today = new Date().toISOString().slice(0, 10);
    simulated.push({
      date: today,
      description: "What-if one-time shock",
      amount: scenario.oneTimeShock,
      type: scenario.oneTimeShock >= 0 ? "credit" : "debit",
      category: scenario.oneTimeShock >= 0 ? "Income" : "Other",
    });
  }

  return simulated;
}

export function findSubscriptionAlternatives(candidates: SubscriptionCandidate[]): SubscriptionAlternative[] {
  const names = candidates.map((c) => c.merchant.toLowerCase()).join(" ");
  return alternativeCatalog.filter((item) => names.includes(item.service.toLowerCase().split(" ")[0]));
}

export function detectSubscriptions(txs: Transaction[]): SubscriptionCandidate[] {
  const debits = txs.filter((t) => t.amount < 0);
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of debits) {
    const key = normalizeMerchant(t.description);
    if (!key) continue;
    const list = byMerchant.get(key) ?? [];
    list.push(t);
    byMerchant.set(key, list);
  }

  const out: SubscriptionCandidate[] = [];

  for (const [merchant, list] of byMerchant.entries()) {
    if (list.length < 3) continue;
    const sorted = list
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days =
        Math.abs(new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(days);
    }
    if (gaps.length === 0) continue;

    const amountAbs = sorted.map((t) => Math.abs(t.amount));
    const avg = mean(amountAbs);
    const amountVariation = relativeStd(amountAbs, avg);
    const medGap = median(gaps);
    const frequency = classifyFrequency(medGap);
    if (!frequency) continue;

    const regularity = Math.max(0, 1 - relativeStd(gaps, medGap));
    const confidence = clamp(0.35 + regularity * 0.45 + (1 - amountVariation) * 0.2, 0, 1);
    if (confidence < 0.55) continue;

    const annualMultiplier =
      frequency === "weekly" ? 52 : frequency === "biweekly" ? 26 : frequency === "monthly" ? 12 : 4;

    out.push({
      merchant,
      amount: -avg,
      frequency,
      annualCost: avg * annualMultiplier,
      confidence,
      category: categorize(merchant),
      transactions: sorted,
    });
  }

  return out.sort((a, b) => b.annualCost - a.annualCost).slice(0, 12);
}

export function buildForecast(txs: Transaction[]): ForecastResult {
  const sorted = txs
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const balance = sorted.reduce((sum, t) => sum + t.amount, 0);
  const monthlyNet = estimateMonthlyNet(sorted);
  const dailyNet = monthlyNet / 30;

  const points: ForecastPoint[] = [];
  let riskDate: string | null = null;
  const now = new Date();

  for (let day = 0; day <= 90; day += 5) {
    const pointDate = new Date(now);
    pointDate.setDate(now.getDate() + day);
    const projected = balance + dailyNet * day;
    if (!riskDate && projected < 0) {
      riskDate = pointDate.toISOString().slice(0, 10);
    }
    points.push({
      date: pointDate.toISOString().slice(0, 10),
      projectedBalance: projected,
    });
  }

  return {
    startBalance: balance,
    in30: balance + dailyNet * 30,
    in60: balance + dailyNet * 60,
    in90: balance + dailyNet * 90,
    riskDate,
    points,
  };
}

export function projectGoals(goals: BudgetGoal[], txs: Transaction[]): GoalProjection[] {
  const savingsMonthly = estimateMonthlySavings(txs);
  const weekly = savingsMonthly / 4.345;
  const today = new Date();

  return goals.map((goal) => {
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const target = new Date(goal.targetDate);
    const daysLeft = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const neededPerWeek = (remaining / daysLeft) * 7;
    return {
      goal,
      remaining,
      daysLeft,
      neededPerWeek,
      onTrack: weekly >= neededPerWeek,
    };
  });
}

export function computeHealthScore(txs: Transaction[], subscriptions: SubscriptionCandidate[]): HealthScore {
  const insights = basicInsights(txs);
  const income = insights.income || 1;
  const monthlyRecurring = subscriptions.reduce((s, c) => s + c.annualCost / 12, 0);
  const savingsRate = clamp((insights.net / income) * 100, -100, 100);
  const subscriptionBurden = clamp((monthlyRecurring / (income / 12)) * 100, 0, 100);

  let score = 100;
  score -= clamp(30 - savingsRate, 0, 50);
  score -= clamp(subscriptionBurden * 0.5, 0, 30);

  const anomalyRisk = anomalyProxy(txs);
  score -= anomalyRisk * 20;

  const normalized = Math.round(clamp(score, 0, 100));
  const grade = normalized >= 85 ? "A" : normalized >= 70 ? "B" : normalized >= 55 ? "C" : normalized >= 40 ? "D" : "E";

  const recommendations: string[] = [];
  if (savingsRate < 15) recommendations.push("Raise monthly savings rate above 15% for resilience.");
  if (subscriptionBurden > 12) recommendations.push("Reduce recurring subscription burden below 12% of income.");
  if (anomalyRisk > 0.6) recommendations.push("Review high-variance spending and duplicate charges weekly.");
  if (recommendations.length === 0) recommendations.push("Keep current course and automate savings transfers.");

  return {
    score: normalized,
    grade,
    savingsRate,
    subscriptionBurden,
    anomalyRisk,
    recommendations,
  };
}

function estimateMonthlyNet(txs: Transaction[]): number {
  if (txs.length === 0) return 0;
  const byMonth = new Map<string, number>();
  for (const t of txs) {
    const m = t.date.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + t.amount);
  }
  return mean(Array.from(byMonth.values()));
}

function estimateMonthlySavings(txs: Transaction[]): number {
  const monthlyNet = estimateMonthlyNet(txs);
  return Math.max(0, monthlyNet);
}

function anomalyProxy(txs: Transaction[]): number {
  const debits = txs.filter((t) => t.amount < 0).map((t) => Math.abs(t.amount));
  if (debits.length < 5) return 0.2;
  const avg = mean(debits);
  const rel = relativeStd(debits, avg);
  return clamp(rel, 0, 1);
}

function normalizeMerchant(desc: string): string {
  return desc.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function classifyFrequency(days: number): SubscriptionCandidate["frequency"] | null {
  if (Math.abs(days - 7) <= 2) return "weekly";
  if (Math.abs(days - 14) <= 3) return "biweekly";
  if (Math.abs(days - 30) <= 6) return "monthly";
  if (Math.abs(days - 90) <= 10) return "quarterly";
  return null;
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1);
}

function std(values: number[], m: number): number {
  if (values.length < 2) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

function relativeStd(values: number[], avg: number): number {
  if (!Number.isFinite(avg) || avg === 0) return 0;
  return std(values, avg) / avg;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
