// SPDX-License-Identifier: MIT

import { ethers } from "ethers";

import "./env";

const POI_VERIFIER_ABI = [
  "function submitProof(bytes32 queryHash, string responseCID, address[] validators, bytes[] signatures) external",
  "function currentReward() view returns (uint256)"
];

const REGISTRY_ABI = [
  "function registerNode(uint8 role, string endpoint) external payable",
  "function isActiveNode(address node) view returns (bool)",
  "function nodes(address node) view returns (address owner, uint8 role, string endpoint, uint256 reputation, uint256 stakedAmount, uint256 registeredAt, bool active)"
];

export interface NodeStatus {
  registered: boolean;
  role: string | null;
  reputation: number | null;
  endpoint: string | null;
}

const ROLE_LABELS = ["AGENT", "VALIDATOR", "HUMAN", "RELAY"] as const;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(process.env.WORLDLAND_RPC_URL || "https://rpc.worldland.io");
}

function getWallet(): ethers.Wallet {
  return new ethers.Wallet(getRequiredEnv("NODE_PRIVATE_KEY"), getProvider());
}

function getRegistryContract(signerOrProvider: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(getRequiredEnv("REGISTRY_ADDRESS"), REGISTRY_ABI, signerOrProvider);
}

/**
 * Submit a completed proof to the PoIVerifier contract.
 */
export async function submitProof(
  queryHash: string,
  responseCID: string,
  validators: string[],
  signatures: string[]
): Promise<string> {
  const verifier = new ethers.Contract(getRequiredEnv("POI_VERIFIER_ADDRESS"), POI_VERIFIER_ABI, getWallet());
  const tx = await verifier.submitProof(queryHash, responseCID, validators, signatures);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Return this node's wallet address.
 */
export async function getNodeAddress(): Promise<string> {
  return getWallet().address;
}

/**
 * Check whether this node is registered in DCIPRegistry.
 */
export async function isRegistered(): Promise<boolean> {
  const wallet = getWallet();
  const registry = getRegistryContract(getProvider());
  return registry.isActiveNode(wallet.address);
}

/**
 * Return the on-chain role and reputation for this node.
 */
export async function getNodeStatus(): Promise<NodeStatus> {
  const wallet = getWallet();
  const registry = getRegistryContract(getProvider());
  const record = await registry.nodes(wallet.address);

  if (!record.active) {
    return {
      registered: false,
      role: null,
      reputation: null,
      endpoint: null
    };
  }

  return {
    registered: true,
    role: ROLE_LABELS[Number(record.role)] ?? null,
    reputation: Number(record.reputation),
    endpoint: record.endpoint
  };
}

/**
 * Register this node on-chain with a stake and endpoint.
 */
export async function registerNode(role: number, endpoint: string, stakeWL: string): Promise<string> {
  const registry = getRegistryContract(getWallet());
  const tx = await registry.registerNode(role, endpoint, {
    value: ethers.parseEther(stakeWL)
  });
  const receipt = await tx.wait();
  return receipt.hash;
}
