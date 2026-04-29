import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn, TxOverlay } from '../components/Animations';
import EncryptionZone from '../components/EncryptionZone';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';
import { Building2, MapPin, Briefcase } from 'lucide-react';

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
    <div className="min-h-screen pt-24 pb-32">
      {isTxPending && <TxOverlay message="Encrypting payload and broadcasting to network..." />}

      <div className="max-w-2xl mx-auto px-6">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
            <span className="led led-green" />
            <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">Employer Module</span>
          </div>
          
          <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-4 drop-shadow-[0_1px_1px_#ffffff]">
            Initialize Posting<br/>
            <span className="inline-block mt-2 px-3 py-1 bg-accent text-ink rounded shadow-floating border border-ink/10">Maintain Secrecy</span>
          </h1>
          <p className="text-ink-muted text-lg mb-8">
            Your maximum budget is encrypted client-side using Zama FHE before any data leaves your terminal.
          </p>

          <form id="post-job-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="card">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              
              <h3 className="font-sans font-bold text-xl text-ink mb-6 border-b border-ink/10 pb-4">Position Details</h3>

              <div className="flex flex-col gap-5">
                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="title">
                    <Briefcase className="w-3.5 h-3.5" /> Job Title
                  </label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="form-label flex items-center gap-2" htmlFor="company">
                      <Building2 className="w-3.5 h-3.5" /> Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      className="form-input"
                      placeholder="Your organization"
                      value={formData.company}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2" htmlFor="location">
                      <MapPin className="w-3.5 h-3.5" /> Location
                    </label>
                    <input
                      id="location"
                      name="location"
                      className="form-input"
                      placeholder="e.g. Remote"
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
                    className="form-input cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%234a5568\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.5em_1.5em] appearance-none"
                    value={formData.jobType}
                    onChange={handleChange}
                  >
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
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

            <div className="mt-2">
              {!isConnected ? (
                <button
                  id="connect-to-post-btn"
                  type="button"
                  className="btn btn-primary w-full py-4 text-base"
                  onClick={openConnectModal}
                >
                  Connect Wallet to Proceed
                </button>
              ) : (
                <button
                  id="submit-post-job-btn"
                  type="submit"
                  className="btn btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isTxPending || !fhevmReady}
                >
                  {isTxPending ? 'Processing...' : 'Encrypt & Transmit to Network'}
                </button>
              )}
            </div>

            {isConnected && account && (
              <p className="text-center text-xs font-mono text-ink-muted uppercase tracking-widest mt-2">
                Active Terminal: {account.slice(0, 8)}...{account.slice(-6)} · Sepolia
              </p>
            )}
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
