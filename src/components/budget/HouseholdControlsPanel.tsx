"use client";

import type { ContributionModel, ViewScope } from "@/components/budget/BudgetProvider";

interface Props {
  hasPartnerData: boolean;
  viewScope: ViewScope;
  contributionModel: ContributionModel;
  onScopeChange: (scope: ViewScope) => void;
  onContributionModelChange: (model: ContributionModel) => void;
}

export default function HouseholdControlsPanel({
  hasPartnerData,
  viewScope,
  contributionModel,
  onScopeChange,
  onContributionModelChange,
}: Props) {
  if (!hasPartnerData) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <label className="flex items-center gap-2 text-xs text-slate-600" htmlFor="view-scope">
        <span className="font-medium text-slate-700">View:</span>
        <select
          id="view-scope"
          value={viewScope}
          onChange={(event) => onScopeChange(event.target.value as ViewScope)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          <option value="household">Household</option>
          <option value="self">Self only</option>
          <option value="partner">Partner only</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-600" htmlFor="contribution-model">
        <span className="font-medium text-slate-700">Contribution:</span>
        <select
          id="contribution-model"
          value={contributionModel}
          onChange={(event) => onContributionModelChange(event.target.value as ContributionModel)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          <option value="equal">50/50 split</option>
          <option value="income_weighted">Income-weighted</option>
        </select>
      </label>
    </div>
  );
}
