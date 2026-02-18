import type { Transaction } from "@/types/finance";

export type DeductionType =
  | "reseavdrag"
  | "ranteavdrag"
  | "rot"
  | "rut"
  | "akassa"
  | "arbetsverktyg"
  | "tjansteresor"
  | "trangselskatt"
  | "pension";

export interface DeductionRule {
  type: DeductionType;
  label: string;
  labelSv: string;
  maxAmount?: number;
  rate: number;
  explanation: string;
  howToClaim: string;
  notDeductible?: boolean;
}

export interface DetectedDeduction {
  rule: DeductionRule;
  transactions: Transaction[];
  totalSpend: number;
  estimatedDeduction: number;
  estimatedTaxSaving: number;
  notes: string[];
}

const INCOME_TAX_RATE = 0.32;

export const DEDUCTION_RULES: Record<DeductionType, DeductionRule> = {
  reseavdrag: {
    type: "reseavdrag",
    label: "Work Travel (Reseavdrag)",
    labelSv: "Reseavdrag",
    rate: 1.0,
    explanation:
      "Commuting costs between home and workplace are deductible — but only the amount exceeding SEK 11,000/year. Public transport passes, congestion tax, and work parking all count. Car travel is deductible only if it saves ≥2 hours/day vs. public transport.",
    howToClaim:
      "Declare under 'Resor till och från arbetet' in your tax return. Keep SL/Västtrafik receipts and Trängselskat statements. Skatteverket does NOT pre-fill this — you must claim it yourself.",
  },
  trangselskatt: {
    type: "trangselskatt",
    label: "Congestion Tax (Trängselskatt)",
    labelSv: "Trängselskatt",
    rate: 1.0,
    explanation:
      "Congestion tax paid when driving to/from work counts toward your Reseavdrag total. Included in the SEK 11,000 threshold calculation.",
    howToClaim:
      "Add to your Reseavdrag total. Transportstyrelsen sends an annual statement — use that as documentation.",
  },
  ranteavdrag: {
    type: "ranteavdrag",
    label: "Loan Interest (Ränteavdrag)",
    labelSv: "Ränteavdrag",
    rate: 0.3,
    explanation:
      "Interest paid on loans is deductible at 30% (up to SEK 100,000 interest/year) or 21% above that. NEW from 2025: unsecured consumer loans (Resurs Bank, Santander, Avida, Riverty) — only 50% of the interest qualifies before the 30% deduction applies. Mortgage interest is pre-filled by Skatteverket.",
    howToClaim:
      "Get your annual interest statement (årsbesked) from each lender. Mortgage is auto-filled. Consumer loan interest must be entered manually in the declaration.",
  },
  rot: {
    type: "rot",
    label: "Home Repairs — ROT",
    labelSv: "ROT-avdrag",
    maxAmount: 50000,
    rate: 0.3,
    explanation:
      "ROT gives a 30% tax reduction on labour costs for repairs, conversions, or extensions of your own home (villa or bostadsrätt). Maximum SEK 50,000/person/year. Materials (Bauhaus, Biltema) do NOT qualify — only labour invoices from F-tax registered companies.",
    howToClaim:
      "ROT is usually applied directly at the invoice — the company deducts it and claims it from Skatteverket. If not applied, claim it in the declaration under 'Skattereduktion för ROT-arbete'.",
  },
  rut: {
    type: "rut",
    label: "Household Services — RUT",
    labelSv: "RUT-avdrag",
    maxAmount: 75000,
    rate: 0.5,
    explanation:
      "RUT gives a 50% tax reduction on labour costs for household services: cleaning, childcare, gardening, snow removal, IT help at home, moving assistance (packing/loading only). Maximum SEK 75,000/person/year combined with ROT.",
    howToClaim:
      "Applied directly at invoice by the service company. Verify it appears in your Skatteverket 'Mina sidor' under skattereduktioner.",
  },
  akassa: {
    type: "akassa",
    label: "Union / A-kassa Fees",
    labelSv: "A-kasseavdrag",
    rate: 0.25,
    explanation:
      "From 2025, 25% of your paid a-kassa (unemployment insurance) fees are deductible as a tax credit (skattereduktion). This is automatically calculated by Skatteverket from IF Metall / union reports.",
    howToClaim:
      "Automatically applied — verify it appears on your declaration. No manual action needed if your union reports correctly.",
  },
  arbetsverktyg: {
    type: "arbetsverktyg",
    label: "Work Tools & Software",
    labelSv: "Arbetsverktyg & programvara",
    rate: 1.0,
    explanation:
      "Tools, software, and equipment required for your job that your employer does NOT provide or reimburse are deductible as employment expenses. This includes professional software subscriptions (coding tools, design tools, domain names) if used for work.",
    howToClaim:
      "Declare under 'Övriga utgifter' in the tax return. You must be able to prove the expense is necessary for your work and not reimbursed by your employer. Keep invoices.",
  },
  tjansteresor: {
    type: "tjansteresor",
    label: "Business Travel",
    labelSv: "Tjänsteresor",
    rate: 1.0,
    explanation:
      "Travel costs for business trips (not commuting) are deductible. Standard rate: SEK 145/day for meals within Sweden. Accommodation and transport at actual cost. Any employer reimbursement reduces the deductible amount.",
    howToClaim:
      "Declare under 'Resor i tjänsten' in the tax return. Keep receipts and a travel log showing purpose, destination, and dates.",
  },
  pension: {
    type: "pension",
    label: "Private Pension Savings (IPS)",
    labelSv: "Pensionssparande (IPS)",
    maxAmount: 35000,
    rate: 1.0,
    explanation:
      "Contributions to a private IPS (Individuellt pensionssparande) account are deductible up to SEK 35,000/year — but only if you are NOT covered by a full employer pension plan. Regular ISK (investeringssparkonto) savings at Avanza/Nordnet are NOT deductible.",
    howToClaim:
      "Declare under 'Avdrag för pensionssparande'. Your IPS provider (Avanza, Nordnet) reports contributions to Skatteverket. Verify the amount is pre-filled.",
  },
};

