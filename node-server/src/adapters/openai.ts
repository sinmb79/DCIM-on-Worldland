/// <reference lib="dom" />

// SPDX-License-Identifier: MIT

import "../env";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Run inference against an OpenAI-compatible chat completions endpoint.
 */
export async function runInference(query: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: query }]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  return data.choices[0]?.message?.content ?? "";
}
