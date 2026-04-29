# 🔐 BlindHire

**Confidential Salary Matching on Ethereum — Powered by Zama Fully Homomorphic Encryption (FHE)**

BlindHire is a trustless hiring protocol where employers post jobs with **encrypted salary budgets** and candidates apply with **encrypted salary expectations**. The Zama fhEVM evaluates whether there's a match (`candidate_ask ≤ employer_budget`) — **without ever decrypting either value**. No one — not the blockchain, not the employer, not even the contract deployer — ever sees the raw salary numbers.

[![Live on Sepolia](https://img.shields.io/badge/Network-Sepolia%20Testnet-blue)](https://sepolia.etherscan.io/address/0xFCd61C515ba75096C350cEc2011056d70bc091dC)
[![Verified on Etherscan](https://img.shields.io/badge/Etherscan-Verified-green)](https://sepolia.etherscan.io/address/0xFCd61C515ba75096C350cEc2011056d70bc091dC#code)
[![Built with Zama](https://img.shields.io/badge/FHE-Zama%20fhEVM-purple)](https://docs.zama.ai/fhevm)

---

## 🧠 The Problem

Traditional hiring platforms expose sensitive compensation data:
- **Employers** reveal their maximum budgets, weakening negotiation leverage
- **Candidates** disclose minimum expectations, risking being lowballed
- **Both parties** face bias and information asymmetry

Even "blind" hiring tools still process salary data in plaintext on servers — trusting a centralized intermediary not to peek.

## 💡 The Solution

BlindHire eliminates trust entirely using **Fully Homomorphic Encryption (FHE)**:

1. **Employer** posts a job → salary budget is **encrypted in the browser** before it ever leaves their device
2. **Candidate** applies → salary expectation is **encrypted in the browser** using Zama's relayer SDK
3. **Smart contract** runs `FHE.le(candidate_min, employer_max)` → computes the comparison **on encrypted data**
4. **Result** is an encrypted boolean → decrypted only when the employer requests it via the Zama KMS
5. **If matched** → employer can unlock the candidate's resume (stored on IPFS)

> 🔑 **The salary numbers never exist in plaintext on-chain. Ever.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  React + Vite │   │ @zama-fhe/       │   │  ethers.js +   │  │
│  │  Frontend     │──▶│ relayer-sdk      │──▶│  wagmi         │  │
│  │              │   │ (WASM encryption)│   │  (tx signing)  │  │
│  └──────────────┘   └──────────────────┘   └────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Encrypted handle + ZK proof
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ETHEREUM SEPOLIA (On-Chain)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   BlindHire.sol                             │ │
│  │  • createJobPosting(title, ..., bytes32 handle, proof)    │ │
│  │  • applyToJob(jobId, name, resume, bytes32 handle, proof) │ │
│  │  • resolveApplication() → FHE.le(min, max) → ebool       │ │
│  │  • revealMatchResult() → KMS decryption → bool            │ │
│  │  • unlockResume() → IPFS CID revealed                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               │                                  │
│  ┌────────────────────────────▼───────────────────────────────┐ │
│  │              Zama FHE Infrastructure                       │ │
│  │  • Coprocessor: 0x92C920...49c127 (FHE compute)           │ │
│  │  • ACL:        0xf0Ffdc...A433D  (access control)         │ │
│  │  • KMS:        0xbE0E38...c311A  (key management)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MetaMask](https://metamask.io/) or any EIP-1193 compatible wallet
- Sepolia testnet ETH ([faucet](https://sepoliafaucet.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/mrnetwork0001/BlindHire.git
cd BlindHire
```

### 2. Install Dependencies

```bash
# Smart contracts
cd contracts
npm install

# Frontend
cd ../web
npm install
```

### 3. Configure Environment

```bash
# Copy the example env file
cp .env.example web/.env
```

Edit `web/.env`:
```env
VITE_CONTRACT_ADDRESS=0xFCd61C515ba75096C350cEc2011056d70bc091dC
VITE_FHE_LIVE=true
VITE_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_CHAIN_ID=11155111
```

### 4. Run the Frontend

```bash
cd web
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 Smart Contract

**Deployed & Verified:** [`0xFCd61C515ba75096C350cEc2011056d70bc091dC`](https://sepolia.etherscan.io/address/0xFCd61C515ba75096C350cEc2011056d70bc091dC#code)

### Key Functions

| Function | Who Calls It | What It Does |
|----------|-------------|--------------|
| `createJobPosting()` | Employer | Posts a job with an FHE-encrypted max budget |
| `applyToJob()` | Candidate | Submits an application with an FHE-encrypted salary expectation |
| `resolveApplication()` | Anyone | Runs `FHE.le(min_expectation, max_budget)` on encrypted data |
| `revealMatchResult()` | Employer | Decrypts the boolean match result via Zama KMS |
| `unlockResume()` | Employer | Reveals the candidate's IPFS resume link (only if matched) |
| `getActiveJobs()` | Anyone | Browse all open positions (no salary data exposed) |

### How FHE Works On-Chain

```solidity
// THE CORE FHE COMPUTATION — line 224 of BlindHire.sol
// Both values are encrypted. The result is an encrypted boolean.
ebool matched = FHE.le(app.min_expectation, posting.max_budget);
```

The Zama coprocessor evaluates this comparison homomorphically — meaning the math happens **directly on the ciphertexts**. The contract never handles plaintext salary data at any point.

---

## 🖥️ Frontend Features

### For Employers
- **Post Jobs** — Fill in job details, enter your max budget → encrypted client-side via Zama WASM before submission
- **Employer Dashboard** — View all your postings, expand to see applicants
- **Run FHE Match** — Trigger the on-chain encrypted comparison for each applicant
- **Batch Actions** — "Resolve All" and "Reveal All" buttons for processing multiple applicants at once
- **Reveal Results** — Decrypt the match boolean via Zama KMS
- **Unlock Resumes** — Access matched candidates' IPFS-stored resumes

### For Candidates
- **Browse Jobs** — View all active positions (salaries are hidden by design)
- **Apply** — Enter your name, upload your resume, enter your minimum salary expectation → encrypted client-side
- **Candidate Dashboard** — Track your applications and match statuses

### Security
- **Client-side encryption** — Salary data is encrypted in the browser using Zama's `relayer-sdk` WASM modules before any transaction is signed
- **Zero plaintext exposure** — The smart contract only ever handles encrypted handles and ZK proofs
- **On-chain access control** — Zama's ACL ensures only authorized parties can interact with specific ciphertexts
- **No demo mode** — The application strictly requires live FHE infrastructure; there are no simulation fallbacks

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **FHE (Contracts)** | [`@fhevm/solidity@0.11.1`](https://www.npmjs.com/package/@fhevm/solidity) — Zama's Solidity library for FHE operations |
| **FHE (Frontend)** | [`@zama-fhe/relayer-sdk@0.4.2`](https://www.npmjs.com/package/@zama-fhe/relayer-sdk) — Browser-side WASM encryption + ZK proof generation |
| **Smart Contracts** | Solidity 0.8.24, Hardhat, deployed on Ethereum Sepolia |
| **Frontend** | React 19, Vite 8, ethers.js v6, wagmi v2 |
| **Wallet** | MetaMask, Coinbase Wallet, Rabby (via wagmi connectors) |
| **Storage** | IPFS via Pinata (for candidate resumes) |
| **Animations** | Framer Motion |

---

## 📁 Project Structure

```
BlindHire/
├── contracts/                  # Solidity smart contracts
│   ├── contracts/
│   │   └── BlindHire.sol       # Main FHE-powered contract
│   ├── scripts/
│   │   └── deploy.js           # Deployment script
│   ├── test/
│   │   └── BlindHire.test.js   # Contract tests
│   ├── deployments/
│   │   └── sepolia.json        # Deployment addresses
│   ├── hardhat.config.js
│   └── package.json
├── web/                        # React frontend
│   ├── src/
│   │   ├── abi/                # Contract ABI
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useContract.js  # Contract interaction hook
│   │   │   └── useFhevm.js     # Zama FHE SDK hook
│   │   ├── pages/              # Route pages
│   │   │   ├── Landing.jsx
│   │   │   ├── JobBoard.jsx
│   │   │   ├── PostJob.jsx
│   │   │   ├── ApplyJob.jsx
│   │   │   ├── EmployerDashboard.jsx
│   │   │   └── CandidateDashboard.jsx
│   │   └── utils/
│   │       └── ipfs.js         # IPFS upload utility
│   └── package.json
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── HOW_IT_WORKS.md
│   └── README.md
└── .env.example
```

---

## 🔍 Verifying FHE On-Chain

You can verify that real FHE is being used by inspecting any `createJobPosting` or `applyToJob` transaction on Etherscan:

1. **Function signature** shows `bytes32 encryptedBudget` + `bytes inputProof` — the ciphertext handle and ZK proof
2. **No salary numbers** appear anywhere in the decoded transaction data
3. **Internal transactions** show calls to Zama's Coprocessor (`0x92C920...`) and ACL (`0xf0Ffdc...`) contracts
4. **Verified source code** shows the contract inherits `ZamaEthereumConfig` and uses `FHE.le()` for comparisons

---

## 🗺️ Roadmap

- [x] FHE-encrypted job posting (employer budget)
- [x] FHE-encrypted applications (candidate salary expectation)
- [x] On-chain FHE comparison (`FHE.le`)
- [x] KMS-based match reveal
- [x] IPFS resume storage
- [x] Batch resolve/reveal for employers
- [ ] Multi-round salary negotiation via FHE
- [ ] Decentralized reputation scores (encrypted)
- [ ] Cross-chain deployment (Ethereum mainnet)
- [ ] Mobile-optimized UI

---

## 📜 License

MIT

---

<p align="center">
  <strong>Built with 🔐 by the BlindHire team — where privacy meets hiring.</strong><br/>
  <em>Powered by <a href="https://www.zama.ai/">Zama</a> Fully Homomorphic Encryption</em>
</p>