const COMMUTE_PATTERNS = [
  /\bsl\b/i,
  /\bvästtrafik\b/i,
  /\bvasttrafik\b/i,
  /\bskånetrafiken\b/i,
  /\bab\s+storstockholm\b/i,
  /\bresplus\b/i,
  /\bkollektivtrafik\b/i,
  /\bv.stra\s+g.talands/i,
];

const CONGESTION_PATTERNS = [/\btr[äa]ngselskat\b/i, /\btransportstyrel/i, /\btrafikverket\b/i];
const CONSUMER_LOAN_PATTERNS = [
  /\bresurs\s*bank\b/i,
  /\bresurs\b/i,
  /\bsantander\b/i,
  /\bavida\s*finans\b/i,
  /\briverty\b/i,
  /\bsvea\s*p-?service\b/i,
];
const WORK_SOFTWARE_PATTERNS = [
  /\bcodeium\b/i,
  /\bvercel\b/i,
  /\bneon\.tech\b/i,
  /\bname-?cheap\b/i,
  /\breplit\b/i,
  /\bzoho\b/i,
  /\bgithub\b/i,
  /\bdigital\s*ocean\b/i,
  /\bwindsurf\b/i,
  /\bopenart\b/i,
  /\bpaddle\.net\b/i,
];
const AKASSA_PATTERNS = [
  /\bif\s+metall\b/i,
  /\ba-kassa\b/i,
  /\bakassa\b/i,
  /\bfacket\b/i,
  /\bunionen\b/i,
];
const PARKING_WORK_PATTERNS = [/\bparkering\b/i, /\bparking\b/i, /\bparkster\b/i, /\beasypark\b/i];
const FINANCE_PATTERNS = CONSUMER_LOAN_PATTERNS;

function matches(desc: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(desc));
}

