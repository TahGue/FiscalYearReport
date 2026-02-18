"use client";

import { BudgetProvider } from "@/components/budget/BudgetProvider";
import BudgetShell from "@/components/budget/BudgetShell";

export default function BudgetAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BudgetProvider>
      <BudgetShell>{children}</BudgetShell>
    </BudgetProvider>
  );
}
