// SPDX-License-Identifier: MIT

import "./env";

type IpfsClient = {
  add: (data: string, options: { pin: boolean }) => Promise<{ cid: { toString(): string } }>;
  cat: (cid: string) => AsyncIterable<Uint8Array>;
};

let clientPromise: Promise<IpfsClient> | null = null;

async function getClient(): Promise<IpfsClient> {
  if (!clientPromise) {
    clientPromise = import("kubo-rpc-client").then(({ create }) =>
      create({ url: process.env.IPFS_API_URL || "http://localhost:5001" }) as unknown as IpfsClient
    );
  }

  return clientPromise;
}

/**
 * Store a JSON-serializable result in IPFS and return its CID.
 */
export async function storeResult(data: Record<string, unknown>): Promise<string> {
  const client = await getClient();
  const { cid } = await client.add(JSON.stringify(data), { pin: true });
  return cid.toString();
}

/**
 * Fetch a JSON payload from IPFS by CID.
 */
export async function fetchResult(cid: string): Promise<Record<string, unknown>> {
  const client = await getClient();
  const chunks: Buffer[] = [];

  for await (const chunk of client.cat(cid)) {
    chunks.push(Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}
