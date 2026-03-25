// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentMarket
 * @notice The partner's marketplace contract where external agents are listed.
 *         Accepts X402 payments via the useAgent() function.
 */
contract AgentMarket {
    event AgentUsed(uint256 indexed agentId, address indexed hirer, uint256 paymentAmt);

    function useAgent(uint256 agentId) external payable {
        require(msg.value > 0, "X402: Payment required");
        // In a real scenario, this would trigger the external off-chain agent.
        // For the on-chain registry, we just accept payment and emit the event.
        emit AgentUsed(agentId, msg.sender, msg.value);
    }

    function withdraw() external {
        // Anyone can withdraw for simplicity in this hackathon market, 
        // or just leave funds trapped if it's a throwaway market mock.
        payable(msg.sender).transfer(address(this).balance);
    }
}
