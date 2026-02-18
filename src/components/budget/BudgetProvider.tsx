"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { categorize } from "@/lib/categorize";
import { getDefaultGoals, type BudgetGoal } from "@/lib/optimizer";
import type { AISettings, ParseResult, Transaction, TxOwner } from "@/types/finance";

const AI_SETTINGS_KEY = "budget-consultation-ai-settings";
const GOALS_KEY = "budget-consultation-goals";
const SCOPE_KEY = "budget-consultation-scope";
const CONTRIBUTION_MODEL_KEY = "budget-consultation-contribution-model";
const BUDGET_BANDS_KEY = "budget-consultation-budget-bands";
const BUFFER_TARGETS_KEY = "budget-consultation-buffer-targets";
const ONBOARDING_KEY = "budget-consultation-onboarding-dismissed";

export type ViewScope = "household" | "self" | "partner";
export type ContributionModel = "equal" | "income_weighted";

export interface BudgetBand {
  category: string;
  min: number;
  target: number;
  max: number;
}

export interface BufferTargets {
  monthlyVolatility: number;
  irregularFund: number;
  emergencyFund: number;
}

export interface BudgetBackupPayload {
  exportedAt: string;
  version: string;
  selfTxs: Transaction[];
  partnerTxs: Transaction[];
  currency: string;
  selectedMonth: string;
  viewScope: ViewScope;
  contributionModel: ContributionModel;
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
  goals: BudgetGoal[];
  aiSettings: AISettings;
}

const defaultAISettings: AISettings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  baseUrl: "https://api.openai.com/v1",
};

function loadInitialAISettings(): AISettings {
  if (typeof window === "undefined") {
    return defaultAISettings;
  }
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return defaultAISettings;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return { ...defaultAISettings, ...parsed };
  } catch {
    return defaultAISettings;
  }
}

function loadInitialScope(): ViewScope {
  if (typeof window === "undefined") return "household";
  try {
    const raw = localStorage.getItem(SCOPE_KEY);
    return raw === "self" || raw === "partner" || raw === "household" ? raw : "household";
  } catch {
    return "household";
  }
}

function loadContributionModel(): ContributionModel {
  if (typeof window === "undefined") return "equal";
  try {
    const raw = localStorage.getItem(CONTRIBUTION_MODEL_KEY);
    return raw === "income_weighted" ? "income_weighted" : "equal";
  } catch {
    return "equal";
  }
}

