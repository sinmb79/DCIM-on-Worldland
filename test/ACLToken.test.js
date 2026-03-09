const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ACLToken", function () {
  async function deployTokenFixture() {
    const [owner, user] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("ACLToken")).deploy();
    await token.waitForDeployment();
    return { token, owner, user };
  }

  it("keeps totalSupply at zero on deployment", async function () {
    const { token } = await loadFixture(deployTokenFixture);
    expect(await token.totalSupply()).to.equal(0n);
  });

  it("reverts minting from a non-minter", async function () {
    const { token, user } = await loadFixture(deployTokenFixture);
    await expect(token.connect(user).mint(user.address, 1n)).to.be.revertedWith("ACL: not minter");
  });

  it("enforces MAX_SUPPLY", async function () {
    const { token, owner } = await loadFixture(deployTokenFixture);
    const maxSupply = await token.MAX_SUPPLY();

    await (await token.setMinter(owner.address)).wait();
    await (await token.mint(owner.address, maxSupply)).wait();

    expect(await token.totalSupply()).to.equal(maxSupply);
    await expect(token.mint(owner.address, 1n)).to.be.revertedWith("ACL: max supply exceeded");
  });
});
