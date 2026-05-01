# 🔐 VeilPay — Confidential Hiring Protocol

**The first hiring protocol where salary negotiations, candidate matching, and employer reviews happen entirely inside Fully Homomorphic Encryption.**

Built on **Zama fhEVM** · Deployed on **Ethereum Sepolia** · Interview Bounties via **cUSDC**

[![Live on Sepolia](https://img.shields.io/badge/VeilPay-0xAd0E...5Adc-blue?style=flat-square)](https://sepolia.etherscan.io/address/0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc#code)
[![cUSDC Token](https://img.shields.io/badge/cUSDC-0x3559...7Ed7-green?style=flat-square)](https://sepolia.etherscan.io/address/0x35590DECa04165320bA76a3d9E8305f4F4927Ed7#code)
[![Built with Zama](https://img.shields.io/badge/FHE-Zama%20fhEVM-purple?style=flat-square)](https://docs.zama.ai/fhevm)
[![Etherscan Verified](https://img.shields.io/badge/Etherscan-Verified%20✓-brightgreen?style=flat-square)](#deployed-contracts)

---

## 🧠 The Problem

Hiring is fundamentally broken by **information asymmetry**:

| Pain Point | Who Suffers | Result |
|------------|-------------|--------|
| Employers expose max budgets in job listings | Employers | Candidates anchor to the ceiling, inflating costs |
| Candidates reveal salary expectations upfront | Candidates | Employers lowball to the floor, suppressing wages |
| "Blind" hiring platforms process salaries on centralized servers | Both | A trusted intermediary can peek, leak, or sell the data |
| No accountability for employers who ghost candidates | Candidates | Wasted time with zero compensation for the interview process |

> **Every existing solution requires trusting a middleman with the most sensitive number in a hiring negotiation — your salary.**

## 💡 VeilPay's Solution

VeilPay eliminates trust entirely. Every sensitive computation happens inside **Fully Homomorphic Encryption** — math on ciphertexts, not plaintext. The protocol introduces three interconnected FHE-powered systems that, together, create a **complete confidential hiring lifecycle**:

---

## 🔬 Core FHE Features

### 1️⃣ Multi-Variable Weighted Match Scoring

**Not just "does the salary match?" — a comprehensive 0-100 compatibility score computed entirely on encrypted data.**

```
┌─────────────────────────────────────────────────────┐
│           FHE MATCH SCORING ENGINE (0-100)           │
├───────────────┬──────────┬──────────────────────────┤
│    Factor     │  Weight  │       FHE Operation       │
├───────────────┼──────────┼──────────────────────────┤
│ Salary Match  │  50 pts  │ FHE.select(FHE.le(       │
│               │          │   candidateMin,           │
│               │          │   employerMax), 50, 0)    │
├───────────────┼──────────┼──────────────────────────┤
│ Experience    │  30 pts  │ FHE.select(FHE.le(       │
│               │          │   required, candidate),   │
│               │          │   30, 0)                  │
├───────────────┼──────────┼──────────────────────────┤
│ Remote Pref   │  20 pts  │ FHE.select(FHE.eq(       │
│               │          │   employer, candidate),   │
│               │          │   20, 0)                  │
├───────────────┼──────────┼──────────────────────────┤
│   TOTAL       │ 100 pts  │ FHE.add(salary + exp +   │
│               │          │   remote) → euint8        │
└───────────────┴──────────┴──────────────────────────┘
```

**FHE operations used:** `FHE.asEuint8`, `FHE.le`, `FHE.eq`, `FHE.select`, `FHE.add`

> Neither party learns the other's salary, experience level, or remote preference unless the match score exceeds the threshold. The score itself is computed on encrypted inputs and only decrypted when the employer explicitly requests it via the Zama KMS.

---

### 2️⃣ "Good Faith" Interview Bounty (cUSDC Tokenomics)

**Employers put money where their mouth is.** When posting a job, employers escrow **cUSDC tokens** into the smart contract. Each time they unlock a matched candidate's resume, a bounty is automatically transferred to the candidate — compensating them for the time invested in the application process.

```
EMPLOYER                       SMART CONTRACT                     CANDIDATE
   │                                │                                 │
   │── approve(cUSDC, amount) ────▶│                                 │
   │── createJobPosting(deposit) ─▶│── transferFrom(employer) ─────▶│ (escrow)
   │                                │                                 │
   │                                │◀── applyToJob() ───────────────│
   │                                │── FHE.compute(score) ──────────│
   │── unlockResume() ────────────▶│── transfer(bounty) ───────────▶│ 💰
   │                                │                                 │
   │── closeJob() ────────────────▶│── transfer(refund) ───────────▶│ (employer)
```

**Token:** `ConfidentialUSDC` (cUSDC) — a standard ERC-20 with 6 decimals and a built-in public faucet (1,000 cUSDC per claim, 1-hour cooldown) for testnet use.

**Why cUSDC instead of ETH?** Stablecoins prevent bounty value from fluctuating during the hiring window. Employers deposit a known dollar amount, candidates receive a predictable reward.

---

### 3️⃣ FHE-Aggregated Anonymous Company Reviews

**Candidates can rate employers — and individual ratings are mathematically impossible to extract.**

```solidity
// Each rating is encrypted before submission
euint32 encryptedRating = FHE.asEuint32(candidateRating); // 1-5 stars

// Aggregated homomorphically — no individual rating is ever visible
companyTotalScores[employer] = FHE.add(companyTotalScores[employer], encryptedRating);
companyReviewCounts[employer]++;

// Only the SUM can be decrypted → average = sum / count
// Individual contributions remain permanently encrypted
```

**FHE operations used:** `FHE.asEuint32`, `FHE.add`

> This protects candidates from employer retaliation — a common fear that suppresses honest feedback in real hiring. The FHE aggregation ensures that even with on-chain data, it's cryptographically impossible to determine what any individual candidate rated.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                           │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐  │
│  │  React 19 +  │   │ @zama-fhe/       │   │  ethers.js v6 +    │  │
│  │  Vite 8      │──▶│ relayer-sdk      │──▶│  wagmi v2          │  │
│  │              │   │ (WASM encryption)│   │  (wallet connect)  │  │
│  └──────────────┘   └──────────────────┘   └────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Encrypted handles + ZK proofs
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ETHEREUM SEPOLIA (On-Chain)                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ConfidentialUSDC.sol (cUSDC)                               │    │
│  │  • ERC-20 bounty token (6 decimals)                         │    │
│  │  • Public faucet: 1,000 cUSDC / claim / hour                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  VeilPay.sol (Main Protocol)                                │    │
│  │  • createJobPosting() — 3 encrypted inputs + cUSDC escrow   │    │
│  │  • applyToJob() — 3 encrypted inputs per candidate          │    │
│  │  • resolveApplication() — FHE weighted scoring (0-100)      │    │
│  │  • unlockResume() — auto-transfer cUSDC bounty to candidate │    │
│  │  • submitReview() — FHE.add aggregated anonymous ratings     │    │
│  │  • closeJob() — refund remaining cUSDC to employer          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │              Zama FHE Infrastructure                         │    │
│  │  • Coprocessor — evaluates FHE.le, FHE.eq, FHE.add, etc.   │    │
│  │  • ACL — ciphertext-level access control                    │    │
│  │  • KMS — manages decryption requests                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 FHE Operations Summary

Every FHE operation in VeilPay maps to a real-world hiring use case:

| Operation | Solidity Call | Use Case |
|-----------|-------------|----------|
| Encrypt uint64 | `FHE.asEuint64(salary, proof)` | Encrypt salary budget & expectations |
| Encrypt uint8 | `FHE.asEuint8(experience, proof)` | Encrypt years of experience |
| Encrypt bool | `FHE.asEbool(remotePref, proof)` | Encrypt remote work preference |
| Compare (≤) | `FHE.le(candidateMin, employerMax)` | Salary match check |
| Compare (≤) | `FHE.le(requiredExp, candidateExp)` | Experience qualification check |
| Compare (==) | `FHE.eq(employerRemote, candidateRemote)` | Remote preference alignment |
| Conditional | `FHE.select(condition, score, 0)` | Award points only if criteria met |
| Addition | `FHE.add(score1, score2, score3)` | Compute total weighted match score |
| Addition | `FHE.add(totalScores, newRating)` | Aggregate encrypted company ratings |
| Cast | `FHE.asEuint8(FHE.add(...))` | Downcast to 0-100 score range |

**Total: 9 distinct FHE operation types across 3 features**

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MetaMask](https://metamask.io/) or any EIP-1193 wallet
- Sepolia testnet ETH ([faucet](https://sepoliafaucet.com/))

### 1. Clone & Install

```bash
git clone https://github.com/mrnetwork0001/VeilPay.git
cd VeilPay

# Smart contracts
cd contracts && npm install

# Frontend
cd ../web && npm install
```

### 2. Configure Environment

```bash
cp .env.example web/.env
```

Edit `web/.env`:
```env
VITE_CONTRACT_ADDRESS=0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc
VITE_CUSDC_ADDRESS=0x35590DECa04165320bA76a3d9E8305f4F4927Ed7
VITE_FHE_LIVE=true
VITE_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_CHAIN_ID=11155111
```

### 3. Run

```bash
cd web && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Get Test cUSDC

Connect your wallet → Navigate to **Post Job** → Click **"🪙 Claim 1,000 cUSDC"** in the bounty section. The faucet has a 1-hour cooldown per address.

---

## 📄 Deployed Contracts

| Contract | Address | Verified |
|----------|---------|----------|
| **VeilPay** (main protocol) | [`0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc`](https://sepolia.etherscan.io/address/0xAd0EBcAaD4189d93c1aEE90f13F806AC28655Adc#code) | ✅ |
| **ConfidentialUSDC** (cUSDC bounty token) | [`0x35590DECa04165320bA76a3d9E8305f4F4927Ed7`](https://sepolia.etherscan.io/address/0x35590DECa04165320bA76a3d9E8305f4F4927Ed7#code) | ✅ |

---

## 🖥️ Frontend Features

### For Employers
- **Post Jobs** — Title, description, logo (uploaded to IPFS), salary budget, experience requirement, remote preference → all sensitive fields encrypted client-side via Zama WASM
- **cUSDC Faucet** — Claim test tokens directly in the Post Job form
- **Deposit Bounty** — Lock cUSDC into the job's escrow pool with a configurable per-unlock amount
- **Employer Dashboard** — View all postings with bounty pool balance, expand to see applicants
- **Run FHE Match** — Trigger the on-chain weighted scoring for each applicant
- **Batch Actions** — "Resolve All" and "Reveal All" for processing multiple applicants at once
- **View Match Scores** — See the decrypted 0-100 score alongside match/no-match status
- **Unlock Resumes** — Access matched candidates' IPFS-stored resumes (auto-pays cUSDC bounty)
- **Close Job & Refund** — End the posting and reclaim remaining cUSDC from the escrow pool

### For Candidates
- **Browse Jobs** — View all active positions with company logos, descriptions, bounty amounts (salaries hidden by design)
- **Apply** — Upload resume (IPFS), enter salary expectation, years of experience, remote preference → all encrypted
- **Candidate Dashboard** — Track applications, match statuses, and scores
- **Rate Employers** — Submit anonymous FHE-encrypted 1-5 star ratings after interviews
- **Earn Bounties** — Receive cUSDC when employers unlock your resume

---

## 🛡️ Security Model

| Property | How It's Achieved |
|----------|-------------------|
| **Salary privacy** | Encrypted client-side via Zama WASM; only encrypted handles reach the chain |
| **Zero plaintext exposure** | Smart contract only handles `euint64`, `euint8`, `ebool` types — never raw numbers |
| **Access control** | Zama ACL ensures only authorized addresses can interact with specific ciphertexts |
| **Review anonymity** | FHE.add aggregation makes individual ratings cryptographically unextractable |
| **Bounty safety** | ERC-20 `transfer`/`transferFrom` with balance checks; refund on job close |
| **No backdoors** | Contract is verified on Etherscan; no admin keys, no upgrade proxy |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **FHE (Contracts)** | `@fhevm/solidity@0.11.1` — Zama's Solidity library for on-chain FHE |
| **FHE (Frontend)** | `@zama-fhe/relayer-sdk@0.4.2` — Browser WASM encryption + ZK proof generation |
| **Smart Contracts** | Solidity 0.8.24, Hardhat (viaIR), Ethereum Sepolia |
| **Bounty Token** | ConfidentialUSDC — custom ERC-20 (6 decimals) with public faucet |
| **Frontend** | React 19, Vite 8, ethers.js v6, wagmi v2, Framer Motion |
| **Wallet** | MetaMask, Coinbase Wallet, WalletConnect (via Web3Modal) |
| **Storage** | IPFS via Pinata (resumes + company logos) |

---

## 📁 Project Structure

```
VeilPay/
├── contracts/
│   ├── contracts/
│   │   ├── VeilPay.sol              # Main FHE-powered hiring protocol
│   │   └── ConfidentialUSDC.sol     # cUSDC bounty token with faucet
│   ├── scripts/
│   │   └── deploy.js                # Deploys cUSDC → VeilPay(cUSDC)
│   ├── deployments/
│   │   └── sepolia.json             # Deployed addresses
│   └── hardhat.config.js
├── web/
│   ├── src/
│   │   ├── abi/BlindHire.json       # VeilPay contract ABI
│   │   ├── components/
│   │   │   ├── ReviewModal.jsx      # FHE-encrypted star rating modal
│   │   │   ├── EncryptionZone.jsx   # Salary encryption slider
│   │   │   ├── FheChat.jsx          # Encrypted messaging
│   │   │   └── TransactionOverlay   # Multi-step tx progress UI
│   │   ├── hooks/
│   │   │   ├── useContract.js       # Contract + cUSDC interactions
│   │   │   └── useFhevm.js          # Zama SDK (encrypt/decrypt)
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── JobBoard.jsx         # Browse jobs with logo cards
│   │   │   ├── PostJob.jsx          # Post job + cUSDC faucet
│   │   │   ├── ApplyJob.jsx         # Apply with 3 encrypted fields
│   │   │   ├── EmployerDashboard.jsx # Scores, unlock, close/refund
│   │   │   └── CandidateDashboard.jsx # Track apps, rate employers
│   │   └── utils/ipfs.js           # Pinata IPFS uploads
│   └── .env
└── README.md
```

---

## 🔍 Verifying Real FHE On-Chain

You can independently verify that VeilPay uses real FHE (not simulation):

1. **Inspect any `createJobPosting` or `applyToJob` tx** on Etherscan — function params show `bytes32 encryptedBudget` + `bytes inputProof` (ciphertext handle + ZK proof)
2. **No salary numbers** appear anywhere in decoded transaction data
3. **Internal transactions** show calls to Zama's Coprocessor and ACL contracts
4. **Verified source code** confirms `FHE.le()`, `FHE.select()`, `FHE.add()`, and `FHE.eq()` calls
5. **`resolveApplication`** generates both `ebool` (match) and `euint8` (score) handles — two distinct encrypted outputs from a single computation

---

## 🗺️ Roadmap

- [x] FHE-encrypted salary matching (`FHE.le`)
- [x] Multi-variable weighted scoring (`FHE.select` + `FHE.add`, 0-100)
- [x] Interview bounty escrow with cUSDC (ERC-20)
- [x] Built-in cUSDC faucet for testnet
- [x] FHE-aggregated anonymous company reviews (`FHE.add`)
- [x] IPFS resume + logo storage
- [x] Batch resolve/reveal for employers
- [x] Encrypted match score decryption via Zama KMS
- [ ] Multi-round salary negotiation via FHE (counter-offers in ciphertext)
- [ ] ConfidentialERC20 bounty (fully encrypted balance transfers)
- [ ] Cross-chain deployment (Ethereum mainnet / L2s)
- [ ] AI-powered resume parsing with privacy-preserving NLP

---

## 🏆 Why VeilPay Should Win

1. **Depth of FHE usage** — 9 distinct FHE operations across 3 interconnected features, not a basic boolean demo
2. **Real-world utility** — Solves a $200B+ recruiting industry problem with a protocol that could deploy today
3. **Complete lifecycle** — Post → Apply → Match → Score → Unlock → Pay → Review — all on-chain, all confidential
4. **Novel tokenomics** — First-ever "interview bounty" system where candidates are financially compensated for participating in encrypted matching
5. **FHE aggregation** — Anonymous company reviews prove that FHE arithmetic (not just comparison) works in production
6. **Production-quality frontend** — Premium UI with real-time transaction overlays, batch processing, and IPFS integration
7. **Fully deployed & verified** — Both contracts live on Sepolia with verified source code

---

## 📜 License

MIT

---

<p align="center">
  <strong>Built with 🔐 by the VeilPay team — where privacy meets hiring.</strong><br/>
  <em>Powered by <a href="https://www.zama.ai/">Zama</a> Fully Homomorphic Encryption</em>
</p>
