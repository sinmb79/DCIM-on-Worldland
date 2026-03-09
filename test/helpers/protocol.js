const { ethers } = require("hardhat");

async function deployProtocolFixture() {
  const [owner, proposer, validatorA, validatorB, validatorC, user] = await ethers.getSigners();

  const token = await (await ethers.getContractFactory("ACLToken")).deploy();
  await token.waitForDeployment();

  const registry = await (await ethers.getContractFactory("DCIPRegistry")).deploy();
  await registry.waitForDeployment();

  const verifier = await (
    await ethers.getContractFactory("PoIVerifier")
  ).deploy(await token.getAddress(), await registry.getAddress());
  await verifier.waitForDeployment();

  const bounty = await (await ethers.getContractFactory("Bounty")).deploy(await token.getAddress());
  await bounty.waitForDeployment();

  await (await token.setMinter(await verifier.getAddress())).wait();
  await (await registry.setReputationUpdater(await verifier.getAddress())).wait();

  const stake = ethers.parseEther("0.001");
  await (await registry.connect(proposer).registerNode(0, "https://proposer.test", { value: stake })).wait();
  await (await registry.connect(validatorA).registerNode(1, "https://validator-a.test", { value: stake })).wait();
  await (await registry.connect(validatorB).registerNode(1, "https://validator-b.test", { value: stake })).wait();
  await (await registry.connect(validatorC).registerNode(1, "https://validator-c.test", { value: stake })).wait();

  return {
    token,
    registry,
    verifier,
    bounty,
    owner,
    proposer,
    validatorA,
    validatorB,
    validatorC,
    user,
    stake
  };
}

async function signProof(signer, queryHash, responseCID) {
  const digest = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "string"], [queryHash, responseCID])
  );
  return signer.signMessage(ethers.getBytes(digest));
}

async function submitValidProof(context, queryText, responseCID) {
  const queryHash = ethers.keccak256(ethers.toUtf8Bytes(queryText));
  const signatures = await Promise.all([
    signProof(context.validatorA, queryHash, responseCID),
    signProof(context.validatorB, queryHash, responseCID),
    signProof(context.validatorC, queryHash, responseCID)
  ]);

  await context.verifier.connect(context.proposer).submitProof(
    queryHash,
    responseCID,
    [context.validatorA.address, context.validatorB.address, context.validatorC.address],
    signatures
  );

  return { queryHash, signatures };
}

module.exports = {
  deployProtocolFixture,
  signProof,
  submitValidProof
};
