"use client";

import type { SwedenSettings } from "@/types/sweden";

interface Props {
  settings: SwedenSettings;
  onChange: (next: SwedenSettings) => void;
}

export default function SwedishSettingsPanel({ settings, onChange }: Props) {
  const setProfile = (patch: Partial<SwedenSettings["profile"]>) => {
    onChange({
      ...settings,
      profile: {
        ...settings.profile,
        ...patch,
      },
    });
  };

  const setBenefits = (patch: Partial<SwedenSettings["benefits"]>) => {
    onChange({
      ...settings,
      benefits: {
        ...settings.benefits,
        ...patch,
      },
    });
  };

  const updateContract = (id: string, key: "provider" | "currentMonthlyCost" | "suggestedMonthlyCost", value: string | number) => {
    onChange({
      ...settings,
      contracts: settings.contracts.map((contract) =>
        contract.id === id ? { ...contract, [key]: value } : contract,
      ),
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Svensk profil & ersättningsunderlag</h2>
      <p className="mt-1 text-sm text-slate-500">
        Används för att beräkna bidragsprognoser, riktmärken och regionspecifika råd.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Region</span>
          <select
            value={settings.profile.regionType}
            onChange={(event) => setProfile({ regionType: event.target.value as SwedenSettings["profile"]["regionType"] })}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="storstad">Storstad</option>
            <option value="mellanstor">Mellanstor stad</option>
            <option value="glesbygd">Glesbygd</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Boendeform</span>
          <select
            value={settings.profile.housingType}
            onChange={(event) => setProfile({ housingType: event.target.value as SwedenSettings["profile"]["housingType"] })}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="hyresratt">Hyresrätt</option>
            <option value="brf">BRF</option>
            <option value="villa">Villa</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Hushåll</span>
          <select
            value={settings.profile.familyType}
            onChange={(event) => setProfile({ familyType: event.target.value as SwedenSettings["profile"]["familyType"] })}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="singel">Singel</option>
            <option value="par">Par</option>
            <option value="familj">Familj</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Arbetssätt</span>
          <select
            value={settings.profile.workMode}
            onChange={(event) => setProfile({ workMode: event.target.value as SwedenSettings["profile"]["workMode"] })}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="pendling">Pendling</option>
            <option value="hybrid">Hybrid</option>
            <option value="distans">Distans</option>
          </select>
        </label>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">Underlag för bidragsprognos</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Månadsinkomst (SEK)</span>
          <input
            type="number"
            value={settings.benefits.monthlyIncome}
            onChange={(event) => setBenefits({ monthlyIncome: Number(event.target.value) || 0 })}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Boendekostnad / månad (SEK)</span>
          <input
            type="number"
            value={settings.benefits.monthlyHousingCost}
            onChange={(event) => setBenefits({ monthlyHousingCost: Number(event.target.value) || 0 })}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Antal barn</span>
          <input
            type="number"
            min={0}
            value={settings.benefits.childrenCount}
            onChange={(event) => setBenefits({ childrenCount: Number(event.target.value) || 0 })}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>VAB-dagar / månad</span>
          <input
            type="number"
            min={0}
            value={settings.benefits.vabDaysPerMonth}
            onChange={(event) => setBenefits({ vabDaysPerMonth: Number(event.target.value) || 0 })}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span>Föräldrapenningdagar / månad</span>
          <input
            type="number"
            min={0}
            value={settings.benefits.parentalLeaveDaysPerMonth}
            onChange={(event) => setBenefits({ parentalLeaveDaysPerMonth: Number(event.target.value) || 0 })}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>

        <div className="grid gap-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.benefits.isStudent}
              onChange={(event) => setBenefits({ isStudent: event.target.checked })}
            />
            <span>Studerande (CSN)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.benefits.hasAkassaMembership}
              onChange={(event) => setBenefits({ hasAkassaMembership: event.target.checked })}
            />
            <span>A-kassa medlemskap</span>
          </label>
        </div>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">Avtal för el och försäkring</h3>
      <div className="mt-2 space-y-2">
        {settings.contracts.map((contract) => (
          <div key={contract.id} className="grid gap-2 rounded border border-slate-200 p-3 md:grid-cols-4">
            <input
              value={contract.provider}
              onChange={(event) => updateContract(contract.id, "provider", event.target.value)}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={contract.currentMonthlyCost}
              onChange={(event) => updateContract(contract.id, "currentMonthlyCost", Number(event.target.value) || 0)}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Nuvarande kostnad"
            />
            <input
              type="number"
              value={contract.suggestedMonthlyCost}
              onChange={(event) => updateContract(contract.id, "suggestedMonthlyCost", Number(event.target.value) || 0)}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Möjlig kostnad"
            />
            <div className="rounded bg-slate-50 px-2 py-1.5 text-sm text-slate-600">
              Typ: {contract.type === "el" ? "El" : "Försäkring"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
