import { basicInsights, detectAnomalies, detectRecurring } from "@/lib/analyze";
import { buildForecast, computeHealthScore, detectSubscriptions } from "@/lib/optimizer";
import type { Transaction } from "@/types/finance";

export function buildFinancialContext(txs: Transaction[], currency = "SEK"): string {
  const insights = basicInsights(txs);
  const anomalies = detectAnomalies(txs).slice(0, 10);
  const recurring = detectRecurring(txs).slice(0, 10);
  const subscriptions = detectSubscriptions(txs).slice(0, 8);
  const forecast = buildForecast(txs);
  const health = computeHealthScore(txs, subscriptions);

  return [
    `Currency: ${currency}`,
    `Transactions loaded: ${txs.length}`,
    `Income: ${insights.income.toFixed(2)} ${currency}`,
    `Spending: ${insights.spend.toFixed(2)} ${currency}`,
    `Net: ${insights.net.toFixed(2)} ${currency}`,
    `Top merchants: ${insights.topMerchants.map(([m, v]) => `${m} (${v.toFixed(0)} ${currency})`).join(", ") || "none"}`,
    `Anomalies: ${anomalies.map((a) => `${a.date}: ${a.description} ${Math.abs(a.amount).toFixed(0)} ${currency} (${a.reason})`).join(" | ") || "none"}`,
    `Recurring payments: ${recurring.map((r) => `${r.merchant} ${Math.abs(r.amount).toFixed(0)} ${currency}/${r.frequency}`).join(", ") || "none"}`,
    `Subscriptions: ${subscriptions.map((s) => `${s.merchant} ${Math.abs(s.amount).toFixed(0)} ${currency}/${s.frequency} (confidence ${(s.confidence * 100).toFixed(0)}%)`).join(", ") || "none"}`,
    `Forecast: 30d ${forecast.in30.toFixed(0)} ${currency}, 60d ${forecast.in60.toFixed(0)} ${currency}, 90d ${forecast.in90.toFixed(0)} ${currency}, riskDate ${forecast.riskDate ?? "none"}`,
    `Health score: ${health.score}/100 grade ${health.grade}, savingsRate ${health.savingsRate.toFixed(1)}%, subscriptionBurden ${health.subscriptionBurden.toFixed(1)}%`,
  ].join("\n");
}
