const { ethers, network } = require("hardhat");

const ROLE_MAP = {
  AGENT: 0,
  VALIDATOR: 1,
  HUMAN: 2,
  RELAY: 3
};

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const registryAddress = getRequiredEnv("REGISTRY_ADDRESS");
  const nodePrivateKey = getRequiredEnv("NODE_PRIVATE_KEY");
  const endpoint = getRequiredEnv("NODE_ENDPOINT");
  const roleName = (process.env.NODE_ROLE || "AGENT").toUpperCase();
  const role = ROLE_MAP[roleName];
  const stake = process.env.NODE_STAKE_WL || "0.001";

  if (role === undefined) {
    throw new Error(`NODE_ROLE must be one of: ${Object.keys(ROLE_MAP).join(", ")}`);
  }

  const wallet = new ethers.Wallet(nodePrivateKey, ethers.provider);
  const registry = await ethers.getContractAt("DCIPRegistry", registryAddress, wallet);
  const alreadyRegistered = await registry.isActiveNode(wallet.address);

  console.log(`\n=== Register node on ${network.name} ===`);
  console.log("Node address:", wallet.address);
  console.log("Registry:    ", registryAddress);
  console.log("Endpoint:    ", endpoint);
  console.log("Role:        ", roleName);
  console.log("Stake (WL):  ", stake);

  if (alreadyRegistered) {
    const info = await registry.nodes(wallet.address);
    console.log("Node is already registered.");
    console.log("Current endpoint:", info.endpoint);
    console.log("Current role:    ", Number(info.role));
    console.log("Reputation:      ", info.reputation.toString());
    return;
  }

  const tx = await registry.registerNode(role, endpoint, {
    value: ethers.parseEther(stake)
  });
  const receipt = await tx.wait();

  console.log("Registration tx:", receipt.hash);
  console.log("Registration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
