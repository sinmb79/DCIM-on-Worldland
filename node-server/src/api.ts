/// <reference lib="dom" />

// SPDX-License-Identifier: MIT

import cors from "cors";
import { ethers } from "ethers";
import express from "express";

import "./env";
import { getNodeAddress, getNodeStatus, submitProof } from "./chain";
import { storeResult } from "./ipfs";
import { collectSignatures } from "./validator";

type InferenceRunner = (query: string) => Promise<string>;

interface QueryBody {
  query?: string;
  level?: number;
  sender?: string;
}

interface SignBody {
  queryHash?: string;
  responseCID?: string;
}

let runInference: InferenceRunner;

async function loadAdapter(): Promise<void> {
  const adapter = process.env.AI_ADAPTER || "echo";

  if (adapter === "ollama") {
    ({ runInference } = await import("./adapters/ollama"));
    return;
  }

  if (adapter === "openai") {
    ({ runInference } = await import("./adapters/openai"));
    return;
  }

  ({ runInference } = await import("./adapters/echo"));
}

function createApp(): express.Express {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN?.trim();

  if (corsOrigin) {
    app.use(cors({ origin: corsOrigin.split(",").map((value) => value.trim()) }));
  }

  app.use(express.json({ limit: "1mb" }));

  app.post("/query", async (req, res) => {
    try {
      const body = (req.body ?? {}) as QueryBody;
      const query = body.query?.trim();
      const level = Number.isFinite(body.level) ? Number(body.level) : 1;

      if (!query) {
        return res.status(400).json({ error: "query required" });
      }

      const answer = await runInference(query);
      const nodeAddress = await getNodeAddress();
      const responseCID = await storeResult({
        query,
        answer,
        level,
        sender: body.sender ?? null,
        nodeAddress,
        timestamp: new Date().toISOString()
      });
      const queryHash = ethers.keccak256(ethers.toUtf8Bytes(query));
      const { validators, signatures } = await collectSignatures(queryHash, responseCID);
      const txHash = await submitProof(queryHash, responseCID, validators, signatures);

      return res.json({ responseCID, answer, txHash, queryHash });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/sign", async (req, res) => {
    try {
      const body = (req.body ?? {}) as SignBody;

      if (!body.queryHash || !body.responseCID) {
        return res.status(400).json({ error: "queryHash and responseCID required" });
      }

      const wallet = new ethers.Wallet(process.env.NODE_PRIVATE_KEY || "");
      const digest = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "string"], [body.queryHash, body.responseCID])
      );
      const signature = await wallet.signMessage(ethers.getBytes(digest));

      return res.json({ address: wallet.address, signature });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/status", async (_req, res) => {
    try {
      const address = await getNodeAddress();
      const status = await getNodeStatus();

      return res.json({
        address,
        registered: status.registered,
        role: status.role,
        reputation: status.reputation,
        endpoint: status.endpoint,
        adapter: process.env.AI_ADAPTER || "echo"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: Date.now()
    });
  });

  return app;
}

async function start(): Promise<void> {
  await loadAdapter();
  const app = createApp();
  const port = Number.parseInt(process.env.PORT || "3000", 10);

  app.listen(port, () => {
    console.log(`DCIP Node Server listening on port ${port}`);
    console.log(`Adapter: ${process.env.AI_ADAPTER || "echo"}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