function loadBudgetBands(): BudgetBand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BUDGET_BANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BudgetBand[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadBufferTargets(): BufferTargets {
  const defaults: BufferTargets = {
    monthlyVolatility: 5000,
    irregularFund: 15000,
    emergencyFund: 60000,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(BUFFER_TARGETS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<BufferTargets>;
    return {
      monthlyVolatility: Number(parsed.monthlyVolatility ?? defaults.monthlyVolatility),
      irregularFund: Number(parsed.irregularFund ?? defaults.irregularFund),
      emergencyFund: Number(parsed.emergencyFund ?? defaults.emergencyFund),
    };
  } catch {
    return defaults;
  }
}

function loadOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

function loadInitialGoals(): BudgetGoal[] {
  if (typeof window === "undefined") {
    return getDefaultGoals();
  }
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return getDefaultGoals();
    const parsed = JSON.parse(raw) as BudgetGoal[];
    return parsed.length > 0 ? parsed : getDefaultGoals();
  } catch {
    return getDefaultGoals();
  }
}

interface BudgetContextValue {
  selfTxs: Transaction[];
  partnerTxs: Transaction[];
  txs: Transaction[];
  hasPartnerData: boolean;
  currency: string;
  selectedMonth: string;
  aiSettings: AISettings;
  viewScope: ViewScope;
  contributionModel: ContributionModel;
  budgetBands: BudgetBand[];
  bufferTargets: BufferTargets;
  onboardingDismissed: boolean;
  availableMonths: string[];
  selfFilteredTxs: Transaction[];
  partnerFilteredTxs: Transaction[];
  baseFilteredTxs: Transaction[];
  filteredTxs: Transaction[];
  goals: BudgetGoal[];
  setSelectedMonth: (month: string) => void;
  setAISettings: (next: AISettings) => void;
  setViewScope: (scope: ViewScope) => void;
  setContributionModel: (model: ContributionModel) => void;
  setBudgetBands: (bands: BudgetBand[]) => void;
  setBufferTargets: (targets: BufferTargets) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
  restoreFromBackup: (payload: BudgetBackupPayload) => void;
  setGoals: (next: BudgetGoal[]) => void;
  loadParsedTransactions: (result: ParseResult) => void;
  loadParsedTransactionsByOwner: (owner: TxOwner, result: ParseResult) => void;
  reApplyCategories: () => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

function getYearMonth(date: string): string {
  return date.slice(0, 7);
}

function compareTransactionsByDateThenOwner(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  const ownerA = a.owner ?? "self";
  const ownerB = b.owner ?? "self";
  if (ownerA !== ownerB) return ownerA.localeCompare(ownerB);
  return a.description.localeCompare(b.description);
}

function normalizeOwnerTransactions(owner: TxOwner, txs: Transaction[]): Transaction[] {
  return txs
    .map((tx) => ({ ...tx, owner }))
    .slice()
    .sort(compareTransactionsByDateThenOwner);
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [selfTxs, setSelfTxs] = useState<Transaction[]>([]);
  const [partnerTxs, setPartnerTxs] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<string>("SEK");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [aiSettings, setAISettings] = useState<AISettings>(loadInitialAISettings);
  const [viewScope, setViewScope] = useState<ViewScope>(loadInitialScope);
  const [contributionModel, setContributionModel] = useState<ContributionModel>(loadContributionModel);
  const [budgetBands, setBudgetBands] = useState<BudgetBand[]>(loadBudgetBands);
  const [bufferTargets, setBufferTargets] = useState<BufferTargets>(loadBufferTargets);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(loadOnboardingDismissed);
  const [goals, setGoals] = useState<BudgetGoal[]>(loadInitialGoals);

  useEffect(() => {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(SCOPE_KEY, viewScope);
  }, [viewScope]);

  useEffect(() => {
    localStorage.setItem(CONTRIBUTION_MODEL_KEY, contributionModel);
  }, [contributionModel]);

  useEffect(() => {
    localStorage.setItem(BUDGET_BANDS_KEY, JSON.stringify(budgetBands));
  }, [budgetBands]);

  useEffect(() => {
    localStorage.setItem(BUFFER_TARGETS_KEY, JSON.stringify(bufferTargets));
  }, [bufferTargets]);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, onboardingDismissed ? "1" : "0");
  }, [onboardingDismissed]);

  const txs = useMemo(
    () =>
      [...selfTxs, ...partnerTxs]
        .slice()
        .sort(compareTransactionsByDateThenOwner),
    [selfTxs, partnerTxs],
  );

  const hasPartnerData = partnerTxs.length > 0;

  const availableMonths = useMemo(() => {
    const months = new Set(txs.map((t) => getYearMonth(t.date)).filter(Boolean));
    return Array.from(months).sort();
  }, [txs]);

  const selfFilteredTxs = useMemo(() => {
    if (selectedMonth === "all") return selfTxs;
    return selfTxs.filter((t) => getYearMonth(t.date) === selectedMonth);
  }, [selfTxs, selectedMonth]);

  const partnerFilteredTxs = useMemo(() => {
    if (selectedMonth === "all") return partnerTxs;
    return partnerTxs.filter((t) => getYearMonth(t.date) === selectedMonth);
  }, [partnerTxs, selectedMonth]);

  const scopedTxs = useMemo(() => {
    if (viewScope === "self") return selfTxs;
    if (viewScope === "partner") return partnerTxs;
    return txs;
  }, [viewScope, selfTxs, partnerTxs, txs]);

  const baseFilteredTxs = useMemo(() => {
    if (selectedMonth === "all") return scopedTxs;
    return scopedTxs.filter((t) => getYearMonth(t.date) === selectedMonth);
  }, [scopedTxs, selectedMonth]);

  const filteredTxs = baseFilteredTxs;

  const value = useMemo<BudgetContextValue>(
    () => ({
      txs,
      selfTxs,
      partnerTxs,
      hasPartnerData,
      currency,
      selectedMonth,
      aiSettings,
      viewScope,
      contributionModel,
      budgetBands,
      bufferTargets,
      onboardingDismissed,
      availableMonths,
      selfFilteredTxs,
      partnerFilteredTxs,
      baseFilteredTxs,
      filteredTxs,
      goals,
      setSelectedMonth,
      setAISettings,
      setViewScope,
      setContributionModel,
      setBudgetBands,
      setBufferTargets,
      setOnboardingDismissed,
      restoreFromBackup: (payload) => {
        setSelfTxs(Array.isArray(payload.selfTxs) ? payload.selfTxs : []);
        setPartnerTxs(Array.isArray(payload.partnerTxs) ? payload.partnerTxs : []);
        setCurrency(payload.currency || "SEK");
        setSelectedMonth(payload.selectedMonth || "all");
        setViewScope(payload.viewScope || "household");
        setContributionModel(payload.contributionModel || "equal");
        setBudgetBands(Array.isArray(payload.budgetBands) ? payload.budgetBands : []);
        setBufferTargets(payload.bufferTargets || loadBufferTargets());
        setGoals(Array.isArray(payload.goals) ? payload.goals : getDefaultGoals());
        setAISettings(payload.aiSettings || defaultAISettings);
      },
      setGoals,
      loadParsedTransactions: (result) => {
        setSelfTxs(normalizeOwnerTransactions("self", result.transactions));
        setCurrency(result.currency);
      },
      loadParsedTransactionsByOwner: (owner, result) => {
        const ownedTransactions = normalizeOwnerTransactions(owner, result.transactions);
        if (owner === "self") {
          setSelfTxs(ownedTransactions);
        } else {
          setPartnerTxs(ownedTransactions);
        }
        setCurrency(result.currency);
      },
      reApplyCategories: () => {
        setSelfTxs((prev) => prev.map((t) => ({ ...t, category: categorize(t.description) })));
        setPartnerTxs((prev) => prev.map((t) => ({ ...t, category: categorize(t.description) })));
      },
    }),
    [
      txs,
      selfTxs,
      partnerTxs,
      hasPartnerData,
      currency,
      selectedMonth,
      aiSettings,
      viewScope,
      contributionModel,
      budgetBands,
      bufferTargets,
      onboardingDismissed,
      availableMonths,
      selfFilteredTxs,
      partnerFilteredTxs,
      baseFilteredTxs,
      filteredTxs,
      goals,
      setViewScope,
      setContributionModel,
      setBudgetBands,
      setBufferTargets,
      setOnboardingDismissed,
      setSelectedMonth,
      setAISettings,
      setGoals,
    ],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudget must be used inside BudgetProvider");
  }
  return ctx;
}
