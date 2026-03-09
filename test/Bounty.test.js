const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

const { deployProtocolFixture, submitValidProof } = require("./helpers/protocol");

describe("Bounty", function () {
  it("supports the full post-submit-approve lifecycle", async function () {
    const context = await loadFixture(deployProtocolFixture);

    await submitValidProof(context, "bounty setup", "QmBountySetup");

    const proposerBalance = await context.token.balanceOf(context.proposer.address);
    await (
      await context.token.connect(context.proposer).approve(await context.bounty.getAddress(), proposerBalance)
    ).wait();
    await (await context.bounty.connect(context.proposer).postBounty("QmDesc", proposerBalance, 3600)).wait();
    await (await context.bounty.connect(context.user).submitSolution(0, "QmSolution")).wait();
    await (await context.bounty.connect(context.proposer).approveSolution(0, 0)).wait();

    expect(await context.token.balanceOf(context.user.address)).to.equal(proposerBalance);
  });

  it("returns ACL to the poster when an empty bounty is cancelled", async function () {
    const context = await loadFixture(deployProtocolFixture);

    await submitValidProof(context, "cancel setup", "QmCancelSetup");

    const proposerBalance = await context.token.balanceOf(context.proposer.address);
    await (
      await context.token.connect(context.proposer).approve(await context.bounty.getAddress(), proposerBalance)
    ).wait();
    await (await context.bounty.connect(context.proposer).postBounty("QmCancel", proposerBalance, 3600)).wait();

    expect(await context.token.balanceOf(context.proposer.address)).to.equal(0n);

    await (await context.bounty.connect(context.proposer).cancelBounty(0)).wait();

    expect(await context.token.balanceOf(context.proposer.address)).to.equal(proposerBalance);
  });
});
