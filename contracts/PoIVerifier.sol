// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "./ACLToken.sol";
import "./DCIPRegistry.sol";

/// @title PoIVerifier
/// @notice Verifies proof-of-inference submissions and distributes ACL rewards.
contract PoIVerifier {
    using ECDSA for bytes32;

    uint256 public constant HALVING_INTERVAL = 12_614_400;
    uint256 public constant INITIAL_REWARD = 84 * 10 ** 8;
    uint256 public constant MIN_SIGNATURES = 3;
    uint256 public constant PROPOSER_SHARE = 60;

    ACLToken public immutable aclToken;
    DCIPRegistry public immutable registry;

    mapping(bytes32 => bool) public processedProofs;
    uint256 public totalProofs;

    event ProofVerified(
        bytes32 indexed queryHash,
        string responseCID,
        address indexed proposer,
        uint256 proposerReward,
        uint256 validatorReward,
        uint256 blockNumber
    );
    event BlockBurned(uint256 indexed blockNumber, uint256 amount);

    /// @notice Deploy the verifier with its token and registry dependencies.
    /// @param token Address of the ACLToken contract.
    /// @param registryAddress Address of the DCIPRegistry contract.
    constructor(address token, address registryAddress) {
        require(token != address(0), "PoI: zero token");
        require(registryAddress != address(0), "PoI: zero registry");

        aclToken = ACLToken(token);
        registry = DCIPRegistry(registryAddress);
    }

    /// @notice Submit a proof-of-inference after collecting validator signatures.
    /// @param queryHash keccak256 hash of the original query string.
    /// @param responseCID IPFS CID containing the inference response payload.
    /// @param validators Ordered list of validator addresses that signed the proof.
    /// @param signatures Ordered list of signatures matching the validator array.
    function submitProof(
        bytes32 queryHash,
        string calldata responseCID,
        address[] calldata validators,
        bytes[] calldata signatures
    ) external {
        require(bytes(responseCID).length > 0, "PoI: empty CID");
        require(validators.length == signatures.length, "PoI: length mismatch");
        require(validators.length >= MIN_SIGNATURES, "PoI: not enough validators");

        bytes32 proofId = keccak256(abi.encodePacked(queryHash, responseCID));
        require(!processedProofs[proofId], "PoI: already processed");
        // Lock the proof before any external calls to block replay via reentrancy.
        processedProofs[proofId] = true;

        require(registry.isActiveNode(msg.sender), "PoI: proposer not registered");

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(
            keccak256(abi.encodePacked(queryHash, responseCID))
        );

        for (uint256 i = 0; i < validators.length; i++) {
            require(validators[i] != msg.sender, "PoI: proposer cannot validate");
            require(registry.isActiveNode(validators[i]), "PoI: validator not registered");
            require(digest.recover(signatures[i]) == validators[i], "PoI: invalid signature");

            for (uint256 j = 0; j < i; j++) {
                require(validators[j] != validators[i], "PoI: duplicate validator");
            }
        }

        uint256 reward = currentReward();
        require(reward > 0, "PoI: supply exhausted");

        uint256 proposerReward = (reward * PROPOSER_SHARE) / 100;
        uint256 validatorEach = (reward - proposerReward) / validators.length;

        aclToken.mint(msg.sender, proposerReward);
        for (uint256 i = 0; i < validators.length; i++) {
            aclToken.mint(validators[i], validatorEach);
            registry.updateReputation(validators[i], 2);
        }

        registry.updateReputation(msg.sender, 5);
        totalProofs += 1;

        emit ProofVerified(
            queryHash,
            responseCID,
            msg.sender,
            proposerReward,
            validatorEach,
            block.number
        );
    }

    /// @notice Return the block reward for the current block height.
    /// @return Reward amount in 10^-8 ACL units.
    function currentReward() public view returns (uint256) {
        return _rewardAtBlock(block.number);
    }

    /// @notice Mark an older block as unclaimed and emit its burned reward amount.
    /// @param blockNumber Finalized block number to burn.
    function burnUnclaimedBlock(uint256 blockNumber) external {
        require(blockNumber < block.number - 1, "PoI: block not finalized");

        bytes32 burnId = keccak256(abi.encodePacked("burn", blockNumber));
        require(!processedProofs[burnId], "PoI: already burned");

        processedProofs[burnId] = true;
        emit BlockBurned(blockNumber, _rewardAtBlock(blockNumber));
    }

    /// @notice Compute the reward amount for a specific block height.
    /// @param blockNumber Block number used to determine the active halving era.
    /// @return Reward amount in 10^-8 ACL units.
    function _rewardAtBlock(uint256 blockNumber) internal pure returns (uint256) {
        uint256 halvings = blockNumber / HALVING_INTERVAL;
        if (halvings >= 64) {
            return 0;
        }
        return INITIAL_REWARD >> halvings;
    }
}
