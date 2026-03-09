// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ACLToken.sol";

/// @title Bounty
/// @notice Open market contract for collective intelligence bounties paid in ACL.
contract Bounty {
    enum BountyStatus {
        OPEN,
        CLOSED,
        CANCELLED
    }

    struct BountyInfo {
        address poster;
        string descCID;
        uint256 reward;
        uint256 deadline;
        BountyStatus status;
        uint256 winnerSolutionId;
    }

    struct Solution {
        address submitter;
        string solutionCID;
        uint256 submittedAt;
    }

    ACLToken public immutable aclToken;
    BountyInfo[] public bounties;
    mapping(uint256 => Solution[]) public solutions;

    event BountyPosted(uint256 indexed bountyId, address indexed poster, uint256 reward, string descCID);
    event SolutionSubmitted(uint256 indexed bountyId, uint256 indexed solutionId, address indexed submitter);
    event BountyAwarded(uint256 indexed bountyId, uint256 indexed solutionId, address indexed winner, uint256 reward);
    event BountyCancelled(uint256 indexed bountyId);

    /// @notice Deploy the bounty contract with the ACL token address.
    /// @param token Address of the ACLToken contract.
    constructor(address token) {
        require(token != address(0), "Bounty: zero token");
        aclToken = ACLToken(token);
    }

    /// @notice Post a new bounty funded by ACL already approved for transfer.
    /// @param descCID IPFS CID describing the bounty problem.
    /// @param reward ACL amount escrowed in the contract.
    /// @param duration Number of seconds until the bounty deadline.
    /// @return bountyId Index assigned to the newly created bounty.
    function postBounty(
        string calldata descCID,
        uint256 reward,
        uint256 duration
    ) external returns (uint256 bountyId) {
        require(bytes(descCID).length > 0, "Bounty: empty CID");
        require(reward > 0, "Bounty: zero reward");
        require(duration > 0, "Bounty: zero duration");

        aclToken.transferFrom(msg.sender, address(this), reward);

        bountyId = bounties.length;
        bounties.push(
            BountyInfo({
                poster: msg.sender,
                descCID: descCID,
                reward: reward,
                deadline: block.timestamp + duration,
                status: BountyStatus.OPEN,
                winnerSolutionId: 0
            })
        );

        emit BountyPosted(bountyId, msg.sender, reward, descCID);
    }

    /// @notice Submit a solution for an open bounty before its deadline.
    /// @param bountyId Identifier of the target bounty.
    /// @param solutionCID IPFS CID describing the submitted solution.
    /// @return solutionId Index assigned to the new solution.
    function submitSolution(
        uint256 bountyId,
        string calldata solutionCID
    ) external returns (uint256 solutionId) {
        require(bytes(solutionCID).length > 0, "Bounty: empty CID");

        BountyInfo storage bounty = bounties[bountyId];
        require(bounty.status == BountyStatus.OPEN, "Bounty: not open");
        require(block.timestamp <= bounty.deadline, "Bounty: deadline passed");

        solutionId = solutions[bountyId].length;
        solutions[bountyId].push(
            Solution({submitter: msg.sender, solutionCID: solutionCID, submittedAt: block.timestamp})
        );

        emit SolutionSubmitted(bountyId, solutionId, msg.sender);
    }

    /// @notice Approve a submitted solution and release escrowed ACL to the winner.
    /// @param bountyId Identifier of the bounty to close.
    /// @param solutionId Identifier of the winning solution.
    function approveSolution(uint256 bountyId, uint256 solutionId) external {
        BountyInfo storage bounty = bounties[bountyId];
        require(msg.sender == bounty.poster, "Bounty: not poster");
        require(bounty.status == BountyStatus.OPEN, "Bounty: not open");
        require(solutionId < solutions[bountyId].length, "Bounty: bad solution");

        Solution storage winner = solutions[bountyId][solutionId];
        bounty.status = BountyStatus.CLOSED;
        bounty.winnerSolutionId = solutionId;

        aclToken.transfer(winner.submitter, bounty.reward);
        emit BountyAwarded(bountyId, solutionId, winner.submitter, bounty.reward);
    }

    /// @notice Cancel an open bounty that has not received any solutions.
    /// @param bountyId Identifier of the bounty to cancel.
    function cancelBounty(uint256 bountyId) external {
        BountyInfo storage bounty = bounties[bountyId];
        require(msg.sender == bounty.poster, "Bounty: not poster");
        require(bounty.status == BountyStatus.OPEN, "Bounty: not open");
        require(solutions[bountyId].length == 0, "Bounty: has solutions");

        bounty.status = BountyStatus.CANCELLED;
        aclToken.transfer(bounty.poster, bounty.reward);
        emit BountyCancelled(bountyId);
    }

    /// @notice Return the number of posted bounties.
    /// @return Number of entries in the bounty array.
    function getBountiesCount() external view returns (uint256) {
        return bounties.length;
    }

    /// @notice Return the number of submitted solutions for a bounty.
    /// @param bountyId Identifier of the bounty.
    /// @return Number of submitted solutions.
    function getSolutionsCount(uint256 bountyId) external view returns (uint256) {
        return solutions[bountyId].length;
    }
}
