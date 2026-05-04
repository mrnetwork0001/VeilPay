import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';
import { useWalletClient } from 'wagmi';
import { useTransaction } from '../components/TransactionOverlay';
import FheChat from '../components/FheChat';
import { Briefcase, Settings2, Unlock, Eye, FileDown, ExternalLink, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Power, Coins } from 'lucide-react';

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-${color}-500/10 rounded border border-${color}-500/20 text-[10px] font-mono font-bold text-${color}-600 uppercase tracking-widest`}>
      Score: {score}/100
    </span>
  );
}

function StatusBadge({ app }) {
  if (!app.matchRevealed) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 rounded border border-yellow-500/20 text-[10px] font-mono font-bold text-yellow-600 uppercase tracking-widest shadow-recessed">
      <Clock className="w-3 h-3" /> Pending Reveal
    </span>
  );
  if (app.matchResult) return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded border border-green-500/20 text-[10px] font-mono font-bold text-green-600 uppercase tracking-widest shadow-recessed shadow-glow-green">
        <CheckCircle2 className="w-3 h-3" /> Match
      </span>
      {app.revealedScore > 0 && <ScoreBadge score={app.revealedScore} />}
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded border border-red-500/20 text-[10px] font-mono font-bold text-red-600 uppercase tracking-widest shadow-recessed">
        <XCircle className="w-3 h-3" /> No Match
      </span>
      {app.revealedScore > 0 && <ScoreBadge score={app.revealedScore} />}
    </div>
  );
}

function ApplicationRow({ app, jobId, onResolve, onReveal, onUnlockResume, isLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [resumeCid, setResumeCid] = useState(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const { getResumeIfUnlocked } = useContract();

  const handleViewResume = async () => {
    if (resumeCid) return;
    setLoadingResume(true);
    try {
      const cid = await getResumeIfUnlocked(jobId, app.appId);
      setResumeCid(cid);
    } catch (err) {
      toast.error('Failed to fetch resume: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingResume(false);
    }
  };

  const isMatchComputed = app.matchHandle && BigInt(app.matchHandle) !== 0n;

  return (
    <div className="bg-muted/20 border border-ink/5 rounded-lg mb-3 overflow-hidden shadow-recessed">
      <div
        className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        <div>
          <div className="font-sans font-bold text-ink">
            {app.candidateName}
          </div>
          <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mt-1">
            Applied {new Date(app.appliedAt * 1000).toLocaleDateString()} · App #{app.appId}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge app={app} />
          {expanded ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink/10 p-4 bg-chassis/50 flex flex-col gap-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 items-center">
                {!app.matchRevealed && (
                  <button
                    id={`reveal-btn-${app.appId}`}
                    className="btn btn-primary text-xs h-9 px-4"
                    onClick={() => onReveal(jobId, app.appId, app.matchHandle)}
                    disabled={isLoading}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Reveal Match
                  </button>
                )}
                {app.matchRevealed && app.matchResult && !app.resumeUnlocked && (
                  <button
                    id={`unlock-resume-btn-${app.appId}`}
                    className="btn btn-primary bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-xs h-9 px-4"
                    onClick={() => onUnlockResume(jobId, app.appId)}
                    disabled={isLoading}
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1" /> Unlock Resume Payload
                  </button>
                )}
              </div>

              {/* Resume Details */}
              {app.resumeUnlocked && (
                <div className="w-full space-y-4">
                  <div className="flex gap-3 items-center flex-wrap">
                    <span className="font-mono text-[10px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resume Unlocked
                    </span>
                    {!resumeCid && (
                      <button
                        className="btn btn-secondary text-xs h-8 px-3"
                        onClick={handleViewResume}
                        disabled={loadingResume}
                      >
                        {loadingResume ? '⏳ Fetching CID...' : 'Fetch Payload CID'}
                      </button>
                    )}
                  </div>
                  
                  {resumeCid && (
                    <div className="bg-dark-panel p-4 rounded-lg shadow-recessed border border-white/10">
                      <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mb-2">IPFS Payload Address</div>
                      <div className="font-mono text-xs text-ink bg-accent/30 p-2 rounded border border-accent/40 break-all mb-4">{resumeCid}</div>
                      <div className="flex gap-3 flex-wrap">
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${resumeCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary text-xs h-8 px-4"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View via IPFS Gateway
                        </a>
                        <a
                          href={`https://ipfs.io/ipfs/${resumeCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-xs h-8 px-4"
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1" /> Download
                        </a>
                      </div>
                    </div>
                  )}

                  <FheChat
                    jobId={jobId}
                    applicationId={app.appId}
                    counterpartyName={app.candidateName}
                    isEmployer={true}
                  />
                </div>
              )}

              {app.matchRevealed && app.matchResult && !app.resumeUnlocked && (
                <FheChat
                  jobId={jobId}
                  applicationId={app.appId}
                  counterpartyName={app.candidateName}
                  isEmployer={true}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobSection({ jobId, employerJobs, onResolve, onReveal, onBatchResolve, onBatchReveal, onUnlockResume, onCloseJob, isLoading }) {
  const { getApplicationsForJob, getJobPosting } = useContract();
  const [apps, setApps] = useState([]);
  const [job, setJob] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    getJobPosting(jobId).then(setJob).catch(() => {});
  }, [jobId]);

  const loadApps = async () => {
    if (expanded) { setExpanded(false); return; }
    setLoadingApps(true);
    try {
      const data = await getApplicationsForJob(jobId);
      setApps(data);
      setExpanded(true);
    } finally {
      setLoadingApps(false);
    }
  };

  const unresolvedApps = apps.filter(a => !a.matchRevealed);
  const showBatchButtons = apps.length > 1 && unresolvedApps.length > 0;

  return (
    <div className="card mb-6 p-0 overflow-hidden">
      <div className="hidden md:block absolute top-4 left-4 card-screw" />
      <div className="hidden md:block absolute top-4 right-4 card-screw" />
      
      <div
        className="p-6 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
        onClick={loadApps}
      >
        <div>
          <h3 className="font-sans font-bold text-lg text-ink mb-1">
            {job?.title || `Job Module #${jobId}`}
          </h3>
          <div className="font-mono text-xs text-ink-muted uppercase tracking-widest flex items-center gap-2">
            {job?.company || ''} 
            <span className="w-1 h-1 bg-ink-muted rounded-full" />
            <span className={`flex items-center gap-1.5 ${job?.isActive ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${job?.isActive ? 'bg-green-500 shadow-glow-green' : 'bg-red-500'}`} />
              {job?.isActive ? 'Active' : 'Closed'}
            </span>
            {job?.bountyPool && (
              <>
                <span className="w-1 h-1 bg-ink-muted rounded-full" />
                <span className="flex items-center gap-1 text-green-600">
                  <Coins className="w-3 h-3" />
                  {(Number(job.bountyPool) / 1e6).toFixed(0)} cUSDC pool
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-ink-muted">
          {loadingApps ? <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" /> : expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-ink/10 p-4 md:p-6 bg-chassis">
              {showBatchButtons && (
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-muted/20 border border-white/20 rounded-lg shadow-recessed mb-6">
                  <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">
                    {unresolvedApps.length} Application{unresolvedApps.length !== 1 ? 's' : ''} Pending
                  </span>
                  <button
                    id={`batch-reveal-${jobId}`}
                    className="btn btn-primary text-xs h-9 px-4"
                    onClick={() => onBatchReveal(jobId, unresolvedApps)}
                    disabled={isLoading}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Reveal All Matches
                  </button>
                </div>
              )}

              {apps.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-mono text-xs text-ink-muted uppercase tracking-widest">No applications detected.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {apps.map(app => (
                    <ApplicationRow
                      key={app.appId}
                      app={app}
                      jobId={jobId}
                      onResolve={onResolve}
                      onReveal={onReveal}
                      onUnlockResume={onUnlockResume}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              )}
              {job?.isActive && (
                <div className="mt-4 pt-4 border-t border-ink/10 flex justify-end">
                  <button
                    className="btn btn-ghost text-xs text-red-600 hover:bg-red-500/10 h-8 px-3"
                    onClick={(e) => { e.stopPropagation(); onCloseJob(jobId); }}
                    disabled={isLoading}
                  >
                    <Power className="w-3.5 h-3.5 mr-1" /> Close Job & Refund cUSDC
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmployerDashboard() {
  const { account, isConnected, getJobsByEmployer, getApplicationsForJob, resolveApplication, revealMatchResult, unlockResume, closeJob } = useContract();
  const { openConnectModal } = useWalletConnect();
  const { decryptEbool, decryptUint8 } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const { startTransaction, updateStep, failTransaction, STATUS } = useTransaction();
  
  const [jobIds, setJobIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const ids = await getJobsByEmployer(account);
      setJobIds(ids);
    } finally {
      setLoading(false);
    }
  }, [account, getJobsByEmployer]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleResolve = async (jobId, appId) => {
    setTxLoading(true);
    startTransaction('Running FHE Comparison', [
      'Computing FHE.le() on encrypted salaries',
    ]);
    try {
      const receipt = await resolveApplication(jobId, appId);
      updateStep(0, STATUS.DONE, 'Encrypted result stored onchain', receipt?.hash || null);
    } catch (err) {
      failTransaction(err.message || 'Failed to resolve.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleReveal = async (jobId, appId, _matchHandle) => {
    setTxLoading(true);
    startTransaction('Revealing Match Result', [
      'Running FHE comparison onchain',
      'Fetching fresh encrypted handles',
      'Decrypting match & score via Zama coprocessor',
      'Committing result to contract',
    ]);
    try {
      // Step 1: Re-resolve
      const resolveReceipt = await resolveApplication(jobId, appId);
      updateStep(0, STATUS.DONE, 'FHE weighted scoring computed', resolveReceipt?.hash || null);

      // Step 2: Fetch fresh handles
      const apps = await getApplicationsForJob(jobId);
      const freshApp = apps.find(a => a.appId === appId);
      if (!freshApp?.matchHandle || BigInt(freshApp.matchHandle) === 0n) {
        throw new Error("FHE handle is empty after resolve.");
      }
      updateStep(1, STATUS.DONE, `Match handle: ${freshApp.matchHandle.slice(0, 14)}...`);

      // Step 3: Decrypt both the boolean match and the score
      const decryptedMatch = await decryptEbool(freshApp.matchHandle, walletClient, (progressMsg) => {
        updateStep(2, STATUS.ACTIVE, progressMsg);
      });

      let decryptedScore = 0;
      if (freshApp.scoreHandle && BigInt(freshApp.scoreHandle) !== 0n) {
        decryptedScore = await decryptUint8(freshApp.scoreHandle, walletClient, (progressMsg) => {
          updateStep(2, STATUS.ACTIVE, `Score: ${progressMsg}`);
        });
      }
      updateStep(2, STATUS.DONE, `Match: ${decryptedMatch ? '✅' : '❌'} | Score: ${decryptedScore}/100`);

      // Step 4: Commit both result and score
      const revealReceipt = await revealMatchResult(jobId, appId, decryptedMatch, decryptedScore);
      updateStep(3, STATUS.DONE, 'Result confirmed onchain', revealReceipt?.hash || null);

      loadJobs();
    } catch (err) {
      const msg = err.message || 'Failed to reveal match.';
      if (msg.includes('Already resolved')) {
        failTransaction('This match has already been revealed.');
      } else {
        failTransaction(msg);
      }
    } finally {
      setTxLoading(false);
    }
  };

  const handleUnlock = async (jobId, appId) => {
    setTxLoading(true);
    startTransaction('Unlocking Resume', [
      'Submitting unlock transaction to Sepolia',
    ]);
    try {
      const receipt = await unlockResume(jobId, appId);
      updateStep(0, STATUS.DONE, 'Resume IPFS link is now accessible', receipt?.hash || null);
    } catch (err) {
      failTransaction(err.message || 'Failed to unlock resume.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleBatchResolve = async (jobId, apps) => {
    setTxLoading(true);
    const total = apps.length;
    const stepLabels = apps.map(app => `Resolve: ${app.candidateName}`);
    startTransaction(`Resolving ${total} Applications`, stepLabels);
    let completed = 0;
    try {
      for (const app of apps) {
        const receipt = await resolveApplication(jobId, app.appId);
        updateStep(completed, STATUS.DONE, 'FHE comparison computed', receipt?.hash || null);
        completed++;
      }
    } catch (err) {
      failTransaction(`Failed at applicant ${completed + 1}/${total}: ${err.message || 'Unknown error'}`);
    } finally {
      setTxLoading(false);
    }
  };

  const handleBatchReveal = async (jobId, apps) => {
    setTxLoading(true);
    const total = apps.length;
    const stepLabels = [];
    apps.forEach(app => {
      stepLabels.push(`Resolve & decrypt: ${app.candidateName}`);
      stepLabels.push(`Commit result: ${app.candidateName}`);
    });
    startTransaction(`Revealing ${total} Matches`, stepLabels);
    let stepIdx = 0;
    let completed = 0;
    try {
      for (const app of apps) {
        const resolveReceipt = await resolveApplication(jobId, app.appId);
        const freshApps = await getApplicationsForJob(jobId);
        const freshApp = freshApps.find(a => a.appId === app.appId);
        const decryptedMatch = await decryptEbool(freshApp.matchHandle, walletClient, (msg) => {
          updateStep(stepIdx, STATUS.ACTIVE, msg);
        });
        let decryptedScore = 0;
        if (freshApp.scoreHandle && BigInt(freshApp.scoreHandle) !== 0n) {
          decryptedScore = await decryptUint8(freshApp.scoreHandle, walletClient, () => {});
        }
        updateStep(stepIdx, STATUS.DONE, `${decryptedMatch ? 'MATCH ✅' : 'NO MATCH ❌'} (Score: ${decryptedScore}/100)`, resolveReceipt?.hash || null);
        stepIdx++;

        const revealReceipt = await revealMatchResult(jobId, app.appId, decryptedMatch, decryptedScore);
        updateStep(stepIdx, STATUS.DONE, 'Confirmed onchain', revealReceipt?.hash || null);
        stepIdx++;
        completed++;
      }
      loadJobs();
    } catch (err) {
      failTransaction(`Failed at applicant ${completed + 1}/${total}: ${err.message || 'Unknown error'}`);
    } finally {
      setTxLoading(false);
    }
  };

  const handleCloseJob = async (jobId) => {
    setTxLoading(true);
    startTransaction('Closing Job & Refunding Bounty', [
      'Closing job and refunding remaining cUSDC',
    ]);
    try {
      const receipt = await closeJob(jobId);
      updateStep(0, STATUS.DONE, 'Job closed. Remaining cUSDC refunded.', receipt?.hash || null);
      loadJobs();
    } catch (err) {
      failTransaction(err.message || 'Failed to close job.');
    } finally {
      setTxLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-32 pb-32 flex flex-col items-center justify-center px-6">
        <Briefcase className="w-16 h-16 text-ink-muted mb-6 shadow-glow bg-chassis rounded-xl p-3 border border-white/20" />
        <h2 className="font-sans font-bold text-3xl text-ink mb-4 text-center">Connect Wallet</h2>
        <p className="text-ink-muted text-center max-w-sm mb-8 font-mono text-sm leading-relaxed">
          Connect the wallet you used to post jobs to access your employer dashboard.
        </p>
        <button id="employer-connect-btn" className="btn btn-primary px-8 py-4 shadow-floating" onClick={openConnectModal}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[72rem] mx-auto px-6 md:px-12">
        <FadeIn>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
                <span className="led led-green" />
                <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">Employer Dashboard</span>
              </div>
              <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-2 drop-shadow-[0_1px_1px_#ffffff]">
                My <span className="inline-block px-2 py-0.5 bg-accent text-ink rounded shadow-floating border border-ink/10">Job Postings</span>
              </h1>
              <p className="text-ink-muted text-lg max-w-xl">
                Manage applications and reveal salary matches. All salary data remains fully encrypted.
              </p>
            </div>
            <Link to="/post-job" id="dashboard-post-new-btn" className="btn btn-primary shrink-0 shadow-floating px-6 py-3">
              Post New Job
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-ink-muted">
              <span className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4 shadow-glow"></span>
              <span className="font-mono text-xs uppercase tracking-widest font-bold">Loading jobs...</span>
            </div>
          ) : jobIds.length === 0 ? (
            <div className="card text-center py-20 bg-muted/20 border-dashed border-2 border-white/20">
              <Briefcase className="w-12 h-12 text-ink-muted mx-auto mb-4 opacity-50" />
              <h3 className="font-sans font-bold text-2xl text-ink mb-3">No Jobs Posted Yet</h3>
              <p className="text-ink-muted text-sm font-mono uppercase tracking-widest mb-8">Post a job to start receiving confidential applications.</p>
              <Link to="/post-job" className="btn btn-primary shadow-floating px-8">Post Your First Job</Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest mb-6 px-2 flex justify-between border-b border-ink/10 pb-4">
                <span>{jobIds.length} Job{jobIds.length !== 1 ? 's' : ''} Posted</span>
                <span>Select a job to view applicants</span>
              </div>
              {jobIds.map(id => (
                <JobSection
                  key={id}
                  jobId={id}
                  onResolve={handleResolve}
                  onReveal={handleReveal}
                  onBatchResolve={handleBatchResolve}
                  onBatchReveal={handleBatchReveal}
                  onUnlockResume={handleUnlock}
                  onCloseJob={handleCloseJob}
                  isLoading={txLoading}
                />
              ))}
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
