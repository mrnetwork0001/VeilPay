import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn } from '../components/Animations';
import { TxOverlay } from '../components/Animations';
import EncryptionZone from '../components/EncryptionZone';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];

export default function PostJob() {
  const navigate = useNavigate();
  const { account, isConnected, createJobPosting } = useContract();
  const { openConnectModal } = useWalletConnect();
  const { isReady: fhevmReady, fheLoaded, encryptUint64 } = useFhevm();

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    jobType: 'Full-time',
  });
  const [maxBudget, setMaxBudget] = useState(120000);
  const [isTxPending, setIsTxPending] = useState(false);

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
      toast.error('fhevmjs is still initializing. Please wait a moment.', { icon: '⏳' });
      return;
    }

    const { title, company, location, jobType } = formData;
    if (!title || !company || !location) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsTxPending(true);

    try {
      toast.loading('Encrypting your budget with ZamaFHE...', { id: 'tx' });
      // Yield to the event loop so the UI updates and the toast appears before the heavy WASM compute blocks the main thread
      await new Promise(r => setTimeout(r, 100));

      let handle, inputProof;
      try {
        ({ handle, inputProof } = await encryptUint64(maxBudget, account));
      } catch (encErr) {
        toast.error(`FHE encryption failed: ${encErr.message}`, { id: 'tx', duration: 8000 });
        return;
      }

      toast.loading('Submitting to Sepolia...', { id: 'tx' });
      await createJobPosting(title, company, location, jobType, handle, inputProof);

      toast.success('Job posted successfully! Salary encrypted forever. 🔐', { id: 'tx', duration: 5000 });
      navigate('/dashboard/employer');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Transaction failed. Check console for details.', { id: 'tx' });
    } finally {
      setIsTxPending(false);
    }
  };

  return (
    <div className="page-wrapper">
      {isTxPending && <TxOverlay message="Encrypting your budget and posting to the blockchain..." />}

      <div className="container" style={{ maxWidth: 680 }}>
        <FadeIn>
          <span className="section-label">For Employers</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '0.5rem' }}>
            Post a Job — <span className="gradient-text">Budget Stays Private</span>
          </h1>
          <p style={{ color: 'var(--white-70)', marginBottom: '2.5rem' }}>
            Your maximum budget is encrypted client-side using ZamaFHE before anything touches the blockchain.
          </p>

          <form id="post-job-form" onSubmit={handleSubmit}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '-0.5rem' }}>Position Details</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="title">Job Title *</label>
                <input
                  id="title"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Senior Solidity Engineer"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="company">Company Name *</label>
                  <input
                    id="company"
                    name="company"
                    className="form-input"
                    placeholder="Your company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="location">Location *</label>
                  <input
                    id="location"
                    name="location"
                    className="form-input"
                    placeholder="Remote, New York, etc."
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="jobType">Job Type</label>
                <select
                  id="jobType"
                  name="jobType"
                  className="form-input"
                  value={formData.jobType}
                  onChange={handleChange}
                >
                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* ── ENCRYPTION ZONE ── */}
            <EncryptionZone
              label="Maximum Salary Budget"
              value={maxBudget}
              onChange={setMaxBudget}
              min={30000}
              max={500000}
              step={5000}
            />

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              {!isConnected ? (
                <button
                  id="connect-to-post-btn"
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  onClick={openConnectModal}
                >
                  Connect Wallet to Post
                </button>
              ) : (
                <button
                  id="submit-post-job-btn"
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  disabled={isTxPending || !fhevmReady}
                >
                  {isTxPending ? 'Processing...' : '🔐 Encrypt & Post Job (ZamaFHE)'}
                </button>
              )}
            </div>

            {isConnected && account && (
              <p style={{ fontSize: '0.75rem', color: 'var(--white-50)', marginTop: '0.75rem', textAlign: 'center' }}>
                Connected: {account.slice(0, 10)}...{account.slice(-6)} · Sepolia Testnet
              </p>
            )}
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
