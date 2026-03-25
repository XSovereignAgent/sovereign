// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title XSovereign
 * @notice On-chain AI orchestrator agent for X Layer.
 *         Holds funds, hires external agents from X-Agent Market,
 *         logs all agent interactions, and manages X402 payments.
 */
contract XSovereign {
    address public owner;
    address public agentMarket; // Partner's AgentMarket.sol address

    // Agent hire record
    struct HireRecord {
        uint256 agentId;
        address marketplace;
        uint256 amountPaid;
        uint256 timestamp;
        string taskType; // "signal", "security", "execution"
    }

    HireRecord[] public hireHistory;
    uint256 public totalHires;
    uint256 public totalSpent;

    // Events for on-chain audit trail
    event AgentHired(
        uint256 indexed agentId,
        address indexed marketplace,
        uint256 amountPaid,
        string taskType,
        uint256 timestamp
    );

    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event MarketplaceUpdated(address indexed oldMarket, address indexed newMarket);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Set the X-Agent Market contract address
    function setAgentMarket(address _market) external onlyOwner {
        address old = agentMarket;
        agentMarket = _market;
        emit MarketplaceUpdated(old, _market);
    }

    /// @notice Deposit OKB to fund agent hiring
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Hire an agent from X-Agent Market via X402 payment
    /// @param agentId The ID of the agent on X-Agent Market
    /// @param taskType The type of task being outsourced
    function hireAgent(
        uint256 agentId,
        string calldata taskType
    ) external payable onlyOwner {
        require(agentMarket != address(0), "Market not set");
        require(msg.value > 0, "Must send payment");

        // Call useAgent on the marketplace (X402 payment)
        (bool success, ) = agentMarket.call{value: msg.value}(
            abi.encodeWithSignature("useAgent(uint256)", agentId)
        );
        require(success, "Agent hire failed");

        // Record the hire
        hireHistory.push(HireRecord({
            agentId: agentId,
            marketplace: agentMarket,
            amountPaid: msg.value,
            timestamp: block.timestamp,
            taskType: taskType
        }));

        totalHires++;
        totalSpent += msg.value;

        emit AgentHired(agentId, agentMarket, msg.value, taskType, block.timestamp);
    }

    /// @notice Hire an agent from ANY marketplace (not just the default)
    function hireAgentFrom(
        address marketplace,
        uint256 agentId,
        string calldata taskType
    ) external payable onlyOwner {
        require(marketplace != address(0), "Invalid marketplace");
        require(msg.value > 0, "Must send payment");

        (bool success, ) = marketplace.call{value: msg.value}(
            abi.encodeWithSignature("useAgent(uint256)", agentId)
        );
        require(success, "Agent hire failed");

        hireHistory.push(HireRecord({
            agentId: agentId,
            marketplace: marketplace,
            amountPaid: msg.value,
            timestamp: block.timestamp,
            taskType: taskType
        }));

        totalHires++;
        totalSpent += msg.value;

        emit AgentHired(agentId, marketplace, msg.value, taskType, block.timestamp);
    }

    /// @notice Get all hire records
    function getHireHistory() external view returns (HireRecord[] memory) {
        return hireHistory;
    }

    /// @notice Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Withdraw funds (owner only)
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(amount);
        emit FundsWithdrawn(owner, amount);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
