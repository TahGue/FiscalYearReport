"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { categorize } from "@/lib/categorize";
import {
  applyScenario,
  DEFAULT_SIMULATION_SCENARIO,
  getDefaultGoals,
  type BudgetGoal,
  type SimulationScenario,
} from "@/lib/optimizer";
import type { AISettings, ParseResult, Transaction } from "@/types/finance";

const AI_SETTINGS_KEY = "budget-consultation-ai-settings";
const GOALS_KEY = "budget-consultation-goals";
const SIMULATION_KEY = "budget-consultation-simulation";

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

function loadInitialScenario(): SimulationScenario {
  if (typeof window === "undefined") {
    return DEFAULT_SIMULATION_SCENARIO;
  }
  try {
    const raw = localStorage.getItem(SIMULATION_KEY);
    if (!raw) return DEFAULT_SIMULATION_SCENARIO;
    const parsed = JSON.parse(raw) as Partial<SimulationScenario>;
    return {
      ...DEFAULT_SIMULATION_SCENARIO,
      ...parsed,
      canceledSubscriptions: Array.isArray(parsed.canceledSubscriptions)
        ? parsed.canceledSubscriptions
        : DEFAULT_SIMULATION_SCENARIO.canceledSubscriptions,
    };
  } catch {
    return DEFAULT_SIMULATION_SCENARIO;
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
  txs: Transaction[];
  currency: string;
  selectedMonth: string;
  aiSettings: AISettings;
  availableMonths: string[];
  baseFilteredTxs: Transaction[];
  filteredTxs: Transaction[];
  goals: BudgetGoal[];
  simulationScenario: SimulationScenario;
  setSelectedMonth: (month: string) => void;
  setAISettings: (next: AISettings) => void;
  setGoals: (next: BudgetGoal[]) => void;
  setSimulationScenario: (next: SimulationScenario) => void;
  loadParsedTransactions: (result: ParseResult) => void;
  reApplyCategories: () => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

function getYearMonth(date: string): string {
  return date.slice(0, 7);
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<string>("SEK");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [aiSettings, setAISettings] = useState<AISettings>(loadInitialAISettings);
  const [goals, setGoals] = useState<BudgetGoal[]>(loadInitialGoals);
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario>(loadInitialScenario);

  useEffect(() => {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(SIMULATION_KEY, JSON.stringify(simulationScenario));
  }, [simulationScenario]);

  const availableMonths = useMemo(() => {
    const months = new Set(txs.map((t) => getYearMonth(t.date)).filter(Boolean));
    return Array.from(months).sort();
  }, [txs]);

  const baseFilteredTxs = useMemo(() => {
    if (selectedMonth === "all") return txs;
    return txs.filter((t) => getYearMonth(t.date) === selectedMonth);
  }, [txs, selectedMonth]);

  const filteredTxs = useMemo(
    () => applyScenario(baseFilteredTxs, simulationScenario),
    [baseFilteredTxs, simulationScenario],
  );

  const value = useMemo<BudgetContextValue>(
    () => ({
      txs,
      currency,
      selectedMonth,
      aiSettings,
      availableMonths,
      baseFilteredTxs,
      filteredTxs,
      goals,
      simulationScenario,
      setSelectedMonth,
      setAISettings,
      setGoals,
      setSimulationScenario,
      loadParsedTransactions: (result) => {
        setTxs(result.transactions);
        setCurrency(result.currency);
      },
      reApplyCategories: () => {
        setTxs((prev) => prev.map((t) => ({ ...t, category: categorize(t.description) })));
      },
    }),
    [
      txs,
      currency,
      selectedMonth,
      aiSettings,
      availableMonths,
      baseFilteredTxs,
      filteredTxs,
      goals,
      simulationScenario,
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
