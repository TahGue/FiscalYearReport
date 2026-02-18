"use client";

import SkattPanel from "@/components/budget/SkattPanel";
import { useBudget } from "@/components/budget/BudgetProvider";

export default function SkattPage() {
  const { filteredTxs, currency } = useBudget();

  return <SkattPanel txs={filteredTxs} currency={currency} />;
}
