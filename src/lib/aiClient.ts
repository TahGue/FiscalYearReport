import type { AIMessage, AISettings } from "@/types/finance";

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OllamaResponse {
  message?: { content?: string };
}

export async function requestBudgetAdvice(settings: AISettings, messages: AIMessage[]): Promise<string> {
  if (settings.provider === "ollama") {
    const res = await fetch(`${stripTrailingSlash(settings.baseUrl)}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`Ollama request failed (${res.status})`);
    }
    const data = (await res.json()) as OllamaResponse;
    return data.message?.content?.trim() || "No response from Ollama.";
  }

  if (!settings.apiKey.trim()) {
    throw new Error("API key is required for OpenAI-compatible providers.");
  }

  const res = await fetch(`${stripTrailingSlash(settings.baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status})`);
  }

  const data = (await res.json()) as OpenAIResponse;
  return data.choices?.[0]?.message?.content?.trim() || "No response from model.";
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export async function fetchOllamaModels(baseUrl: string): Promise<OllamaModel[]> {
  const res = await fetch(`${stripTrailingSlash(baseUrl)}/api/tags`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Ollama models (${res.status}). Is Ollama running?`);
  }
  const data = (await res.json()) as { models?: OllamaModel[] };
  return data.models ?? [];
}

function stripTrailingSlash(v: string): string {
  return v.replace(/\/+$/, "");
}
