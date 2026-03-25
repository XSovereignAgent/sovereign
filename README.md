# 🪐 X-Sovereign AI Terminal

> **The World's First Autonomous Sovereign AI Terminal on X Layer.**

X-Sovereign is a next-generation AI-driven terminal designed for autonomous on-chain trading and agent lifecycle management. Built exclusively for the **OKX X Layer**, it empowers users to orchestrate a squad of specialized AI agents to scan, analyze, and execute trades with absolute sovereignty.

![Screenshot](https://github.com/XSovereignAgent/sovereign/raw/main/public/next.svg) <!-- Replace with real screenshot if available -->

## 🚀 Vision
In the era of agentic commerce, your AI shouldn't just talk—it should act. X-Sovereign provides the interface for autonomous agents to manage a shared treasury, hire specialized help from the X-Agent market, and execute complex DEX swaps via the OKX aggregator.

## ✨ Key Features

- **🤖 Agent Lifecycle Management**: Mint, Hire, and Burn agents directly from the terminal. 
- **📈 Autonomous Trading**: Execute swaps via OKX DEX with real-time gas optimization and autonomous fulfillment.
- **🛡️ Security Multi-Scanner**: Integrated security agents scan your portfolio and trending tokens for honeypots and rug-risk.
- **💎 X-Agent Market Integration**: Specialized roles (Action, Security, Signal) can be hired on-chain using the X402 protocol.
- **🔄 Smart Agent Reuse**: Automated hire-history tracking to prevent redundant payments for agents you already own.
- **📟 Cyber-Terminal UI**: A premium, motion-heavy glassmorphism aesthetic built for professional AI operators.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Blockchain**: Ethers.js v6, X Layer Mainnet
- **Styling**: Tailwind CSS, Framer Motion
- **APIs**: OKX OnchainOS, OKX DEX API
- **Contracts**: XSovereign.sol, AgentMarket.sol

## 📦 Deployment

### 1. Clone the repository
```bash
git clone https://github.com/XSovereignAgent/sovereign.git
cd sovereign
```

### 2. Environment Variables
Create a `.env` file in the root directory:

```env
# X Layer Configuration
NEXT_PUBLIC_XLAYER_RPC="https://rpc.xlayer.tech"
NEXT_PUBLIC_XSOVEREIGN_ADDRESS="0xb327709Ec4f0830722776746b1da42F98d51868e"

# Treasury Wallet (Backend Signer)
DEPLOYER_PRIVATE_KEY="your_private_key_here"

# OKX OnchainOS API
OKX_API_KEY="your_api_key"
OKX_SECRET_KEY="your_secret_key"
OKX_PASSPHRASE="your_passphrase"
```

### 3. Run Locally
```bash
npm install
npm run dev
```

## 🎮 Usage Examples

Type these commands into the terminal:
- `mint a security agent`: Create a new specialized security agent on-chain.
- `scan my wallet`: Analyzes your portfolio for risks using the Security agent.
- `buy 0.0001 usdc`: Orchestrates an Action agent to fulfill a real swap on X Layer.
- `burn agent 3`: Reclaims treasury funds by destroying an exhausted agent.

## 📜 Smart Contracts

- **XSovereign**: `0xb327709Ec4f0830722776746b1da42F98d51868e`
- **AgentMarket**: `0xF53e7cD080211b4c38369f2e5f1A0b9401B5470C`

---

Built with ❤️ for the **OKX X Layer Hackathon**. 
Sovereignty is yours.
