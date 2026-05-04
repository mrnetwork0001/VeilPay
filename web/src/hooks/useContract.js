import { useCallback } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import BLINDHIRE_ABI from '../abi/BlindHire.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const CUSDC_ADDRESS = import.meta.env.VITE_CUSDC_ADDRESS;

// Minimal ERC-20 ABI for cUSDC interactions
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function faucet() external',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

/**
 * useContract — React hook for VeilPay contract interactions
 *
 * Uses wagmi's useWalletClient for write calls and a public RPC for reads.
 * Wallet connection is handled externally by ConnectWalletButton (MetaMask, Coinbase, Rabby, injected).
 */
export function useContract() {
  const { address: account, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // ─── Contract helpers ───────────────────────────────────────────────────────

  const getReadContract = useCallback(async () => {
    // Use ethers for read calls via public RPC — no wallet needed
    const provider = new ethers.JsonRpcProvider(
      import.meta.env.VITE_SEPOLIA_RPC || 'https://rpc.sepolia.org'
    );
    return new ethers.Contract(CONTRACT_ADDRESS, BLINDHIRE_ABI.abi, provider);
  }, []);

  const getWriteContract = useCallback(async () => {
    // Fallback to window.ethereum if wagmi's walletClient isn't resolved in this closure
    if (!walletClient && !window.ethereum) {
      throw new Error('Wallet not connected. Please connect via the Connect Wallet button.');
    }

    const targetChainId = 11155111; // Sepolia
    const targetChainHex = '0xaa36a7';
    let currentChainId = walletClient ? walletClient.chain.id : parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);

    if (currentChainId !== targetChainId) {
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainHex }],
          });
        } catch (switchError) {
          throw new Error('Please switch your wallet network to Sepolia to continue.');
        }
      } else {
        throw new Error('Please switch your wallet network to Sepolia.');
      }
    }

    let provider;
    // Use walletClient if it was already on the correct chain, otherwise use window.ethereum
    // to ensure we capture the immediately switched network state without waiting for React re-render.
    if (walletClient && currentChainId === targetChainId) {
      provider = new ethers.BrowserProvider(walletClient.transport, {
        chainId: walletClient.chain.id,
        name: walletClient.chain.name,
      });
    } else {
      provider = new ethers.BrowserProvider(window.ethereum);
    }
    
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, BLINDHIRE_ABI.abi, signer);
  }, [walletClient]);

  // ─── Read functions ─────────────────────────────────────────────────────────
  // These use getReadContract (public RPC) — no wallet required.

  const getActiveJobs = useCallback(async () => {
    const contract = await getReadContract();
    const [ids, employers, titles, companies, locations, jobTypes, descriptions, logoUrls, createdAts, appCounts, bountyPools, bountyPerUnlocks] =
      await contract.getActiveJobs();

    return ids.map((id, i) => ({
      id: Number(id),
      employer: employers[i],
      title: titles[i],
      company: companies[i],
      location: locations[i],
      jobType: jobTypes[i],
      description: descriptions[i],
      logoUrl: logoUrls[i],
      createdAt: Number(createdAts[i]),
      applicationCount: Number(appCounts[i]),
      bountyPool: bountyPools[i],
      bountyPerUnlock: bountyPerUnlocks[i],
    }));
  }, [getReadContract]);

  /** Fetches ALL jobs (active + closed) by iterating jobCount */
  const getAllJobs = useCallback(async () => {
    const contract = await getReadContract();
    const count = Number(await contract.jobCount());
    const jobs = [];
    for (let i = 0; i < count; i++) {
      try {
        const j = await contract.jobPostings(i);
        jobs.push({
          id: i,
          employer: j.employer || j[0],
          title: j.title || j[1],
          company: j.company || j[2],
          location: j.location || j[3],
          jobType: j.jobType || j[4],
          description: j.description || j[5],
          logoUrl: j.logoUrl || j[6],
          isActive: j.isActive ?? j[10],
          createdAt: Number(j.createdAt || j[12]),
          applicationCount: Number(j.applicationCount || j[13]),
          bountyPool: j.bountyPool || j[14],
          bountyPerUnlock: j.bountyPerUnlock || j[15],
        });
      } catch (err) {
        console.warn(`Failed to fetch job ${i}:`, err);
      }
    }
    return jobs;
  }, [getReadContract]);

  const getJobsByEmployer = useCallback(async (address) => {
    const contract = await getReadContract();
    const ids = await contract.getJobsByEmployer(address);
    return ids.map(id => Number(id));
  }, [getReadContract]);

  const getJobPosting = useCallback(async (jobId) => {
    const contract = await getReadContract();
    return await contract.jobPostings(jobId);
  }, [getReadContract]);

  const getApplicationsForJob = useCallback(async (jobId) => {
    const contract = await getWriteContract();
    const [appIds, candidates, names, matchRevealeds, matchResults, matchHandles, scoreHandles, revealedScores, resumeUnlockeds, appliedAts] =
      await contract.getApplicationsForJob(jobId);

    return appIds.map((id, i) => ({
      appId: Number(id),
      candidate: candidates[i],
      candidateName: names[i],
      matchRevealed: matchRevealeds[i],
      matchResult: matchResults[i],
      matchHandle: matchHandles[i],
      scoreHandle: scoreHandles[i],
      revealedScore: Number(revealedScores[i]),
      resumeUnlocked: resumeUnlockeds[i],
      appliedAt: Number(appliedAts[i]),
    }));
  }, [getWriteContract]);

  const getMyApplications = useCallback(async () => {
    // This needs the connected wallet to identify msg.sender
    const contract = await getWriteContract();
    const [jobIds, appIds, titles, companies, matchRevealeds, matchResults, appliedAts] =
      await contract.getMyApplications();

    return jobIds.map((id, i) => ({
      jobId: Number(id),
      appId: Number(appIds[i]),
      title: titles[i],
      company: companies[i],
      matchRevealed: matchRevealeds[i],
      matchResult: matchResults[i],
      appliedAt: Number(appliedAts[i]),
    }));
  }, [getWriteContract]);

  const getResumeIfUnlocked = useCallback(async (jobId, appId) => {
    // onlyEmployer modifier requires msg.sender
    const contract = await getWriteContract();
    return await contract.getResumeIfUnlocked(jobId, appId);
  }, [getWriteContract]);

  // ─── Write functions ────────────────────────────────────────────────────────

  const createJobPosting = useCallback(async (title, company, location, jobType, description, logoUrl, budgetHandle, expHandle, remoteHandle, inputProof, bountyPerUnlock, totalDeposit) => {
    const contract = await getWriteContract();
    const tx = await contract.createJobPosting(
      title, company, location, jobType, description, logoUrl,
      budgetHandle, expHandle, remoteHandle, inputProof, bountyPerUnlock, totalDeposit
    );
    return await tx.wait();
  }, [getWriteContract]);

  const applyToJob = useCallback(async (jobId, candidateName, resumeIpfsCid, salaryHandle, expHandle, remoteHandle, inputProof) => {
    const contract = await getWriteContract();
    const tx = await contract.applyToJob(jobId, candidateName, resumeIpfsCid, salaryHandle, expHandle, remoteHandle, inputProof);
    return await tx.wait();
  }, [getWriteContract]);

  const resolveApplication = useCallback(async (jobId, appId) => {
    const contract = await getWriteContract();
    const tx = await contract.resolveApplication(jobId, appId);
    return await tx.wait();
  }, [getWriteContract]);

  const revealMatchResult = useCallback(async (jobId, appId, isMatch, score) => {
    const contract = await getWriteContract();
    const tx = await contract.revealMatchResult(jobId, appId, isMatch, score);
    return await tx.wait();
  }, [getWriteContract]);

  const unlockResume = useCallback(async (jobId, appId) => {
    const contract = await getWriteContract();
    const tx = await contract.unlockResume(jobId, appId);
    return await tx.wait();
  }, [getWriteContract]);

  const closeJob = useCallback(async (jobId) => {
    const contract = await getWriteContract();
    const tx = await contract.closeJob(jobId);
    return await tx.wait();
  }, [getWriteContract]);

  // ─── Chat functions (FHE-gated) ─────────────────────────────────────────────

  const sendMessage = useCallback(async (jobId, appId, content) => {
    const contract = await getWriteContract();
    const tx = await contract.sendMessage(jobId, appId, content);
    return await tx.wait();
  }, [getWriteContract]);

  const getMessages = useCallback(async (jobId, appId) => {
    // Requires msg.sender to be a matched participant
    const contract = await getWriteContract();
    const [senders, contents, timestamps] = await contract.getMessages(jobId, appId);
    return senders.map((sender, i) => ({
      sender,
      content: contents[i],
      timestamp: Number(timestamps[i]),
    }));
  }, [getWriteContract]);

  const getMessageCount = useCallback(async (jobId, appId) => {
    const contract = await getReadContract();
    const count = await contract.getMessageCount(jobId, appId);
    return Number(count);
  }, [getReadContract]);

  // ── cUSDC Token functions ─────────────────────────────────────────────────────

  const getTokenContract = useCallback(async (needsSigner = false) => {
    if (needsSigner) {
      const contract = await getWriteContract();
      return new ethers.Contract(CUSDC_ADDRESS, ERC20_ABI, contract.runner);
    }
    const provider = new ethers.JsonRpcProvider(
      import.meta.env.VITE_SEPOLIA_RPC || 'https://rpc.sepolia.org'
    );
    return new ethers.Contract(CUSDC_ADDRESS, ERC20_ABI, provider);
  }, [getWriteContract]);

  const approveBountyToken = useCallback(async (amount) => {
    const token = await getTokenContract(true);
    const tx = await token.approve(CONTRACT_ADDRESS, amount);
    return await tx.wait();
  }, [getTokenContract]);

  const claimFaucet = useCallback(async () => {
    const token = await getTokenContract(true);
    const tx = await token.faucet();
    return await tx.wait();
  }, [getTokenContract]);

  const getBountyBalance = useCallback(async (address) => {
    const token = await getTokenContract(false);
    return await token.balanceOf(address);
  }, [getTokenContract]);

  const getBountyAllowance = useCallback(async (owner) => {
    const token = await getTokenContract(false);
    return await token.allowance(owner, CONTRACT_ADDRESS);
  }, [getTokenContract]);

  // ── Review functions ──────────────────────────────────────────────────────────

  const submitReview = useCallback(async (employerAddress, ratingHandle, inputProof) => {
    const contract = await getWriteContract();
    const tx = await contract.submitReview(employerAddress, ratingHandle, inputProof);
    return await tx.wait();
  }, [getWriteContract]);

  const getCompanyReviewInfo = useCallback(async (employerAddress) => {
    const contract = await getReadContract();
    const [reviewCount, revealedAvg, totalScoreHandle] = await contract.getCompanyReviewInfo(employerAddress);
    return {
      reviewCount: Number(reviewCount),
      revealedAvg: Number(revealedAvg),
      totalScoreHandle,
    };
  }, [getReadContract]);

  // ── Protocol Stats (Landing Page) ────────────────────────────────────────────

  const getProtocolStats = useCallback(async () => {
    try {
      const contract = await getReadContract();
      const jobCountBN = await contract.jobCount();
      const totalJobs = Number(jobCountBN);

      let totalApplications = 0;
      let totalMatches = 0;
      let totalBountyPaid = 0n;

      for (let i = 0; i < totalJobs; i++) {
        try {
          const j = await contract.jobPostings(i);
          const appCount = Number(j.applicationCount || j[13]);
          totalApplications += appCount;

          // bountyPool is current remaining — calculate paid as (original deposit concept)
          // We approximate: if bountyPool < totalDeposit, bounties were paid
          const bountyPerUnlock = j.bountyPerUnlock || j[15];
          const bountyPool = j.bountyPool || j[14];
          // Count resolved matches from application count and pool depletion
        } catch (err) {
          console.warn(`Stats: Failed to read job ${i}:`, err);
        }
      }

      return {
        totalJobs,
        totalApplications,
        totalMatches,
        totalBountyPaid: totalBountyPaid.toString(),
      };
    } catch (err) {
      console.warn('Failed to fetch protocol stats:', err);
      return { totalJobs: 0, totalApplications: 0, totalMatches: 0, totalBountyPaid: '0' };
    }
  }, [getReadContract]);

  return {
    // Wallet state (from wagmi — driven by ConnectWalletButton)
    account,
    isConnected,
    // Read
    getActiveJobs,
    getAllJobs,
    getJobsByEmployer,
    getJobPosting,
    getApplicationsForJob,
    getMyApplications,
    getResumeIfUnlocked,
    getMessageCount,
    getCompanyReviewInfo,
    getProtocolStats,
    // Write
    createJobPosting,
    applyToJob,
    resolveApplication,
    revealMatchResult,
    unlockResume,
    closeJob,
    submitReview,
    // cUSDC Token
    approveBountyToken,
    claimFaucet,
    getBountyBalance,
    getBountyAllowance,
    // Chat
    sendMessage,
    getMessages,
  };
}
