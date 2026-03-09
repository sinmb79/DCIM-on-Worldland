/// <reference lib="dom" />

// SPDX-License-Identifier: MIT

/**
 * Return a deterministic response without calling an external AI backend.
 */
export async function runInference(query: string): Promise<string> {
  return `[ECHO] ${query}`;
}
