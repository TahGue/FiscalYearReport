import type { Transaction } from "@/types/finance";

export interface TransferMatch {
  from: "self" | "partner";
  to: "self" | "partner";
  amount: number;
  date: string;
  sourceDescription: string;
  targetDescription: string;
  sourceTx: Transaction;
  targetTx: Transaction;
}

export interface ConjointInterconnectionSummary {
  matchedTransfers: TransferMatch[];
  
  // Aggregate sums (matched + keyword-identified)
  selfTotalOutgoingTransfers: number;
  partnerTotalIncomingTransfers: number;
  partnerTotalOutgoingTransfers: number;
  selfTotalIncomingTransfers: number;

  selfToPartnerMonthly: number;
  partnerToSelfMonthly: number;
  netDirectionMonthly: number;
  sharedCategoryOverlapScore: number;
  transferDependencyScore: number;

  // External transactions and true income (excluding matched transfers)
  selfExternalTxs: Transaction[];
  partnerExternalTxs: Transaction[];
  trueSelfIncome: number;
  truePartnerIncome: number;
  trueSelfSpend: number;
  truePartnerSpend: number;
}

const TRANSFER_KEYWORDS = /swish|overfor|överför|transfer|konto|bankgiro|plusgiro|send|sent|payment to|betalning/i;
const ALWAYS_TRANSFER_KEYWORDS = /overforing via internet|överföring via internet|overforing|överföring/i;
const NEGATIVE_KEYWORDS = /lön|salary|inkomst|ersättning|skatteverket|försäkringskassan|csn|ica|coop|willys|systembolaget|hemköp|pressbyrån|apoteket|spotify|netflix|klarna|qasa|trustly|paypal|izettle|payson|apple|google|siba|lidl|netto|åhléns|hm |h&m|stadium|elgiganten|mediamarkt|telia|telenor|tre |comviq|halebop/i;
const ACCOUNT_TOKEN_REGEX = /\d{5,}/g;
const MIN_ACCOUNT_MATCH_DIGITS = 9;

function normalizeDescription(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dateDistanceDays(a: string, b: string): number {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(second)) return 99;
  return Math.abs(first - second) / (24 * 60 * 60 * 1000);
}

function normalizeDigits(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.replace(/^0+/, "");
}

function extractNumericTokens(value: string): string[] {
  const mergedAdjacent = value.replace(/(\d)[\s\-/.]+(?=\d)/g, "$1");
  const tokens = mergedAdjacent.match(ACCOUNT_TOKEN_REGEX) ?? [];
  return tokens
    .map((token) => normalizeDigits(token))
    .filter((token) => token.length >= 5);
}

function swedbankTransferTail(token: string): string | null {
  // Swedbank transfer representations can vary across banks:
  // - 15 digits: CCCCC0 + 9 account digits
  // - 14 digits: CCCC0 + 9 account digits
  // Both share the same trailing 10 digits (0 + 9 account digits).
  const fifteen = token.match(/^[78]\d{4}0\d{9}$/);
  if (fifteen) return token.slice(-10);

  const fourteen = token.match(/^[78]\d{3}0\d{9}$/);
  if (fourteen) return token.slice(-10);

  return null;
}

function expandComparableAccountForms(token: string): Set<string> {
  const forms = new Set<string>([token]);

  const swedbankTail = swedbankTransferTail(token);
  if (swedbankTail) {
    forms.add(swedbankTail);
    forms.add(swedbankTail.slice(1));
  }

  // Nordea personkonto can be represented as 3300 + personnummer(10 digits)
  if (/^3300\d{10}$/.test(token)) forms.add(token.slice(4));
  if (/^\d{10}$/.test(token)) forms.add(`3300${token}`);

  return forms;
}

function accountTokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;

  const formsA = expandComparableAccountForms(a);
  const formsB = expandComparableAccountForms(b);

  for (const first of formsA) {
    for (const second of formsB) {
      if (first === second) return true;
      const shortest = Math.min(first.length, second.length);
      if (shortest >= MIN_ACCOUNT_MATCH_DIGITS && (first.endsWith(second) || second.endsWith(first))) {
        return true;
      }
    }
  }

  return false;
}

/** Extract all unique account numbers from a transaction set */
function extractAccountNumbers(txs: Transaction[]): Set<string> {
  const accounts = new Set<string>();
  for (const tx of txs) {
    const acc = normalizeDigits(tx.account?.trim() ?? "");
    if (acc.length >= MIN_ACCOUNT_MATCH_DIGITS) accounts.add(acc);
  }
  return accounts;
}

