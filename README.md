# 🔐 VeilPay - Confidential Hiring Protocol

**The first hiring protocol where salary negotiations, candidate matching, and employer reviews happen entirely inside Fully Homomorphic Encryption.**

Built on **Zama fhEVM** · Deployed on **Ethereum Sepolia** · Interview Bounties via **cUSDC**

🌐 **Live Demo:** [veilpay.online](https://veilpay.online)

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

> **Every existing solution requires trusting a middleman with the most sensitive number in a hiring negotiation - your salary.**

## 💡 VeilPay's Solution

VeilPay eliminates trust entirely. Every sensitive computation happens inside **Fully Homomorphic Encryption** - math on ciphertexts, not plaintext. The protocol introduces three interconnected FHE-powered systems that, together, create a **complete confidential hiring lifecycle**:

---

## 🔬 Core FHE Features

### 1️⃣ Multi-Variable Weighted Match Scoring

**Not just "does the salary match?" - a comprehensive 0-100 compatibility score computed entirely on encrypted data.**

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

**Employers put money where their mouth is.** When posting a job, employers escrow **cUSDC tokens** into the smart contract. Each time they unlock a matched candidate's resume, a bounty is automatically transferred to the candidate - compensating them for the time invested in the application process.

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

**Token:** `ConfidentialUSDC` (cUSDC) - a standard ERC-20 with 6 decimals and a built-in public faucet (1,000 cUSDC per claim, 1-hour cooldown) for testnet use.

**Why cUSDC instead of ETH?** Stablecoins prevent bounty value from fluctuating during the hiring window. Employers deposit a known dollar amount, candidates receive a predictable reward.

---

### 3️⃣ FHE-Aggregated Anonymous Company Reviews

**Candidates can rate employers - and individual ratings are mathematically impossible to extract.**

```solidity
// Each rating is encrypted before submission
euint32 encryptedRating = FHE.asEuint32(candidateRating); // 1-5 stars

// Aggregated homomorphically - no individual rating is ever visible
companyTotalScores[employer] = FHE.add(companyTotalScores[employer], encryptedRating);
companyReviewCounts[employer]++;

// Only the SUM can be decrypted → average = sum / count
// Individual contributions remain permanently encrypted
```

**FHE operations used:** `FHE.asEuint32`, `FHE.add`

> This protects candidates from employer retaliation - a common fear that suppresses honest feedback in real hiring. The FHE aggregation ensures that even with onchain data, it's cryptographically impossible to determine what any individual candidate rated.

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
│                     ETHEREUM SEPOLIA (Onchain)                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ConfidentialUSDC.sol (cUSDC)                               │    │
│  │  • ERC-20 bounty token (6 decimals)                         │    │
│  │  • Public faucet: 1,000 cUSDC / claim / hour                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  VeilPay.sol (Main Protocol)                                │    │
│  │  • createJobPosting() - 3 encrypted inputs + cUSDC escrow   │    │
│  │  • applyToJob() - 3 encrypted inputs per candidate          │    │
│  │  • resolveApplication() - FHE weighted scoring (0-100)      │    │
│  │  • unlockResume() - auto-transfer cUSDC bounty to candidate │    │
│  │  • submitReview() - FHE.add aggregated anonymous ratings     │    │
│  │  • closeJob() - refund remaining cUSDC to employer          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                      │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │              Zama FHE Infrastructure                         │    │
│  │  • Coprocessor - evaluates FHE.le, FHE.eq, FHE.add, etc.   │    │
│  │  • ACL - ciphertext-level access control                    │    │
│  │  • KMS - manages decryption requests                        │    │
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

**Zama Infrastructure (auto-detected by FHE Proof Inspector):**

| Contract | Address | Role |
|----------|---------|------|
| Zama TFHEExecutor | `0x92c920834ec8941d2c77d188936e1f7a6f49c127` | Executes FHE.le, FHE.add, FHE.select, VerifyInput |
| Zama ACL | `0xf0ffdc93b7e186bc2f8cb3daa75d86d1930a433d` | Ciphertext-level access control (Allowed events) |

---

## 🖥️ Frontend Features

### For Employers
- **Post Jobs** - Title, description, logo (uploaded to IPFS), salary budget, experience requirement, remote preference → all sensitive fields encrypted client-side via Zama WASM
- **cUSDC Faucet** - Claim test tokens directly in the Post Job form
- **Deposit Bounty** - Lock cUSDC into the job's escrow pool with a configurable per-unlock amount
- **Balance Validation** - Real-time cUSDC balance check prevents deposits exceeding wallet balance, with shortfall calculation
- **Employer Dashboard** - View all postings with bounty pool balance, expand to see applicants
- **Run FHE Match** - Trigger the onchain weighted scoring for each applicant
- **Batch Actions** - "Resolve All" and "Reveal All" for processing multiple applicants at once
- **View Match Scores** - See the decrypted 0-100 score alongside match/no-match status
- **Unlock Resumes** - Access matched candidates' IPFS-stored resumes (auto-pays cUSDC bounty)
- **Close Job & Refund** - End the posting and reclaim remaining cUSDC from the escrow pool

### For Candidates
- **Browse Jobs** - View all active positions with company logos, descriptions, bounty amounts (salaries hidden by design)
- **Apply** - Upload resume (IPFS), enter salary expectation, years of experience, remote preference → all encrypted
- **Candidate Dashboard** - Track applications, match statuses, and scores
- **Rate Employers** - Submit anonymous FHE-encrypted 1-5 star ratings after interviews
- **Earn Bounties** - Receive cUSDC when employers unlock your resume

### Transparency & Verification
- **FHE Proof Inspector** - Paste any Sepolia transaction hash to get a real-time 4-phase verification with **pass/fail (green ✓ / red ✗)** indicators. Each phase performs genuine on-chain checks — not cosmetic animations. Non-FHE transactions (e.g. `closeJob`, `unlockResume`) correctly show red phases, proving the verification is real.
- **Per-Step Etherscan Links** - Every onchain operation in the transaction overlay includes a clickable "view" link to verify the transaction on Etherscan
- **Live Protocol Stats** - Landing page displays real-time onchain metrics: jobs posted, applications submitted, FHE operations executed, and total cUSDC escrowed

### UI/UX Polish
- **Custom Wallet UI** - Themed wallet connection with Globe/Smartphone SVG icons matching the industrial neumorphic design system (no generic emojis)
- **Transaction Overlay** - Multi-step modal with real-time progress, per-step status indicators, and clickable Etherscan verification links for every onchain confirmation
- **Animated Match Visualizer** - Hero section shows a live demonstration of the FHE matching flow: plaintext → ciphertext → homomorphic evaluation → encrypted result
- **Typewriter Hero** - Dynamic headline cycling through "Is Dead / Is Broken / Is Exposed / Is Outdated"
- **Responsive Design** - Full mobile/tablet support with collapsible navigation drawer

---

## 🛡️ Security Model

| Property | How It's Achieved |
|----------|-------------------|
| **Salary privacy** | Encrypted client-side via Zama WASM; only encrypted handles reach the chain |
| **Zero plaintext exposure** | Smart contract only handles `euint64`, `euint8`, `ebool` types - never raw numbers |
| **Access control** | Zama ACL ensures only authorized addresses can interact with specific ciphertexts |
| **Review anonymity** | FHE.add aggregation makes individual ratings cryptographically unextractable |
| **Bounty safety** | ERC-20 `transfer`/`transferFrom` with balance checks; refund on job close |
| **Balance validation** | Frontend prevents deposit attempts exceeding wallet balance before transaction |
| **No backdoors** | Contract is verified on Etherscan; no admin keys, no upgrade proxy |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **FHE (Contracts)** | `@fhevm/solidity@0.11.1` - Zama's Solidity library for onchain FHE |
| **FHE (Frontend)** | `@zama-fhe/relayer-sdk@0.4.2` - Browser WASM encryption + ZK proof generation |
| **Smart Contracts** | Solidity 0.8.24, Hardhat (viaIR), Ethereum Sepolia |
| **Bounty Token** | ConfidentialUSDC - custom ERC-20 (6 decimals) with public faucet |
| **Frontend** | React 19, Vite 8, ethers.js v6, wagmi v2, Framer Motion |
| **Wallet** | Custom UI supporting MetaMask, Coinbase Wallet, Rabby, OKX, WalletConnect |
| **Icons** | Lucide React (themed SVG icons) |
| **Storage** | IPFS via Pinata (resumes + company logos) |
| **Hosting** | Vercel ([veilpay.online](https://veilpay.online)) |

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
│   │   │   ├── ConnectWalletButton  # Custom themed wallet connection UI
│   │   │   ├── ReviewModal.jsx      # FHE-encrypted star rating modal
│   │   │   ├── EncryptionZone.jsx   # Salary encryption slider
│   │   │   ├── FheChat.jsx          # Encrypted messaging
│   │   │   ├── TransactionOverlay   # Multi-step tx progress + Etherscan links
│   │   │   ├── Navbar.jsx           # Responsive navbar with mobile drawer
│   │   │   ├── Footer.jsx           # Site footer
│   │   │   └── Animations.jsx       # FadeIn, Stagger animation components
│   │   ├── hooks/
│   │   │   ├── useContract.js       # Contract + cUSDC interactions + protocol stats
│   │   │   └── useFhevm.js          # Zama SDK (encrypt/decrypt/retry)
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Hero + How It Works + Live Stats + FHE code
│   │   │   ├── JobBoard.jsx         # Browse jobs with logo cards + bounty badges
│   │   │   ├── PostJob.jsx          # Post job + cUSDC faucet + balance validation
│   │   │   ├── ApplyJob.jsx         # Apply with 3 encrypted fields
│   │   │   ├── EmployerDashboard    # Scores, unlock, batch, close/refund
│   │   │   ├── CandidateDashboard   # Track apps, rate employers
│   │   │   └── FheProof.jsx         # FHE Proof Inspector (tx verification)
│   │   ├── config/wagmi.js          # Wagmi wallet configuration
│   │   └── utils/ipfs.js            # Pinata IPFS uploads
│   └── .env
└── README.md
```

---

## 🔍 FHE Proof Inspector — Real Verification, Not Simulation

VeilPay includes a built-in **FHE Proof Inspector** page (`/proof`) that performs **genuine on-chain verification** with real pass/fail results:

1. **Paste any Sepolia transaction hash** — VeilPay or not
2. The inspector performs a **4-phase verification** with **green ✓ (pass) / red ✗ (fail)** per phase:
   - **Phase 1: Encrypted Inputs** — Checks for encrypted parameters (bytes32 handles) or stored-handle operations (`resolveApplication`) in calldata. ✗ if no encrypted data found.
   - **Phase 2: FHE Evaluation** — Validates the function is a known FHE operation (`createJobPosting`, `applyToJob`, `resolveApplication`, `submitReview`) and the transaction succeeded. ✗ if unrecognized or reverted.
   - **Phase 3: Zama Infrastructure** — Scans receipt logs for real interactions with Zama's `TFHEExecutor` (`0x92c9...c127`) and `ACL` (`0xf0ff...433d`). ✗ if no Zama contract logs detected.
   - **Phase 4: Encrypted Result** — Confirms transaction succeeded with events emitted and no plaintext salary/budget values visible in any log.
3. **Verdict sidebar** shows 5 real-time pass/fail checks with green/red indicators
4. **Direct Etherscan link** for independent cross-verification

**Try it yourself** — paste these hashes on [veilpay.online/proof](https://veilpay.online/proof):

| Transaction Hash | Function | Expected Result |
|-----------------|----------|----------------|
| `0x5517c806c466507596cb24c129e4fb2ea4d31bce70ebbb7981947f4cb4464cf5` | `resolveApplication` | All 4 phases ✅ |
| `0xa53ffdb900d8686a45bfc53acd678e47b39fe0577044f9b62f47f1c85c1d31bf` | `createJobPosting` | All 4 phases ✅ |
| `0x081a300715b79453fdb4274d193f21f6b719c1ced1d27b303d47fc86b19efe4f` | `closeJob` | Phase 2,3 ✗ (not FHE) |
| Any random Sepolia tx | Non-VeilPay | All phases ✗ |

> **This is the proof that VeilPay uses real FHE.** Non-FHE functions correctly show red, random transactions correctly fail, and only genuine FHE operations produce all-green results. No simulation, no faking.

---

## 📊 Live Protocol Stats

The landing page displays real-time onchain metrics pulled directly from the deployed contract:

| Metric | Source |
|--------|--------|
| **Jobs Posted** | `jobCount()` from VeilPay contract |
| **Applications** | Sum of `applicationCount` across all jobs |
| **FHE Operations** | Applications × 3 (each triggers salary, experience, and remote FHE ops) |
| **cUSDC Escrowed** | Sum of `bountyPool` across all active jobs |

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
- [x] FHE Proof Inspector for transaction verification
- [x] Live onchain protocol stats dashboard
- [x] Per-step Etherscan transaction links in all flows
- [x] Real-time cUSDC balance validation with shortfall calculation
- [x] Custom themed wallet connection UI (no RainbowKit dependency)
- [x] Production deployment on Vercel (veilpay.online)
- [ ] Multi-round salary negotiation via FHE (counter-offers in ciphertext)
- [ ] ConfidentialERC20 bounty (fully encrypted balance transfers)
- [ ] Cross-chain deployment (Ethereum mainnet / L2s)
- [ ] AI-powered resume parsing with privacy-preserving NLP

---

## 🏆 Why VeilPay Should Win

1. **Depth of FHE usage** — 9 distinct FHE operations across 3 interconnected features, not a basic boolean demo
2. **Real-world utility** — Solves a $200B+ recruiting industry problem with a protocol that could deploy today
3. **Complete lifecycle** — Post → Apply → Match → Score → Unlock → Pay → Review — all onchain, all confidential
4. **Novel tokenomics** — First-ever "interview bounty" system where candidates are financially compensated for participating in encrypted matching
5. **FHE aggregation** — Anonymous company reviews prove that FHE arithmetic (not just comparison) works in production
6. **Provable, not cosmetic** — The FHE Proof Inspector performs **real on-chain verification** with genuine pass/fail results. Non-FHE functions correctly show red. Random transactions correctly fail. No simulation, no faking — paste any tx hash and see for yourself.
7. **Production-quality frontend** — Premium neumorphic UI with real-time transaction overlays, per-step Etherscan links, live stats, batch processing, and IPFS integration
8. **Fully deployed & verified** — Both contracts live on Sepolia with verified source code, frontend deployed at [veilpay.online](https://veilpay.online)
9. **Zama infrastructure integration** — Real TFHEExecutor and ACL log detection from actual Sepolia addresses, not hardcoded assumptions

---

## 📜 License

MIT

---

<p align="center">
  <strong>Built with 🔐 by the VeilPay team - where privacy meets hiring.</strong><br/>
  <em>Powered by <a href="https://www.zama.ai/">Zama</a> Fully Homomorphic Encryption</em>
</p>
