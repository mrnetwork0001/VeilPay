import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';
import FheChat from '../components/FheChat';

function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() / 1000) - timestamp);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ app }) {
  if (!app.matchRevealed) return <span className="badge badge-pending">⏳ Pending</span>;
  if (app.matchResult) return <span className="badge badge-match">✓ Match</span>;
  return <span className="badge badge-no-match">✗ No Match</span>;
}



export default function CandidateDashboard() {
  const { account, isConnected, getMyApplications } = useContract();
  const { openConnectModal } = useWalletConnect();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadApplications = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const data = await getMyApplications();
      setApplications(data);
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [account, getMyApplications]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  const matchCount = applications.filter(a => a.matchResult).length;
  const pendingCount = applications.filter(a => !a.matchRevealed).length;
  const noMatchCount = applications.filter(a => a.matchRevealed && !a.matchResult).length;

  if (!isConnected) {
    return (
      <div className="page-wrapper flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🧑‍💻</div>
        <h2>Connect Your Wallet</h2>
        <p style={{ color: 'var(--white-70)', textAlign: 'center', maxWidth: 400 }}>
          Connect the wallet you used to apply to view your candidate dashboard.
        </p>
        <button id="candidate-connect-btn" className="btn btn-primary btn-lg" onClick={openConnectModal}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <FadeIn>
          <div style={{ marginBottom: '2rem' }}>
            <span className="section-label">Candidate Dashboard</span>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
              My <span className="gradient-text">Applications</span>
            </h1>
            <p style={{ color: 'var(--white-70)' }}>
              Track your applications — your salary expectation remains encrypted regardless of outcome.
            </p>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Applications', value: applications.length, color: 'var(--violet-light)' },
              { label: '✓ Matched', value: matchCount, color: 'var(--green)' },
              { label: '⏳ Pending', value: pendingCount, color: '#FBBF24' },
            ].map(stat => (
              <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: stat.color }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--white-50)', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex-center" style={{ minHeight: 300 }}>
              <div className="tx-spinner" />
            </div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No applications yet</h3>
              <p style={{ marginBottom: '1.5rem' }}>Browse jobs and apply with your encrypted salary expectation.</p>
              <Link to="/jobs" className="btn btn-primary">Browse Jobs</Link>
            </div>
          ) : (
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {applications.map((app, i) => (
                <StaggerItem key={`${app.jobId}-${app.appId}`}>
                  <div className="card" id={`candidate-app-card-${i}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>
                          {app.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--white-70)', marginTop: '0.2rem' }}>
                          {app.company} · Applied {timeAgo(app.appliedAt)}
                        </div>
                      </div>
                      <StatusBadge app={app} />
                    </div>

                    {app.matchRevealed && app.matchResult && (
                      <div style={{
                        marginTop: '1rem', padding: '0.85rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)'
                      }}>
                        <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: '0.25rem' }}>🎉 It's a Match!</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--white-70)' }}>
                          The employer has been notified and may unlock your resume. Your minimum salary was never revealed.
                        </div>
                      </div>
                      <FheChat
                        jobId={app.jobId}
                        applicationId={app.appId}
                        counterpartyName={app.company}
                        isEmployer={false}
                      />
                    )}

                    {app.matchRevealed && !app.matchResult && (
                      <div style={{
                        marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--white-50)' }}>
                          No salary match. Your minimum expectation was not revealed. 🔒
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <span className="badge badge-confidential">Salary: Never Revealed</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--white-50)', border: '1px solid var(--border)' }}>
                        Job #{app.jobId}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/jobs" id="candidate-browse-more-btn" className="btn btn-secondary">
              Browse More Jobs →
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
