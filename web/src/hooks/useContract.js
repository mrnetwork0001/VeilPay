import { useCallback } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import BLINDHIRE_ABI from '../abi/BlindHire.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

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
    const [ids, employers, titles, companies, locations, jobTypes, createdAts, appCounts] =
      await contract.getActiveJobs();

    return ids.map((id, i) => ({
      id: Number(id),
      employer: employers[i],
      title: titles[i],
      company: companies[i],
      location: locations[i],
      jobType: jobTypes[i],
      createdAt: Number(createdAts[i]),
      applicationCount: Number(appCounts[i]),
    }));
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
    // Must use wallet-connected contract because the on-chain function
    // has an `onlyEmployer` modifier that checks msg.sender.
    const contract = await getWriteContract();
    const [appIds, candidates, names, matchRevealeds, matchResults, resumeUnlockeds, appliedAts] =
      await contract.getApplicationsForJob(jobId);

    return appIds.map((id, i) => ({
      appId: Number(id),
      candidate: candidates[i],
      candidateName: names[i],
      matchRevealed: matchRevealeds[i],
      matchResult: matchResults[i],
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

  const createJobPosting = useCallback(async (title, company, location, jobType, handle, inputProof) => {
    const contract = await getWriteContract();
    const tx = await contract.createJobPosting(title, company, location, jobType, handle, inputProof);
    return await tx.wait();
  }, [getWriteContract]);

  const applyToJob = useCallback(async (jobId, candidateName, resumeIpfsCid, handle, inputProof) => {
    const contract = await getWriteContract();
    const tx = await contract.applyToJob(jobId, candidateName, resumeIpfsCid, handle, inputProof);
    return await tx.wait();
  }, [getWriteContract]);

  const resolveApplication = useCallback(async (jobId, appId) => {
    const contract = await getWriteContract();
    const tx = await contract.resolveApplication(jobId, appId);
    return await tx.wait();
  }, [getWriteContract]);

  const revealMatchResult = useCallback(async (jobId, appId) => {
    const contract = await getWriteContract();
    const tx = await contract.revealMatchResult(jobId, appId);
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

  return {
    // Wallet state (from wagmi — driven by ConnectWalletButton)
    account,
    isConnected,
    // Read
    getActiveJobs,
    getJobsByEmployer,
    getJobPosting,
    getApplicationsForJob,
    getMyApplications,
    getResumeIfUnlocked,
    getMessageCount,
    // Write
    createJobPosting,
    applyToJob,
    resolveApplication,
    revealMatchResult,
    unlockResume,
    closeJob,
    // Chat
    sendMessage,
    getMessages,
  };
}
