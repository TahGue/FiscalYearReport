export type HouseholdRegionType = "storstad" | "mellanstor" | "glesbygd";
export type HousingType = "hyresratt" | "brf" | "villa";
export type FamilyType = "singel" | "par" | "familj";
export type WorkMode = "pendling" | "distans" | "hybrid";

export interface SwedishProfile {
  regionType: HouseholdRegionType;
  housingType: HousingType;
  familyType: FamilyType;
  workMode: WorkMode;
}

export interface SwedishBenefitsInput {
  monthlyIncome: number;
  monthlyHousingCost: number;
  childrenCount: number;
  vabDaysPerMonth: number;
  parentalLeaveDaysPerMonth: number;
  isStudent: boolean;
  hasAkassaMembership: boolean;
}

export type SwedishBenefitType = "bostadsbidrag" | "vab" | "foraldrapenning" | "csn" | "akassa";

export interface SwedishBenefitEstimate {
  type: SwedishBenefitType;
  label: string;
  monthlyAmount: number;
  confidence: "low" | "medium" | "high";
  note: string;
}

export interface MacroIndicators {
  cpiYoY: number;
  repoRate: number;
  mortgageRateAvg: number;
  updatedAt: string;
}

export interface PurchasingPowerSnapshot {
  nominalMonthlySpend: number;
  realMonthlySpend: number;
  erosionPercent: number;
}

export interface BenchmarkCategoryResult {
  category: string;
  actual: number;
  benchmark: number;
  deltaPercent: number;
  status: "below" | "near" | "above";
}

export interface SwedishBenchmarkReport {
  benchmarkTotal: number;
  actualTotal: number;
  categories: BenchmarkCategoryResult[];
}

export type ContractType = "el" | "forsakring";

export interface ContractInput {
  id: string;
  type: ContractType;
  provider: string;
  currentMonthlyCost: number;
  suggestedMonthlyCost: number;
}

export interface SwitchRecommendation {
  id: string;
  type: ContractType;
  provider: string;
  monthlySaving: number;
  annualSaving: number;
}

export interface RegionalAdviceItem {
  id: string;
  title: string;
  body: string;
  impact: "low" | "medium" | "high";
}

export interface SwedenSettings {
  profile: SwedishProfile;
  benefits: SwedishBenefitsInput;
  contracts: ContractInput[];
}

export const DEFAULT_SWEDEN_SETTINGS: SwedenSettings = {
  profile: {
    regionType: "storstad",
    housingType: "hyresratt",
    familyType: "singel",
    workMode: "hybrid",
  },
  benefits: {
    monthlyIncome: 36000,
    monthlyHousingCost: 12000,
    childrenCount: 0,
    vabDaysPerMonth: 0,
    parentalLeaveDaysPerMonth: 0,
    isStudent: false,
    hasAkassaMembership: true,
  },
  contracts: [
    {
      id: "el-avtal",
      type: "el",
      provider: "Nuvarande elavtal",
      currentMonthlyCost: 1800,
      suggestedMonthlyCost: 1500,
    },
    {
      id: "hemforsakring",
      type: "forsakring",
      provider: "Nuvarande försäkring",
      currentMonthlyCost: 450,
      suggestedMonthlyCost: 350,
    },
  ],
};
