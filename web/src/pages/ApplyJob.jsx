import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn, TxOverlay } from '../components/Animations';
import EncryptionZone from '../components/EncryptionZone';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';
import { uploadToIPFS, isIPFSConfigured } from '../utils/ipfs';

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, getJobPosting, applyToJob } = useContract();
  const { openConnectModal } = useWalletConnect();
  const { isReady: fhevmReady, fheLoaded, encryptUint64 } = useFhevm();

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [minExpectation, setMinExpectation] = useState(100000);
  const [isTxPending, setIsTxPending] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [formData, setFormData] = useState({ candidateName: '' });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await getJobPosting(jobId);
        setJob(data);
      } catch (err) {
        console.error("Error fetching job:", err);
      } finally {
        setLoadingJob(false);
      }
    };
    fetchJob();
  }, [jobId, getJobPosting]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (!fhevmReady) {
      toast.error('fhevmjs is still initializing. Please wait.', { icon: '⏳' });
      return;
    }

    if (!resumeFile) {
      toast.error('Please upload your resume.');
      return;
    }

    if (!formData.candidateName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }

    setIsTxPending(true);

    try {
      toast.loading('Uploading resume to IPFS via Pinata...', { id: 'tx' });
      const ipfsResult = await uploadToIPFS(resumeFile);
      const ipfsCid = ipfsResult.cid;

      toast.loading('Encrypting salary expectation via ZamaFHE...', { id: 'tx' });
      // Yield to the event loop so the UI updates before WASM blocks the main thread
      await new Promise(r => setTimeout(r, 100));

      let handle, inputProof;
      try {
        ({ handle, inputProof } = await encryptUint64(minExpectation, account));
      } catch (encErr) {
        toast.error(`FHE encryption failed: ${encErr.message}`, { id: 'tx', duration: 8000 });
        return;
      }

      toast.loading('Submitting application to Sepolia...', { id: 'tx' });
      await applyToJob(Number(jobId), formData.candidateName, ipfsCid, handle, inputProof);

      toast.success('Application submitted! Your salary expectation is encrypted forever. 🔐', { id: 'tx', duration: 5000 });
      navigate('/dashboard/candidate');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Transaction failed.', { id: 'tx' });
    } finally {
      setIsTxPending(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="page-wrapper flex-center">
        <div className="tx-spinner" />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {isTxPending && <TxOverlay message="Uploading resume to IPFS and encrypting your salary expectation..." />}

      <div className="container" style={{ maxWidth: 720 }}>
        <FadeIn>
          {job && (
            <div className="card card-glass" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#fff', fontSize: '1.1rem', flexShrink: 0 }}>
                {job.company?.[0] ?? '?'}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>
                  {job.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--white-70)' }}>
                  {job.company} · {job.location} · <span className="badge badge-violet" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>{job.jobType}</span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span className="badge badge-confidential">Salary: Confidential</span>
              </div>
            </div>
          )}

          <span className="section-label">Apply to This Position</span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: '0.5rem' }}>
            Your Expectation — <span className="gradient-text">Never Revealed</span>
          </h1>
          <p style={{ color: 'var(--white-70)', marginBottom: '2rem' }}>
            Your minimum salary expectation is encrypted in your browser using ZamaFHE. Not even the employer will know your number unless you match.
          </p>

          <form id="apply-job-form" onSubmit={handleSubmit}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '-0.5rem' }}>Your Details</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="candidateName">Full Name *</label>
                <input
                  id="candidateName"
                  name="candidateName"
                  className="form-input"
                  placeholder="Your full name"
                  value={formData.candidateName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="resume">Resume (PDF/DOC) *</label>
                <input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="form-input"
                  style={{ cursor: 'pointer' }}
                  onChange={e => setResumeFile(e.target.files[0])}
                />
                {resumeFile && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--green)', marginTop: '0.25rem' }}>
                    ✓ {resumeFile.name} — will be uploaded to IPFS (revealed only on match)
                  </p>
                )}
              </div>
            </div>

            <EncryptionZone
              label="Minimum Salary Expectation"
              value={minExpectation}
              onChange={setMinExpectation}
              min={30000}
              max={500000}
              step={5000}
            />

            <div style={{
              marginTop: '1.25rem', padding: '0.75rem 1rem',
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--white-70)',
            }}>
              🔒 <strong style={{ color: 'var(--green)' }}>What gets revealed on match?</strong>{' '}
              Only your name and resume link. Your minimum salary is <em>never</em> decrypted — even if there's no match.
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <Link to="/jobs" className="btn btn-secondary btn-lg">← Back</Link>
              {!isConnected ? (
                <button id="connect-to-apply-btn" type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={openConnectModal}>
                  Connect Wallet to Apply
                </button>
              ) : (
                <button
                  id="submit-apply-btn"
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  disabled={isTxPending || !fhevmReady}
                >
                  {isTxPending ? 'Processing...' : '🔐 Encrypt & Apply (ZamaFHE)'}
                </button>
              )}
            </div>
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
