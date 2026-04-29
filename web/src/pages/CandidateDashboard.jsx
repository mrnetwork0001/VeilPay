import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';
import FheChat from '../components/FheChat';
import { User, CheckCircle2, XCircle, Clock, Lock, Briefcase, FileText } from 'lucide-react';

function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() / 1000) - timestamp);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ app }) {
  if (!app.matchRevealed) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 rounded border border-yellow-500/20 text-[10px] font-mono font-bold text-yellow-600 uppercase tracking-widest shadow-recessed">
      <Clock className="w-3 h-3" /> Pending Reveal
    </span>
  );
  if (app.matchResult) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded border border-green-500/20 text-[10px] font-mono font-bold text-green-600 uppercase tracking-widest shadow-recessed shadow-glow-green">
      <CheckCircle2 className="w-3 h-3" /> Match Evaluated True
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded border border-red-500/20 text-[10px] font-mono font-bold text-red-600 uppercase tracking-widest shadow-recessed">
      <XCircle className="w-3 h-3" /> Match Evaluated False
    </span>
  );
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
      <div className="min-h-screen pt-32 pb-32 flex flex-col items-center justify-center px-6">
        <User className="w-16 h-16 text-ink-muted mb-6 shadow-glow bg-chassis rounded-xl p-3 border border-white/20" />
        <h2 className="font-sans font-bold text-3xl text-ink mb-4 text-center">Connect Terminal</h2>
        <p className="text-ink-muted text-center max-w-sm mb-8 font-mono text-sm leading-relaxed">
          Establish connection with the wallet utilized for application submissions to access the candidate dashboard.
        </p>
        <button id="candidate-connect-btn" className="btn btn-primary px-8 py-4 shadow-floating" onClick={openConnectModal}>
          Initialize Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[72rem] mx-auto px-6 md:px-12">
        <FadeIn>
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
              <span className="led led-green" />
              <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">Candidate Terminal</span>
            </div>
            <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-2 drop-shadow-[0_1px_1px_#ffffff]">
              Application <span className="inline-block px-2 py-0.5 bg-accent text-ink rounded shadow-floating border border-ink/10">Telemetry</span>
            </h1>
            <p className="text-ink-muted text-lg max-w-xl">
              Track module evaluations. Your scalar expectation remains encrypted in FHE ciphertext regardless of computational outcome.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {[
              { label: 'Total Payloads', value: applications.length, color: 'text-ink', border: 'border-ink/10' },
              { label: 'Matched', value: matchCount, color: 'text-green-500', border: 'border-green-500/20' },
              { label: 'Pending Reveal', value: pendingCount, color: 'text-yellow-500', border: 'border-yellow-500/20' },
            ].map(stat => (
              <div key={stat.label} className={`bg-chassis border ${stat.border} rounded-xl p-6 shadow-card relative overflow-hidden flex flex-col items-center text-center group hover:bg-white/5 transition-colors`}>
                <div className="absolute top-3 left-3 card-screw opacity-50" />
                <div className="absolute top-3 right-3 card-screw opacity-50" />
                <div className={`font-mono text-5xl font-bold ${stat.color} mb-2 shadow-glow-sm`}>
                  {stat.value}
                </div>
                <div className="font-mono text-[10px] text-ink-muted font-bold uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-ink-muted">
              <span className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4 shadow-glow"></span>
              <span className="font-mono text-xs uppercase tracking-widest font-bold">Querying Data Matrix...</span>
            </div>
          ) : applications.length === 0 ? (
            <div className="card text-center py-20 bg-muted/20 border-dashed border-2 border-white/20">
              <FileText className="w-12 h-12 text-ink-muted mx-auto mb-4 opacity-50" />
              <h3 className="font-sans font-bold text-2xl text-ink mb-3">No Payloads Deployed</h3>
              <p className="text-ink-muted text-sm font-mono uppercase tracking-widest mb-8">Deploy a payload to an active job module.</p>
              <Link to="/jobs" className="btn btn-primary shadow-floating px-8">Query Network Grid</Link>
            </div>
          ) : (
            <StaggerContainer className="flex flex-col gap-6">
              <div className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest mb-2 px-2 flex justify-between border-b border-ink/10 pb-4">
                <span>Application History Log</span>
              </div>
              
              {applications.map((app, i) => (
                <StaggerItem key={`${app.jobId}-${app.appId}`}>
                  <div className="card overflow-hidden" id={`candidate-app-card-${i}`}>
                    <div className="absolute top-4 right-4 card-screw" />
                    
                    <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 mb-6 border-b border-ink/10 pb-4">
                      <div>
                        <h3 className="font-sans font-bold text-xl text-ink mb-1">
                          {app.title}
                        </h3>
                        <div className="font-mono text-xs text-ink-muted uppercase tracking-widest flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" /> {app.company} 
                          <span className="w-1 h-1 bg-ink/20 rounded-full mx-1" /> 
                          T-Minus {timeAgo(app.appliedAt)}
                        </div>
                      </div>
                      <StatusBadge app={app} />
                    </div>

                    {app.matchRevealed && app.matchResult && (
                      <div className="mb-6 space-y-6">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 shadow-recessed flex gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <div>
                            <div className="font-mono font-bold text-xs text-green-600 uppercase tracking-widest mb-1">Evaluation Positive</div>
                            <p className="text-xs text-ink-muted font-mono leading-relaxed">
                              The module administrator has been notified and may unlock your payload. Your parameter remains encrypted.
                            </p>
                          </div>
                        </div>
                        <FheChat
                          jobId={app.jobId}
                          applicationId={app.appId}
                          counterpartyName={app.company}
                          isEmployer={false}
                        />
                      </div>
                    )}

                    {app.matchRevealed && !app.matchResult && (
                      <div className="mb-6 bg-red-500/5 border border-red-500/10 rounded-lg p-4 shadow-recessed flex gap-3 opacity-80">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-xs text-ink-muted font-mono leading-relaxed">
                          Evaluation returned False. Your minimum expectation was not revealed. <Lock className="w-3 h-3 inline text-red-400" />
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent text-ink rounded border border-ink/10 text-[10px] font-mono font-bold uppercase tracking-widest shadow-floating">
                        <Lock className="w-3 h-3 text-ink" /> Parameter Encrypted
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-muted/40 rounded border border-white/20 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest shadow-recessed">
                        Module ID: #{app.jobId}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          <div className="text-center mt-16">
            <Link to="/jobs" id="candidate-browse-more-btn" className="btn btn-secondary shadow-floating">
              Resume Network Scan
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
