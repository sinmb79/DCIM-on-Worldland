// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title ACLToken
/// @notice Fair Launch ERC-20 token for DCIP on Worldland with zero pre-mine.
contract ACLToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 2_100_000_000 * 10 ** 8;
    uint8 public constant DECIMALS = 8;

    address public minter;
    uint256 public totalBurned;

    event MinterSet(address indexed oldMinter, address indexed newMinter);
    event Burned(address indexed from, uint256 amount);

    /// @notice Deploy the token contract with zero initial supply.
    constructor() ERC20("ACL Token", "ACL") Ownable(msg.sender) {}

    /// @notice Mint ACL to a recipient address.
    /// @param to Recipient of newly minted ACL.
    /// @param amount Amount to mint in 10^-8 ACL units.
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "ACL: not minter");
        require(totalSupply() + amount <= MAX_SUPPLY, "ACL: max supply exceeded");
        _mint(to, amount);
    }

    /// @notice Burn ACL from the caller and track cumulative burns.
    /// @param amount Amount to burn in 10^-8 ACL units.
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        emit Burned(msg.sender, amount);
    }

    /// @notice Burn ACL from an approved account and track cumulative burns.
    /// @param account Account whose allowance-backed tokens will be burned.
    /// @param amount Amount to burn in 10^-8 ACL units.
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit Burned(account, amount);
    }

    /// @notice Set the sole minter address exactly once.
    /// @param newMinter Address of the PoIVerifier contract.
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "ACL: zero address");
        require(minter == address(0), "ACL: minter already set");
        emit MinterSet(minter, newMinter);
        minter = newMinter;
    }

    /// @notice Return token decimals fixed to 8.
    /// @return Number of decimals used by ACL balances.
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
}
