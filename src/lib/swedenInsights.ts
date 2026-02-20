import type { Transaction } from "@/types/finance";
import type {
  MacroIndicators,
  PurchasingPowerSnapshot,
  RegionalAdviceItem,
  SwedishBenefitEstimate,
  SwedishBenchmarkReport,
  SwedenSettings,
  SwitchRecommendation,
} from "@/types/sweden";

function spendingTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter((tx) => tx.amount < 0);
}

function monthlySpendAverage(txs: Transaction[]): number {
  const byMonth = new Map<string, number>();
  for (const tx of spendingTransactions(txs)) {
    const month = tx.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + Math.abs(tx.amount));
  }
  const values = Array.from(byMonth.values());
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildMacroIndicators(): MacroIndicators {
  return {
    cpiYoY: 4.1,
    repoRate: 3.75,
    mortgageRateAvg: 4.35,
    updatedAt: new Date().toISOString(),
  };
}

export function buildPurchasingPowerSnapshot(txs: Transaction[], macro: MacroIndicators): PurchasingPowerSnapshot {
  const nominalMonthlySpend = monthlySpendAverage(txs);
  const realMonthlySpend = nominalMonthlySpend / (1 + macro.cpiYoY / 100);
  const erosionPercent = nominalMonthlySpend === 0 ? 0 : ((nominalMonthlySpend - realMonthlySpend) / nominalMonthlySpend) * 100;

  return {
    nominalMonthlySpend,
    realMonthlySpend,
    erosionPercent,
  };
}

export function estimateBenefits(settings: SwedenSettings): SwedishBenefitEstimate[] {
  const input = settings.benefits;
  const safeIncome = Math.max(0, input.monthlyIncome);

  const housingStress = Math.max(0, input.monthlyHousingCost - safeIncome * 0.3);
  const bostadsbidrag = Math.max(0, Math.min(4200, housingStress * 0.45 + input.childrenCount * 450));

  const dailyIncomeBase = safeIncome / 22;
  const vab = Math.max(0, input.vabDaysPerMonth * dailyIncomeBase * 0.8);
  const parental = Math.max(0, input.parentalLeaveDaysPerMonth * dailyIncomeBase * 0.77);

  const csn = input.isStudent ? 3900 : 0;
  const akassa = input.hasAkassaMembership ? Math.max(0, Math.min(26400, safeIncome * 0.7)) : 0;

  return [
    {
      type: "bostadsbidrag",
      label: "Bostadsbidrag",
      monthlyAmount: bostadsbidrag,
      confidence: "medium",
      note: "Schablon baserad på boendekostnad och hushållsinkomst.",
    },
    {
      type: "vab",
      label: "VAB",
      monthlyAmount: vab,
      confidence: "medium",
      note: "Uppskattning baserad på VAB-dagar och inkomstnivå.",
    },
    {
      type: "foraldrapenning",
      label: "Föräldrapenning",
      monthlyAmount: parental,
      confidence: "medium",
      note: "Schablon med 77% ersättningsgrad av dagsinkomst.",
    },
    {
      type: "csn",
      label: "CSN",
      monthlyAmount: csn,
      confidence: input.isStudent ? "high" : "low",
      note: input.isStudent ? "Basantagande för studiemedel per månad." : "Ingen CSN antas utan studentstatus.",
    },
    {
      type: "akassa",
      label: "A-kassa",
      monthlyAmount: akassa,
      confidence: input.hasAkassaMembership ? "medium" : "low",
      note: input.hasAkassaMembership
        ? "Förenklad uppskattning vid arbetslöshetsscenario."
        : "Ej aktivt medlemskap markerat.",
    },
  ];
}

const BENCHMARK_TOTAL_BY_PROFILE = {
  singel: 20500,
  par: 31800,
  familj: 44500,
} as const;

