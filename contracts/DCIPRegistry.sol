// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DCIPRegistry
/// @notice Permissionless registry for DCIP nodes staking WL on Worldland.
contract DCIPRegistry {
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant INITIAL_REP = 100;
    uint256 public constant MAX_REP = 1000;

    enum NodeRole {
        AGENT,
        VALIDATOR,
        HUMAN,
        RELAY
    }

    struct NodeInfo {
        address owner;
        NodeRole role;
        string endpoint;
        uint256 reputation;
        uint256 stakedAmount;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => NodeInfo) public nodes;
    address[] public nodeList;
    address public reputationUpdater;

    event NodeRegistered(address indexed node, NodeRole role, string endpoint);
    event NodeDeregistered(address indexed node);
    event ReputationUpdated(address indexed node, int256 delta, uint256 newRep);
    event ReputationUpdaterSet(address indexed updater);

    /// @notice Register a node by staking WL and publishing a public endpoint.
    /// @param role Declared node role in the DCIP network.
    /// @param endpoint Public HTTP endpoint for the node.
    function registerNode(NodeRole role, string calldata endpoint) external payable {
        require(msg.value >= MIN_STAKE, "Registry: insufficient stake");
        require(!nodes[msg.sender].active, "Registry: already registered");
        require(bytes(endpoint).length > 0, "Registry: empty endpoint");

        nodes[msg.sender] = NodeInfo({
            owner: msg.sender,
            role: role,
            endpoint: endpoint,
            reputation: INITIAL_REP,
            stakedAmount: msg.value,
            registeredAt: block.timestamp,
            active: true
        });

        nodeList.push(msg.sender);
        emit NodeRegistered(msg.sender, role, endpoint);
    }

    /// @notice Deregister the caller's node and refund its staked WL.
    function deregisterNode() external {
        require(nodes[msg.sender].active, "Registry: not registered");

        uint256 stake = nodes[msg.sender].stakedAmount;
        nodes[msg.sender].active = false;
        nodes[msg.sender].stakedAmount = 0;

        payable(msg.sender).transfer(stake);
        emit NodeDeregistered(msg.sender);
    }

    /// @notice Update a node's on-chain reputation.
    /// @param node Node address whose reputation will be changed.
    /// @param delta Positive value rewards the node, negative value slashes it.
    function updateReputation(address node, int256 delta) external {
        require(msg.sender == reputationUpdater, "Registry: not authorized");
        require(nodes[node].active, "Registry: node not active");

        uint256 currentRep = nodes[node].reputation;
        uint256 updatedRep;

        if (delta >= 0) {
            uint256 increase = uint256(delta);
            updatedRep = currentRep + increase;
            if (updatedRep > MAX_REP) {
                updatedRep = MAX_REP;
            }
        } else {
            uint256 slash = uint256(-delta);
            updatedRep = currentRep > slash ? currentRep - slash : 0;
        }

        nodes[node].reputation = updatedRep;
        emit ReputationUpdated(node, delta, updatedRep);
    }

    /// @notice Set the contract allowed to update node reputations exactly once.
    /// @param updater Address of the PoIVerifier contract.
    function setReputationUpdater(address updater) external {
        require(updater != address(0), "Registry: zero address");
        require(reputationUpdater == address(0), "Registry: already set");

        reputationUpdater = updater;
        emit ReputationUpdaterSet(updater);
    }

    /// @notice Return the list of currently active node addresses.
    /// @return result Array of active node addresses.
    function getActiveNodes() external view returns (address[] memory result) {
        uint256 count;

        for (uint256 i = 0; i < nodeList.length; i++) {
            if (nodes[nodeList[i]].active) {
                count++;
            }
        }

        result = new address[](count);
        uint256 index;
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (nodes[nodeList[i]].active) {
                result[index++] = nodeList[i];
            }
        }
    }

    /// @notice Check whether a given address is an active registered node.
    /// @param node Address to check.
    /// @return True when the node is currently active.
    function isActiveNode(address node) external view returns (bool) {
        return nodes[node].active;
    }

    /// @notice Return the total number of addresses that have registered.
    /// @return Count of all historical node registrations.
    function totalNodes() external view returns (uint256) {
        return nodeList.length;
    }
}