export function analyzeDeductions(txs: Transaction[]): DetectedDeduction[] {
  const debits = txs.filter((t) => t.amount < 0);
  const results: DetectedDeduction[] = [];

  const commuteTxs = debits.filter((t) => matches(t.description, COMMUTE_PATTERNS));
  const congestionTxs = debits.filter((t) => matches(t.description, CONGESTION_PATTERNS));
  const allCommuteTotal = [...commuteTxs, ...congestionTxs].reduce((s, t) => s + Math.abs(t.amount), 0);
  const commuteThreshold = 11000;
  const commuteDeductible = Math.max(0, allCommuteTotal - commuteThreshold);

  if (allCommuteTotal > 0) {
    const notes: string[] = [];
    if (allCommuteTotal < commuteThreshold) {
      notes.push(
        `Your total commuting spend (${allCommuteTotal.toFixed(0)} SEK) is below the SEK 11,000 threshold — no deduction yet.`,
      );
    } else {
      notes.push(`SEK ${commuteThreshold.toLocaleString()} threshold exceeded — ${commuteDeductible.toFixed(0)} deductible.`);
    }
    notes.push("Car commute deductions require saving at least 2 hours/day versus public transport.");
    results.push({
      rule: DEDUCTION_RULES.reseavdrag,
      transactions: [...commuteTxs, ...congestionTxs],
      totalSpend: allCommuteTotal,
      estimatedDeduction: commuteDeductible,
      estimatedTaxSaving: commuteDeductible * INCOME_TAX_RATE,
      notes,
    });
  }

  const financeTxs = debits.filter((t) => matches(t.description, FINANCE_PATTERNS));
  if (financeTxs.length > 0) {
    const totalPayments = financeTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const estimatedInterest = totalPayments * 0.15;
    const deductibleInterest = estimatedInterest * 0.5;
    const taxSaving = deductibleInterest * 0.3;
    results.push({
      rule: DEDUCTION_RULES.ranteavdrag,
      transactions: financeTxs,
      totalSpend: totalPayments,
      estimatedDeduction: deductibleInterest,
      estimatedTaxSaving: taxSaving,
      notes: [
        "Only the interest portion is deductible, not principal repayment.",
        "Use annual lender statements (årsbesked) for exact values.",
      ],
    });
  }

  const softwareTxs = debits.filter((t) => matches(t.description, WORK_SOFTWARE_PATTERNS));
  if (softwareTxs.length > 0) {
    const total = softwareTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    results.push({
      rule: DEDUCTION_RULES.arbetsverktyg,
      transactions: softwareTxs,
      totalSpend: total,
      estimatedDeduction: total,
      estimatedTaxSaving: total * INCOME_TAX_RATE,
      notes: ["Only deductible if required for work and not employer reimbursed."],
    });
  }

  const akassaTxs = debits.filter((t) => matches(t.description, AKASSA_PATTERNS));
  if (akassaTxs.length > 0) {
    const total = akassaTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const deductible = total * 0.25;
    results.push({
      rule: DEDUCTION_RULES.akassa,
      transactions: akassaTxs,
      totalSpend: total,
      estimatedDeduction: deductible,
      estimatedTaxSaving: deductible,
      notes: ["Typically auto-applied by Skatteverket if union reports are correct."],
    });
  }

  const parkingTxs = debits.filter((t) => matches(t.description, PARKING_WORK_PATTERNS));
  if (parkingTxs.length > 0) {
    const total = parkingTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    results.push({
      rule: DEDUCTION_RULES.reseavdrag,
      transactions: parkingTxs,
      totalSpend: total,
      estimatedDeduction: 0,
      estimatedTaxSaving: 0,
      notes: ["Work parking can count toward total reseavdrag calculations."],
    });
  }

  return results;
}

export function totalEstimatedSaving(deductions: DetectedDeduction[]): number {
  const seen = new Set<DeductionType>();
  let total = 0;
  for (const d of deductions) {
    if (!seen.has(d.rule.type)) {
      total += d.estimatedTaxSaving;
      seen.add(d.rule.type);
    }
  }
  return total;
}
