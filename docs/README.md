# BlindHire 🔐

**The world's first confidential, trustless salary-matching protocol powered by Zama's Fully Homomorphic Encryption.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](../LICENSE)
[![Network: Sepolia](https://img.shields.io/badge/Network-Sepolia-blue.svg)](https://sepolia.etherscan.io)
[![Powered by Zama](https://img.shields.io/badge/Powered%20by-Zama%20fhEVM-violet.svg)](https://www.zama.ai)

---

## 🧠 The Problem

Companies don't want to reveal their max budget.  
Candidates don't want to reveal how low they'll go.  
Both end up guessing — and both lose.

## 💡 The Solution

VeilPay deploys a smart contract that holds:
- An **encrypted employer maximum budget** (`euint64 max_budget`)
- An **encrypted candidate minimum salary expectation** (`euint64 min_expectation`)
- An **encrypted experience requirement** (`euint8`)
- An **encrypted remote work preference** (`ebool`)

The Zama fhevm evaluates a **multi-variable weighted match score (0-100)** entirely on encrypted data using `FHE.le`, `FHE.ge`, `FHE.eq`, `FHE.select`, and `FHE.add` — without revealing any value, ever.

**Result:** The company never knows how low the candidate would have accepted. The candidate never knows how high the company would have paid. The outcome is fair, final, and tamper-proof.

---

## 🌐 Live Demo

| Resource | Link |
|---|---|
| Frontend (Vercel) | [veilpay.online](https://veilpay.online) |
| VeilPay Contract (Etherscan) | [`0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc`](https://sepolia.etherscan.io/address/0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc#code) |
| cUSDC Token (Etherscan) | [`0x35590DECa04165320bA76a3d9E8305f4F4927Ed7`](https://sepolia.etherscan.io/address/0x35590DECa04165320bA76a3d9E8305f4F4927Ed7#code) |
| Sepolia Faucet | https://sepoliafaucet.com |

---

## 🗂️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24 + `@fhevm/solidity` v0.11.1 |
| FHE Primitives | `FHE.le()`, `FHE.ge()`, `FHE.eq()`, `FHE.select()`, `FHE.add()`, `Impl.verify()` |
| Contract Dev | Hardhat, `@nomicfoundation/hardhat-toolbox` |
| Frontend | Vite 8 + React 19 |
| FHE Client | `@zama-fhe/relayer-sdk` v0.4.2 (browser-side WASM encryption + ZK proofs) |
| Wallet | ethers.js v6, wagmi v2, viem |
| Bounty Token | ConfidentialUSDC (cUSDC) — custom ERC-20 with public faucet |
| Animations | Framer Motion |
| Notifications | react-hot-toast |
| Routing | react-router-dom v7 |
| Storage | IPFS via Pinata |
| Network | Sepolia Testnet (chainId 11155111) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js ≥ 18
- MetaMask (or compatible browser wallet)
- Sepolia ETH: https://sepoliafaucet.com

### 1. Clone and install

```bash
git clone https://github.com/mrnetwork0001/BlindHire.git
cd BlindHire

# Install contract dependencies
cd contracts && npm install && cd ..

# Install frontend dependencies
cd web && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example web/.env
```

Edit `web/.env` with your keys:
```env
VITE_CONTRACT_ADDRESS=0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc
VITE_CUSDC_ADDRESS=0x35590DECa04165320bA76a3d9E8305f4F4927Ed7
VITE_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_CHAIN_ID=11155111
VITE_FHE_LIVE=true
```

### 3. Run the frontend

```bash
cd web
npm run dev
```

Open http://localhost:5173

### 4. Get Test cUSDC

Connect your wallet → Navigate to **Post Job** → Click **"🪙 Claim 1,000 cUSDC"**. The faucet has a 1-hour cooldown per address.

---

## 🎭 Usage Guide

### As an Employer (Post a Job)
1. Connect MetaMask (Sepolia)
2. Navigate to **Post a Job**
3. Fill in job details + set salary budget, experience requirement, remote preference
4. All 3 values are **encrypted in your browser** using the Zama relayer-sdk WASM before submission
5. Deposit cUSDC as interview bounty
6. Click **Encrypt & Post Job** → transaction submits encrypted handles to Ethereum

### As a Candidate (Apply)
1. Browse **Jobs** — all listings show "Salary: Confidential"
2. Click **Apply Now** on any listing
3. Upload your resume (goes to IPFS — only revealed on match)
4. Set your minimum salary, experience, remote preference
5. Click **Encrypt & Apply** → all 3 values encrypted, sent onchain

### After Applications
1. **Employer Dashboard**: Click **Run FHE Match** to trigger `resolveApplication()` — the multi-variable FHE scoring runs onchain
2. Click **Reveal Score** — the relayer-sdk's `publicDecrypt()` retrieves the plaintext score (0-100) from the coprocessor
3. On match: Click **Unlock Resume** to access the candidate's IPFS resume (auto-pays cUSDC bounty)

---

## 🧪 Running Tests

```bash
cd contracts
npx hardhat test
```

Tests cover:
- ✅ Job posting with encrypted budget, experience, remote preference
- ✅ Application with encrypted expectation, experience, remote preference
- ✅ resolveApplication multi-variable FHE evaluation
- ✅ Access control (only employer can reveal)
- ✅ Salary confidentiality (never in plaintext views)
- ✅ Multiple candidates per job
- ✅ Closed job rejects applications
- ✅ cUSDC bounty escrow and refund

---

## 👥 Team

Built for the **Zama Builder Track Hackathon**.

---

## 📄 License

MIT License — see [LICENSE](../LICENSE)