/** Check if description or account field contains any of the given account numbers */
function mentionsAccount(tx: Transaction, accountNumbers: Set<string>): boolean {
  if (accountNumbers.size === 0) return false;
  const tokens = [
    ...extractNumericTokens(tx.description ?? ""),
    ...extractNumericTokens(tx.account ?? ""),
  ];

  for (const token of tokens) {
    for (const num of accountNumbers) {
      if (accountTokensMatch(token, num)) return true;
    }
  }
  return false;
}

/** Check if a description looks like a bare account/reference number (mostly digits) */
function looksLikeBareAccountNumber(tx: Transaction): boolean {
  const desc = (tx.description ?? "").trim();
  if (!desc) return false;
  const numericLike = desc.replace(/[\s\-/.]/g, "");
  if (!/^\d+$/.test(numericLike)) return false;
  const normalized = normalizeDigits(numericLike);
  return normalized.length >= 10 && normalized.length <= 14;
}

function hasTransferSignal(tx: Transaction, otherAccountNumbers?: Set<string>): boolean {
  const desc = normalizeDescription(tx.description ?? "");
  if (ALWAYS_TRANSFER_KEYWORDS.test(desc)) return true;
  if (NEGATIVE_KEYWORDS.test(desc)) return false;
  const hasCounterpartyAccounts = (otherAccountNumbers?.size ?? 0) > 0;
  if (hasCounterpartyAccounts && otherAccountNumbers && mentionsAccount(tx, otherAccountNumbers)) return true;
  if (!hasCounterpartyAccounts && looksLikeBareAccountNumber(tx)) return true;
  return TRANSFER_KEYWORDS.test(desc);
}

function hasNegativeSignal(tx: Transaction): boolean {
  const desc = normalizeDescription(tx.description ?? "");
  return NEGATIVE_KEYWORDS.test(desc);
}

function amountTolerance(amount: number): number {
  const abs = Math.abs(amount);
  return Math.max(25, abs * 0.05);
}

interface MatchCandidate {
  outgoingIndex: number;
  incomingIndex: number;
  amountDiff: number;
  dayDiff: number;
  score: number;
}

function monthlyAverageFromMatches(matches: TransferMatch[]): number {
  if (matches.length === 0) return 0;
  const byMonth = new Map<string, number>();
  for (const match of matches) {
    const month = match.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + match.amount);
  }
  const totals = Array.from(byMonth.values());
  return totals.reduce((sum, value) => sum + value, 0) / totals.length;
}

function collectSpendByCategory(txs: Transaction[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const category = tx.category ?? "Övrigt";
    out.set(category, (out.get(category) ?? 0) + Math.abs(tx.amount));
  }
  return out;
}

