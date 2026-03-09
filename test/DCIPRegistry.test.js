const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DCIPRegistry", function () {
  async function deployRegistryFixture() {
    const [owner, user] = await ethers.getSigners();
    const registry = await (await ethers.getContractFactory("DCIPRegistry")).deploy();
    await registry.waitForDeployment();
    return { registry, owner, user };
  }

  it("allows any address to register with the minimum stake", async function () {
    const { registry, user } = await loadFixture(deployRegistryFixture);
    const stake = ethers.parseEther("0.001");

    await (await registry.connect(user).registerNode(0, "https://user.test", { value: stake })).wait();

    const info = await registry.nodes(user.address);
    expect(await registry.isActiveNode(user.address)).to.equal(true);
    expect(info.endpoint).to.equal("https://user.test");
    expect(info.reputation).to.equal(100n);
  });

  it("returns the staked WL on deregistration", async function () {
    const { registry, user } = await loadFixture(deployRegistryFixture);
    const stake = ethers.parseEther("0.001");

    await (await registry.connect(user).registerNode(2, "https://human.test", { value: stake })).wait();
    const balanceBefore = await ethers.provider.getBalance(user.address);

    const tx = await registry.connect(user).deregisterNode();
    const receipt = await tx.wait();
    const gasPrice = tx.gasPrice ?? receipt.gasPrice ?? 0n;
    const gasCost = receipt.gasUsed * gasPrice;
    const balanceAfter = await ethers.provider.getBalance(user.address);

    expect(balanceAfter + gasCost - balanceBefore).to.be.closeTo(
      stake,
      ethers.parseEther("0.0001")
    );
    expect(await registry.isActiveNode(user.address)).to.equal(false);
  });
});
