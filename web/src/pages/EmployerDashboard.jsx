import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';

function StatusBadge({ app }) {
  if (!app.matchRevealed) return <span className="badge badge-pending">⏳ Pending Reveal</span>;
  if (app.matchResult) return <span className="badge badge-match">✓ Match</span>;
  return <span className="badge badge-no-match">✗ No Match</span>;
}

function ApplicationRow({ app, jobId, onResolve, onReveal, onUnlockResume, isLoading }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(p => !p)}
      >
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
            {app.candidateName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--white-50)', marginTop: '0.2rem' }}>
            Applied {new Date(app.appliedAt * 1000).toLocaleDateString()} · App #{app.appId}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StatusBadge app={app} />
          <span style={{ color: 'var(--white-50)', fontSize: '1.2rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!app.matchRevealed && (
                <>
                  <button
                    id={`resolve-btn-${app.appId}`}
                    className="btn btn-secondary btn-sm"
                    onClick={() => onResolve(jobId, app.appId)}
                    disabled={isLoading}
                  >
                    ⚙️ Run FHE Match
                  </button>
                  <button
                    id={`reveal-btn-${app.appId}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => onReveal(jobId, app.appId)}
                    disabled={isLoading}
                  >
                    🔮 Reveal Match Result
                  </button>
                </>
              )}
              {app.matchRevealed && app.matchResult && !app.resumeUnlocked && (
                <button
                  id={`unlock-resume-btn-${app.appId}`}
                  className="btn btn-cyan btn-sm"
                  onClick={() => onUnlockResume(jobId, app.appId)}
                  disabled={isLoading}
                >
                  📄 Unlock Resume
                </button>
              )}
              {app.resumeUnlocked && (
                <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>
                  ✓ Resume unlocked — view in Dashboard below
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobSection({ jobId, employerJobs, onResolve, onReveal, onBatchResolve, onBatchReveal, onUnlockResume, isLoading }) {
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

  // Determine which apps need batch actions
  const unresolvedApps = apps.filter(a => !a.matchRevealed);
  const showBatchButtons = apps.length > 1 && unresolvedApps.length > 0;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={loadApps}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
            {job?.title || `Job #${jobId}`}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--white-50)' }}>
            {job?.company || ''} · {job?.isActive ? '🟢 Active' : '⚫ Closed'}
          </div>
        </div>
        <span style={{ color: 'var(--white-50)' }}>{loadingApps ? '⏳' : expanded ? '▲' : '▼'}</span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem' }}>
              {/* ── Batch Action Buttons ─────────────────────────────── */}
              {showBatchButtons && (
                <div style={{
                  display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
                  marginBottom: '1rem', padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--white-50)', marginRight: 'auto' }}>
                    {unresolvedApps.length} applicant{unresolvedApps.length !== 1 ? 's' : ''} pending
                  </span>
                  <button
                    id={`batch-resolve-${jobId}`}
                    className="btn btn-secondary btn-sm"
                    onClick={() => onBatchResolve(jobId, unresolvedApps)}
                    disabled={isLoading}
                    style={{ fontSize: '0.78rem' }}
                  >
                    ⚙️ Resolve All ({unresolvedApps.length})
                  </button>
                  <button
                    id={`batch-reveal-${jobId}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => onBatchReveal(jobId, unresolvedApps)}
                    disabled={isLoading}
                    style={{ fontSize: '0.78rem' }}
                  >
                    🔮 Reveal All ({unresolvedApps.length})
                  </button>
                </div>
              )}

              {apps.length === 0 ? (
                <p style={{ color: 'var(--white-50)', fontSize: '0.85rem' }}>No applications yet.</p>
              ) : (
                apps.map(app => (
                  <ApplicationRow
                    key={app.appId}
                    app={app}
                    jobId={jobId}
                    onResolve={onResolve}
                    onReveal={onReveal}
                    onUnlockResume={onUnlockResume}
                    isLoading={isLoading}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmployerDashboard() {
  const { account, isConnected, getJobsByEmployer, getApplicationsForJob, resolveApplication, revealMatchResult, unlockResume } = useContract();
  const { openConnectModal } = useWalletConnect();
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
    try {
      toast.loading('Running FHE comparison on-chain...', { id: 'tx' });
      await resolveApplication(jobId, appId);
      toast.success('Match computed via TFHE.le() — encrypted result stored on-chain.', { id: 'tx', duration: 5000 });
    } catch (err) {
      toast.error(err.message || 'Failed to resolve.', { id: 'tx' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleReveal = async (jobId, appId) => {
    setTxLoading(true);
    try {
      toast.loading('Revealing match result on-chain...', { id: 'tx' });
      await revealMatchResult(jobId, appId);
      toast.success('✅ Match revealed! The FHE-computed result is now visible.', { id: 'tx', duration: 5000 });
    } catch (err) {
      toast.error(err.message || 'Failed to reveal match.', { id: 'tx' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleUnlock = async (jobId, appId) => {
    setTxLoading(true);
    try {
      toast.loading('Unlocking resume...', { id: 'tx' });
      await unlockResume(jobId, appId);
      toast.success('Resume unlocked! The candidate\'s IPFS link is now accessible.', { id: 'tx', duration: 5000 });
    } catch (err) {
      toast.error(err.message || 'Failed to unlock resume.', { id: 'tx' });
    } finally {
      setTxLoading(false);
    }
  };

  // ── Batch handlers ──────────────────────────────────────────────────────────

  const handleBatchResolve = async (jobId, apps) => {
    setTxLoading(true);
    const total = apps.length;
    let completed = 0;
    try {
      for (const app of apps) {
        completed++;
        toast.loading(`⚙️ Running FHE match ${completed}/${total}...`, { id: 'batch-tx' });
        await resolveApplication(jobId, app.appId);
      }
      toast.success(`✅ All ${total} applications resolved via FHE.`, { id: 'batch-tx', duration: 5000 });
    } catch (err) {
      toast.error(`Failed at applicant ${completed}/${total}: ${err.message || 'Unknown error'}`, { id: 'batch-tx' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleBatchReveal = async (jobId, apps) => {
    setTxLoading(true);
    const total = apps.length;
    let completed = 0;
    try {
      for (const app of apps) {
        completed++;
        toast.loading(`🔮 Requesting reveal ${completed}/${total}...`, { id: 'batch-tx' });
        await revealMatchResult(jobId, app.appId);
      }
      toast.success(`✅ All ${total} reveal requests submitted. Check back for results.`, { id: 'batch-tx', duration: 5000 });
    } catch (err) {
      toast.error(`Failed at applicant ${completed}/${total}: ${err.message || 'Unknown error'}`, { id: 'batch-tx' });
    } finally {
      setTxLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="page-wrapper flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>💼</div>
        <h2>Connect Your Wallet</h2>
        <p style={{ color: 'var(--white-70)', textAlign: 'center', maxWidth: 400 }}>
          Connect the wallet you used to post jobs to view your employer dashboard.
        </p>
        <button id="employer-connect-btn" className="btn btn-primary btn-lg" onClick={openConnectModal}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <FadeIn>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="section-label">Employer Dashboard</span>
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                Your <span className="gradient-text">Active Postings</span>
              </h1>
              <p style={{ color: 'var(--white-70)' }}>
                Manage applications — all salary data remains encrypted on-chain.
              </p>
            </div>
            <Link to="/post-job" id="dashboard-post-new-btn" className="btn btn-primary">
              + Post New Job
            </Link>
          </div>

          {loading ? (
            <div className="flex-center" style={{ minHeight: 300 }}>
              <div className="tx-spinner" />
            </div>
          ) : jobIds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No jobs posted yet</h3>
              <p style={{ marginBottom: '1.5rem' }}>Start by posting your first job with a confidential salary budget.</p>
              <Link to="/post-job" className="btn btn-primary">Post Your First Job</Link>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--white-50)', marginBottom: '1rem' }}>
                {jobIds.length} job{jobIds.length !== 1 ? 's' : ''} posted · Click a job to see applications
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
