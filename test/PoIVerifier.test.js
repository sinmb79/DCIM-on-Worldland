const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const { deployProtocolFixture, signProof, submitValidProof } = require("./helpers/protocol");

describe("PoIVerifier", function () {
  it("mints ACL for a valid proof with a 60/40 split", async function () {
    const context = await loadFixture(deployProtocolFixture);

    await submitValidProof(context, "test query", "QmValidProof");

    const reward = await context.verifier.currentReward();
    const proposerReward = (reward * 60n) / 100n;
    const validatorReward = (reward - proposerReward) / 3n;

    expect(await context.token.balanceOf(context.proposer.address)).to.equal(proposerReward);
    expect(await context.token.balanceOf(context.validatorA.address)).to.equal(validatorReward);
    expect(await context.token.balanceOf(context.validatorB.address)).to.equal(validatorReward);
    expect(await context.token.balanceOf(context.validatorC.address)).to.equal(validatorReward);
  });

  it("rejects duplicate proof submissions", async function () {
    const context = await loadFixture(deployProtocolFixture);
    const queryHash = ethers.keccak256(ethers.toUtf8Bytes("replay"));
    const responseCID = "QmReplay";
    const signatures = await Promise.all([
      signProof(context.validatorA, queryHash, responseCID),
      signProof(context.validatorB, queryHash, responseCID),
      signProof(context.validatorC, queryHash, responseCID)
    ]);

    const args = [
      queryHash,
      responseCID,
      [context.validatorA.address, context.validatorB.address, context.validatorC.address],
      signatures
    ];

    await context.verifier.connect(context.proposer).submitProof(...args);
    await expect(context.verifier.connect(context.proposer).submitProof(...args)).to.be.revertedWith(
      "PoI: already processed"
    );
  });

  it("halves the reward at block 12,614,400", async function () {
    const context = await loadFixture(deployProtocolFixture);
    const interval = await context.verifier.HALVING_INTERVAL();
    const currentBlock = BigInt(await ethers.provider.getBlockNumber());

    expect(await context.verifier.currentReward()).to.equal(84n * 10n ** 8n);

    await network.provider.send("hardhat_mine", [ethers.toBeHex(interval - currentBlock)]);

    expect(await context.verifier.currentReward()).to.equal(42n * 10n ** 8n);
  });
});
