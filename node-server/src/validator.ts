/// <reference lib="dom" />

// SPDX-License-Identifier: MIT

import "./env";

const MIN_VALIDATORS = Number.parseInt(process.env.MIN_VALIDATORS || "3", 10);
const PEER_NODES = (process.env.PEER_NODES || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

interface SignaturePayload {
  address: string;
  signature: string;
}

/**
 * Collect validator signatures from peer nodes over HTTP.
 */
export async function collectSignatures(
  queryHash: string,
  responseCID: string
): Promise<{ validators: string[]; signatures: string[] }> {
  if (PEER_NODES.length === 0) {
    throw new Error("No PEER_NODES configured");
  }

  const settled = await Promise.allSettled(
    PEER_NODES.map(async (peer) => {
      const response = await fetch(`${peer.replace(/\/$/, "")}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ queryHash, responseCID }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`${peer} returned ${response.status}`);
      }

      return (await response.json()) as SignaturePayload;
    })
  );

  const validators: string[] = [];
  const signatures: string[] = [];
  const seen = new Set<string>();

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      continue;
    }

    const address = result.value.address?.trim();
    const signature = result.value.signature?.trim();
    const dedupeKey = address.toLowerCase();

    if (!address || !signature || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    validators.push(address);
    signatures.push(signature);
  }

  if (validators.length < MIN_VALIDATORS) {
    throw new Error(`Need ${MIN_VALIDATORS} validators, got ${validators.length}`);
  }

  return { validators, signatures };
}
