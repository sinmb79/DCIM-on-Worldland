/// <reference lib="dom" />

// SPDX-License-Identifier: MIT

import "../env";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

interface OllamaResponse {
  response: string;
}

/**
 * Run inference against a local Ollama endpoint.
 */
export async function runInference(query: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: query,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaResponse;
  return data.response;
}
