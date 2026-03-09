const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`\n=== DCIP on Worldland deploy (${network.name}) ===`);
  console.log("Deployer:", deployer.address);

  const Token = await ethers.getContractFactory("ACLToken");
  const token = await Token.deploy();
  await token.waitForDeployment();

  const Registry = await ethers.getContractFactory("DCIPRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const Verifier = await ethers.getContractFactory("PoIVerifier");
  const verifier = await Verifier.deploy(await token.getAddress(), await registry.getAddress());
  await verifier.waitForDeployment();

  const Bounty = await ethers.getContractFactory("Bounty");
  const bounty = await Bounty.deploy(await token.getAddress());
  await bounty.waitForDeployment();

  await (await token.setMinter(await verifier.getAddress())).wait();
  await (await registry.setReputationUpdater(await verifier.getAddress())).wait();
  await (await token.renounceOwnership()).wait();

  const output = {
    network: network.name,
    deployer: deployer.address,
    ACLToken: await token.getAddress(),
    DCIPRegistry: await registry.getAddress(),
    PoIVerifier: await verifier.getAddress(),
    Bounty: await bounty.getAddress(),
    ownershipRenounced: (await token.owner()) === ethers.ZeroAddress,
    deployedAt: new Date().toISOString()
  };

  const outputPath = path.join(process.cwd(), "deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("ACLToken:    ", output.ACLToken);
  console.log("DCIPRegistry:", output.DCIPRegistry);
  console.log("PoIVerifier: ", output.PoIVerifier);
  console.log("Bounty:      ", output.Bounty);
  console.log("Owner renounced:", output.ownershipRenounced);
  console.log(`Saved: ${outputPath}`);
  console.log(`ACL_TOKEN_ADDRESS=${output.ACLToken}`);
  console.log(`REGISTRY_ADDRESS=${output.DCIPRegistry}`);
  console.log(`POI_VERIFIER_ADDRESS=${output.PoIVerifier}`);
  console.log(`BOUNTY_ADDRESS=${output.Bounty}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