function calculateSharedCategoryOverlap(selfTxs: Transaction[], partnerTxs: Transaction[]): number {
  const self = collectSpendByCategory(selfTxs);
  const partner = collectSpendByCategory(partnerTxs);
  const categories = new Set([...self.keys(), ...partner.keys()]);
  if (categories.size === 0) return 0;

  let overlapSum = 0;
  let totalWeight = 0;
  for (const category of categories) {
    const a = self.get(category) ?? 0;
    const b = partner.get(category) ?? 0;
    const weight = a + b;
    if (weight <= 0) continue;
    const overlap = 1 - Math.abs(a - b) / weight;
    overlapSum += overlap * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return (overlapSum / totalWeight) * 100;
}

function incomeTotal(txs: Transaction[]): number {
  return txs.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
}

function matchDirectionalTransfers(
  outgoing: Transaction[],
  incoming: Transaction[],
  from: "self" | "partner",
  to: "self" | "partner",
  sourceAccounts: Set<string>,
  targetAccounts: Set<string>,
): TransferMatch[] {
  const candidates: MatchCandidate[] = [];

  for (let outgoingIndex = 0; outgoingIndex < outgoing.length; outgoingIndex += 1) {
    const source = outgoing[outgoingIndex];
    if (hasNegativeSignal(source)) continue;
    
    const sourceAmount = Math.abs(source.amount);
    const sourceSignal = hasTransferSignal(source, targetAccounts);
    const sourceMentionsTarget = mentionsAccount(source, targetAccounts);

    for (let incomingIndex = 0; incomingIndex < incoming.length; incomingIndex += 1) {
      const target = incoming[incomingIndex];
      if (hasNegativeSignal(target)) continue;

      const amountDiff = Math.abs(sourceAmount - target.amount);
      const dayDiff = dateDistanceDays(source.date, target.date);

      if (dayDiff > 7) continue;

      const exactMatch = amountDiff === 0;
      const targetSignal = hasTransferSignal(target, sourceAccounts);
      const targetMentionsSource = mentionsAccount(target, sourceAccounts);
      const tolerance = amountTolerance(sourceAmount);

      const accountCrossRef = sourceMentionsTarget || targetMentionsSource;

      if (!exactMatch) {
        const maxAmountDiff = accountCrossRef ? Math.max(tolerance, 100) : tolerance;
        if (amountDiff > maxAmountDiff) continue;

        if (accountCrossRef) {
          // Account-number cross reference is strong, no extra keyword requirement needed.
        } else {
          if (!sourceSignal && !targetSignal) continue;
        }

        if (!accountCrossRef && !sourceSignal && !targetSignal) continue;
      }

      let score = amountDiff + (dayDiff * 10);
      if (exactMatch) score -= 10000;
      if (accountCrossRef) score -= 5000;
      if (sourceSignal) score -= 50;
      if (targetSignal) score -= 50;

      candidates.push({
        outgoingIndex,
        incomingIndex,
        amountDiff,
        dayDiff,
        score,
      });
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  const usedOutgoing = new Set<number>();
  const usedIncoming = new Set<number>();
  const matches: TransferMatch[] = [];

  for (const candidate of candidates) {
    if (usedOutgoing.has(candidate.outgoingIndex) || usedIncoming.has(candidate.incomingIndex)) continue;

    usedOutgoing.add(candidate.outgoingIndex);
    usedIncoming.add(candidate.incomingIndex);

    const source = outgoing[candidate.outgoingIndex];
    const target = incoming[candidate.incomingIndex];

    matches.push({
      from,
      to,
      amount: Math.abs(source.amount),
      date: source.date,
      sourceDescription: source.description,
      targetDescription: target.description,
      sourceTx: source,
      targetTx: target,
    });
  }

  return matches;
}

function buildMatches(selfTxs: Transaction[], partnerTxs: Transaction[]): TransferMatch[] {
  const selfAccounts = extractAccountNumbers(selfTxs);
  const partnerAccounts = extractAccountNumbers(partnerTxs);

  const selfOutgoing = selfTxs.filter((tx) => tx.amount < 0);
  const selfIncoming = selfTxs.filter((tx) => tx.amount > 0);
  const partnerOutgoing = partnerTxs.filter((tx) => tx.amount < 0);
  const partnerIncoming = partnerTxs.filter((tx) => tx.amount > 0);

  const matches = [
    ...matchDirectionalTransfers(selfOutgoing, partnerIncoming, "self", "partner", selfAccounts, partnerAccounts),
    ...matchDirectionalTransfers(partnerOutgoing, selfIncoming, "partner", "self", partnerAccounts, selfAccounts),
  ];

  return matches.sort((a, b) => b.date.localeCompare(a.date));
}

export function analyzeConjointInterconnection(selfTxs: Transaction[], partnerTxs: Transaction[]): ConjointInterconnectionSummary {
  const selfAccounts = extractAccountNumbers(selfTxs);
  const partnerAccounts = extractAccountNumbers(partnerTxs);
  const matches = buildMatches(selfTxs, partnerTxs);

  const selfToPartner = matches.filter((m) => m.from === "self");
  const partnerToSelf = matches.filter((m) => m.from === "partner");

  const selfToPartnerMonthly = monthlyAverageFromMatches(selfToPartner);
  const partnerToSelfMonthly = monthlyAverageFromMatches(partnerToSelf);

  // Compute external transactions (exclude matched internal transfers AND
  // any unmatched transactions that look like transfers via keywords, account numbers, or bare numeric descriptions)
  const matchedSelfTxRefs = new Set(
    matches.flatMap((m) => (m.from === "self" ? [m.sourceTx] : [m.targetTx]))
  );
  const matchedPartnerTxRefs = new Set(
    matches.flatMap((m) => (m.from === "partner" ? [m.sourceTx] : [m.targetTx]))
  );

  const isExternalSelf = (tx: Transaction) =>
    !matchedSelfTxRefs.has(tx) && (!hasTransferSignal(tx, partnerAccounts) || hasNegativeSignal(tx));
  const isExternalPartner = (tx: Transaction) =>
    !matchedPartnerTxRefs.has(tx) && (!hasTransferSignal(tx, selfAccounts) || hasNegativeSignal(tx));

  const selfExternalTxs = selfTxs.filter(isExternalSelf);
  const partnerExternalTxs = partnerTxs.filter(isExternalPartner);

  const trueSelfIncome = incomeTotal(selfExternalTxs);
  const truePartnerIncome = incomeTotal(partnerExternalTxs);
  const combinedIncome = trueSelfIncome + truePartnerIncome;

  const trueSelfSpend = selfExternalTxs.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const truePartnerSpend = partnerExternalTxs.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const transferVolume = matches.reduce((sum, item) => sum + item.amount, 0);
  const transferDependencyScore = combinedIncome > 0 ? Math.min(100, (transferVolume / combinedIncome) * 100) : 0;

  // Calculate aggregates
  const selfOutgoingTransfers = selfTxs.filter((tx) => tx.amount < 0 && hasTransferSignal(tx, partnerAccounts));
  const partnerIncomingTransfers = partnerTxs.filter((tx) => tx.amount > 0 && hasTransferSignal(tx, selfAccounts));
  const partnerOutgoingTransfers = partnerTxs.filter((tx) => tx.amount < 0 && hasTransferSignal(tx, selfAccounts));
  const selfIncomingTransfers = selfTxs.filter((tx) => tx.amount > 0 && hasTransferSignal(tx, partnerAccounts));

  const selfTotalOutgoingTransfers = selfOutgoingTransfers.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const partnerTotalIncomingTransfers = partnerIncomingTransfers.reduce((sum, tx) => sum + tx.amount, 0);
  const partnerTotalOutgoingTransfers = partnerOutgoingTransfers.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const selfTotalIncomingTransfers = selfIncomingTransfers.reduce((sum, tx) => sum + tx.amount, 0);

  return {
    matchedTransfers: matches,
    selfTotalOutgoingTransfers,
    partnerTotalIncomingTransfers,
    partnerTotalOutgoingTransfers,
    selfTotalIncomingTransfers,
    selfToPartnerMonthly,
    partnerToSelfMonthly,
    netDirectionMonthly: selfToPartnerMonthly - partnerToSelfMonthly,
    sharedCategoryOverlapScore: calculateSharedCategoryOverlap(selfTxs, partnerTxs),
    transferDependencyScore,
    selfExternalTxs,
    partnerExternalTxs,
    trueSelfIncome,
    truePartnerIncome,
    trueSelfSpend,
    truePartnerSpend,
  };
}

export function buildConjointInterconnectionContext(summary: ConjointInterconnectionSummary, currency: string): string {
  const lines: string[] = [];
  lines.push(`Aggregate self outgoing transfers: ${summary.selfTotalOutgoingTransfers.toFixed(0)} ${currency}`);
  lines.push(`Aggregate partner incoming transfers: ${summary.partnerTotalIncomingTransfers.toFixed(0)} ${currency}`);
  lines.push(`Aggregate partner outgoing transfers: ${summary.partnerTotalOutgoingTransfers.toFixed(0)} ${currency}`);
  lines.push(`Aggregate self incoming transfers: ${summary.selfTotalIncomingTransfers.toFixed(0)} ${currency}`);
  lines.push(`Estimated 1:1 matched monthly transfer self->partner: ${summary.selfToPartnerMonthly.toFixed(0)} ${currency}`);
  lines.push(`Estimated 1:1 matched monthly transfer partner->self: ${summary.partnerToSelfMonthly.toFixed(0)} ${currency}`);
  lines.push(`Estimated net transfer direction: ${summary.netDirectionMonthly.toFixed(0)} ${currency}`);
  lines.push(`Shared category overlap score: ${summary.sharedCategoryOverlapScore.toFixed(0)}/100`);
  lines.push(`Transfer dependency score: ${summary.transferDependencyScore.toFixed(0)}/100`);
  lines.push(
    `Recent matched transfers: ${summary.matchedTransfers
      .slice(0, 6)
      .map((match) => `${match.date} ${match.from}->${match.to} ${match.amount.toFixed(0)} ${currency}`)
      .join(" | ") || "none"}`,
  );
  return lines.join("\n");
}