export function buildBenchmarkReport(txs: Transaction[], settings: SwedenSettings): SwedishBenchmarkReport {
  const benchmarkTotal = BENCHMARK_TOTAL_BY_PROFILE[settings.profile.familyType];

  const categories = [
    { key: "Boende", benchmark: benchmarkTotal * 0.32 },
    { key: "Mat", benchmark: benchmarkTotal * 0.16 },
    { key: "Transport", benchmark: benchmarkTotal * 0.12 },
    { key: "Övrigt", benchmark: benchmarkTotal * 0.4 },
  ];

  const spends = spendingTransactions(txs);
  const categoryTotals = new Map<string, number>();
  for (const tx of spends) {
    const category = tx.category ?? "Övrigt";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + Math.abs(tx.amount));
  }

  const totalSpend = spends.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const categoryResults = categories.map((entry) => {
    let actual = 0;
    if (entry.key === "Boende") {
      actual = Array.from(categoryTotals.entries())
        .filter(([name]) => /hyra|boende|rent|housing|bostad/i.test(name))
        .reduce((sum, [, value]) => sum + value, 0);
    } else if (entry.key === "Mat") {
      actual = Array.from(categoryTotals.entries())
        .filter(([name]) => /mat|food|livsmedel|restaurang|dining/i.test(name))
        .reduce((sum, [, value]) => sum + value, 0);
    } else if (entry.key === "Transport") {
      actual = Array.from(categoryTotals.entries())
        .filter(([name]) => /transport|travel|resor|bil|fuel/i.test(name))
        .reduce((sum, [, value]) => sum + value, 0);
    } else {
      actual = Math.max(0, totalSpend - (categoryTotals.get("Boende") ?? 0));
    }

    const deltaPercent = entry.benchmark === 0 ? 0 : ((actual - entry.benchmark) / entry.benchmark) * 100;
    const status: "above" | "below" | "near" = deltaPercent > 15 ? "above" : deltaPercent < -15 ? "below" : "near";

    return {
      category: entry.key,
      actual,
      benchmark: entry.benchmark,
      deltaPercent,
      status,
    };
  });

  return {
    benchmarkTotal,
    actualTotal: totalSpend,
    categories: categoryResults,
  };
}

export function buildSwitchRecommendations(settings: SwedenSettings): SwitchRecommendation[] {
  return settings.contracts
    .map((contract) => {
      const monthlySaving = Math.max(0, contract.currentMonthlyCost - contract.suggestedMonthlyCost);
      return {
        id: contract.id,
        type: contract.type,
        provider: contract.provider,
        monthlySaving,
        annualSaving: monthlySaving * 12,
      };
    })
    .filter((item) => item.monthlySaving > 0)
    .sort((a, b) => b.monthlySaving - a.monthlySaving);
}

export function buildRegionalAdvice(settings: SwedenSettings, macro: MacroIndicators): RegionalAdviceItem[] {
  const profile = settings.profile;
  const advice: RegionalAdviceItem[] = [];

  if (profile.regionType === "storstad") {
    advice.push({
      id: "city-housing",
      title: "Storstad: prioritera boendekvot",
      body: "Sätt ett hårt tak för boendekostnad som andel av nettoinkomst och omförhandla lån/hyra kvartalsvis.",
      impact: "high",
    });
  }

  if (profile.workMode === "pendling") {
    advice.push({
      id: "commute",
      title: "Pendling: spåra resekostnad separat",
      body: "Följ drivmedel, parkering och kollektivtrafik separat för att optimera reseavdrag och minska läckage.",
      impact: "medium",
    });
  }

  if (profile.housingType === "brf" || profile.housingType === "villa") {
    advice.push({
      id: "rate-risk",
      title: "Räntekänslighet i boende",
      body: `Nuvarande referensränta är ${macro.repoRate.toFixed(2)}%. Öka bufferten för boendeutgifter vid ränteuppgångar.`,
      impact: "high",
    });
  }

  if (profile.familyType === "familj") {
    advice.push({
      id: "family-cushion",
      title: "Familj: förstärk oregelbunden-fond",
      body: "Bygg extra reserver för vård, fritid och barnrelaterade engångsutgifter för att minska månadsschocker.",
      impact: "medium",
    });
  }

  if (advice.length === 0) {
    advice.push({
      id: "baseline",
      title: "Behåll stabil basplan",
      body: "Du har en balanserad profil. Fortsätt följa veckovisa avvikelser och justera endast vid tydliga mönster.",
      impact: "low",
    });
  }

  return advice.slice(0, 3);
}
