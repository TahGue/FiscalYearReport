"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOllamaModels, type OllamaModel } from "@/lib/aiClient";
import type { AIProvider, AISettings } from "@/types/finance";

interface Props {
  settings: AISettings;
  onChange: (next: AISettings) => void;
}

const providerLabels: Record<AIProvider, string> = {
  openai: "OpenAI",
  openai_compatible: "OpenAI-kompatibel",
  ollama: "Ollama (lokal)",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export default function AISettingsPanel({ settings, onChange }: Props) {
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaError, setOllamaError] = useState("");
  const [ollamaLoading, setOllamaLoading] = useState(false);

  const setField = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const loadOllamaModels = useCallback(async () => {
    setOllamaLoading(true);
    setOllamaError("");
    try {
      const models = await fetchOllamaModels(settings.baseUrl);
      setOllamaModels(models);
      if (models.length > 0 && !models.find((m) => m.name === settings.model)) {
        onChange({ ...settings, model: models[0].name });
      }
    } catch (e) {
      setOllamaError(e instanceof Error ? e.message : "Kunde inte nå Ollama");
      setOllamaModels([]);
    } finally {
      setOllamaLoading(false);
    }
  }, [onChange, settings]);

  useEffect(() => {
    if (settings.provider === "ollama") {
      void loadOllamaModels();
    } else {
      setOllamaModels([]);
      setOllamaError("");
    }
  }, [settings.provider, loadOllamaModels]);

  const applyProviderPreset = (provider: AIProvider) => {
    if (provider === "openai") {
      onChange({
        ...settings,
        provider,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
      });
      return;
    }
    if (provider === "ollama") {
      onChange({ ...settings, provider, baseUrl: "http://127.0.0.1:11434", model: "", apiKey: "" });
      return;
    }
    onChange({ ...settings, provider });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">AI-leverantörsinställningar</h2>

      <label className="mt-3 grid gap-1 text-sm text-slate-700">
        <span>Leverantör</span>
        <select
          value={settings.provider}
          onChange={(e) => applyProviderPreset(e.target.value as AIProvider)}
          className="rounded-lg border border-slate-300 px-2 py-2"
        >
          {(Object.keys(providerLabels) as AIProvider[]).map((provider) => (
            <option key={provider} value={provider}>
              {providerLabels[provider]}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 grid gap-1 text-sm text-slate-700">
        <span>Bas-URL</span>
        <input
          value={settings.baseUrl}
          onChange={(e) => setField("baseUrl", e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2"
          placeholder="https://api.openai.com/v1"
        />
      </label>

      {settings.provider === "ollama" ? (
        <div className="mt-3 grid gap-1 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Modell</span>
            <button
              onClick={() => void loadOllamaModels()}
              disabled={ollamaLoading}
              className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200 disabled:opacity-50"
            >
              {ollamaLoading ? "Hämtar..." : "Uppdatera modeller"}
            </button>
          </div>
          {ollamaModels.length > 0 ? (
            <select
              value={settings.model}
              onChange={(e) => setField("model", e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2"
            >
              {ollamaModels.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({formatBytes(m.size)})
                </option>
              ))}
            </select>
          ) : (
            <input
              value={settings.model}
              onChange={(e) => setField("model", e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2"
              placeholder="t.ex. llama3.1:8b"
            />
          )}
          {ollamaError && <p className="text-xs text-red-600">{ollamaError}</p>}
        </div>
      ) : (
        <label className="mt-3 grid gap-1 text-sm text-slate-700">
          <span>Modell</span>
          <input
            value={settings.model}
            onChange={(e) => setField("model", e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-2"
            placeholder="gpt-4o-mini"
          />
        </label>
      )}

      {settings.provider !== "ollama" && (
        <label className="mt-3 grid gap-1 text-sm text-slate-700">
          <span>API-nyckel</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setField("apiKey", e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-2"
            placeholder="sk-..."
          />
        </label>
      )}

      <p className="mt-3 text-xs text-slate-500">Inställningar sparas endast i denna webbläsare.</p>
    </div>
  );
}
