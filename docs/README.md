# BlindHire 🔐

**The world's first confidential, trustless salary-matching protocol powered by Zama's Fully Homomorphic Encryption.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![Network: Sepolia](https://img.shields.io/badge/Network-Sepolia-blue.svg)](https://sepolia.etherscan.io)
[![Powered by Zama](https://img.shields.io/badge/Powered%20by-Zama%20fhEVM-violet.svg)](https://www.zama.ai)

---

## 🧠 The Problem

Companies don't want to reveal their max budget.  
Candidates don't want to reveal how low they'll go.  
Both end up guessing — and both lose.

## 💡 The Solution

BlindHire deploys a smart contract that holds:
- An **encrypted employer maximum budget** (`euint64 max_budget`)
- An **encrypted candidate minimum salary expectation** (`euint64 min_expectation`)

The Zama fhevm evaluates `TFHE.le(min_expectation, max_budget)` — a single homomorphic comparison — and outputs a **match boolean**.

**Result:** The company never knows how low the candidate would have accepted. The candidate never knows how high the company would have paid. The outcome is fair, final, and tamper-proof.

---

## 🌐 Live Demo

| Resource | Link |
|---|---|
| Frontend (Vercel) | _[Deploy to Vercel — update after deployment]_ |
| Smart Contract (Etherscan) | _[Update VITE_CONTRACT_ADDRESS after `npm run deploy:sepolia`]_ |
| Sepolia Faucet | https://sepoliafaucet.com |

---

## 🗂️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24 + Zama `fhevm` / `@fhevm/solidity` |
| FHE Primitives | `TFHE.le()`, `euint64`, `ebool`, `GatewayCaller` |
| Contract Dev | Hardhat, `@nomicfoundation/hardhat-toolbox` |
| Frontend | Vite + React 18 |
| FHE Client | `fhevmjs` (browser-side encryption) |
| Wallet | ethers.js v6 + MetaMask |
| Animations | Framer Motion |
| Notifications | react-hot-toast |
| Routing | react-router-dom v6 |
| Network | Sepolia Testnet (chainId 11155111) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js ≥ 18
- MetaMask (or compatible wallet)
- Sepolia ETH: https://sepoliafaucet.com

### 1. Clone and install

```bash
git clone <your-repo>
cd BlindHire

# Install contract dependencies
cd contracts && npm install && cd ..

# Install frontend dependencies
cd web && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example contracts/.env
cp .env.example web/.env
```

Edit both `.env` files with your keys:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
VITE_CONTRACT_ADDRESS=0x... (update after deployment)
VITE_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_CHAIN_ID=11155111
```

### 3. Deploy the smart contract

```bash
cd contracts
npx hardhat compile
npx hardhat test
npm run deploy:sepolia
```

Copy the deployed contract address into `web/.env` as `VITE_CONTRACT_ADDRESS`.

### 4. Run the frontend

```bash
cd web
npm run dev
```

Open http://localhost:5173

### 5. Deploy frontend to Vercel

```bash
cd web
npx vercel --prod
```

Set the same environment variables in your Vercel project settings.

---

## 🎭 Usage Guide

### As an Employer (Post a Job)
1. Connect MetaMask (Sepolia)
2. Navigate to **Post a Job**
3. Fill in job details
4. Set your maximum salary budget using the slider
5. The value is **encrypted in your browser** using ZamaFHE before submission
6. Click **Encrypt & Post Job** → transaction submits encrypted bytes to Ethereum

### As a Candidate (Apply)
1. Browse **Jobs** — all listings show "Salary: Confidential"
2. Click **Apply Now** on any listing
3. Upload your resume (goes to IPFS — only revealed on match)
4. Set your minimum salary expectation
5. Click **Encrypt & Apply** → encrypted salary goes on-chain

### After Applications
1. **Employer Dashboard**: Click **Run FHE Match** to trigger `resolveApplication()` — the homomorphic comparison runs on-chain
2. Click **Reveal Match Result** — Zama Gateway decrypts the `ebool` and callbacks with true/false
3. On match: Click **Unlock Resume** to access the candidate's IPFS resume

---

## 🧪 Running Tests

```bash
cd contracts
npx hardhat test
```

Tests cover:
- ✅ Job posting with encrypted budget
- ✅ Application with encrypted expectation
- ✅ resolveApplication FHE evaluation
- ✅ Access control (only employer can reveal)
- ✅ Salary confidentiality (never in plaintext views)
- ✅ Multiple candidates per job
- ✅ Closed job rejects applications

---

## 👥 Team

Built for the **Zama Builder Track Hackathon**.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE)
