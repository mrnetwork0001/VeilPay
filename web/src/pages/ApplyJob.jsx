import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn } from '../components/Animations';
import EncryptionZone from '../components/EncryptionZone';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';
import { useTransaction } from '../components/TransactionOverlay';
import { uploadToIPFS, isIPFSConfigured } from '../utils/ipfs';
import { Lock, MapPin, Briefcase, FileText, User } from 'lucide-react';

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, getJobPosting, applyToJob } = useContract();
  const { openConnectModal } = useWalletConnect();
  const { isReady: fhevmReady, fheLoaded, encryptUint64 } = useFhevm();
  const { startTransaction, updateStep, failTransaction, STATUS } = useTransaction();

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
    startTransaction('Submitting Application', [
      'Uploading resume to IPFS via Pinata',
      'Encrypting salary expectation via ZamaFHE',
      'Submitting application to Sepolia',
    ]);

    try {
      // Step 1: Upload resume to IPFS
      const ipfsResult = await uploadToIPFS(resumeFile);
      const ipfsCid = ipfsResult.cid;
      updateStep(0, STATUS.DONE, `CID: ${ipfsCid.slice(0, 16)}...`);

      // Step 2: Encrypt salary
      let handle, inputProof;
      try {
        ({ handle, inputProof } = await encryptUint64(minExpectation, account));
      } catch (encErr) {
        failTransaction(`FHE encryption failed: ${encErr.message}`);
        return;
      }
      updateStep(1, STATUS.DONE, 'Ciphertext generated with ZK proof');

      // Step 3: Submit to Sepolia
      await applyToJob(Number(jobId), formData.candidateName, ipfsCid, handle, inputProof);
      updateStep(2, STATUS.DONE, 'Application confirmed on-chain');

      // Navigate after a short delay so user can see success
      setTimeout(() => navigate('/dashboard/candidate'), 2000);
    } catch (err) {
      console.error(err);
      failTransaction(err.message || 'Transaction failed.');
    } finally {
      setIsTxPending(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin shadow-glow"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-6">
        <FadeIn>
          {job && (
            <div className="card mb-8">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 shrink-0 rounded-lg bg-chassis border border-white/40 shadow-floating flex items-center justify-center font-sans font-bold text-2xl text-ink">
                  {job.company?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1">
                  <h2 className="font-sans font-bold text-xl text-ink leading-tight mb-1">{job.title}</h2>
                  <div className="flex flex-wrap gap-2 text-ink-muted mt-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-muted/40 px-2 py-0.5 rounded border border-white/20 shadow-recessed flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-ink-muted" /> {job.company}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-muted/40 px-2 py-0.5 rounded border border-white/20 shadow-recessed flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-ink-muted" /> {job.location}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-muted/40 px-2 py-0.5 rounded border border-white/20 shadow-recessed flex items-center gap-1.5">
                      {job.jobType}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-[10px] font-mono text-ink uppercase tracking-widest flex items-center gap-1 bg-accent px-2 py-1 border border-ink/10 rounded shadow-floating">
                    <Lock className="w-3 h-3" /> Budget Encrypted
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
            <span className="led led-green" />
            <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">Candidate Module</span>
          </div>
          
          <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-4 drop-shadow-[0_1px_1px_#ffffff]">
            Initialize Application<br/>
            <span className="inline-block mt-2 px-3 py-1 bg-accent text-ink rounded shadow-floating border border-ink/10">Zero Knowledge Required</span>
          </h1>
          <p className="text-ink-muted text-lg mb-8">
            Your minimum salary expectation is encrypted locally via Zama FHE. Neither party learns the other's number unless a match evaluates to true.
          </p>

          <form id="apply-job-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="card">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              
              <h3 className="font-sans font-bold text-xl text-ink mb-6 border-b border-ink/10 pb-4">Identity Credentials</h3>

              <div className="flex flex-col gap-5">
                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="candidateName">
                    <User className="w-3.5 h-3.5" /> Identity Matrix (Name)
                  </label>
                  <input
                    id="candidateName"
                    name="candidateName"
                    className="form-input"
                    placeholder="Enter designation"
                    value={formData.candidateName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="resume">
                    <FileText className="w-3.5 h-3.5" /> Payload (Resume PDF/DOC)
                  </label>
                  <input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="form-input py-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-mono file:font-bold file:bg-chassis file:text-ink-muted file:shadow-floating hover:file:bg-muted/40 cursor-pointer"
                    onChange={e => setResumeFile(e.target.files[0])}
                  />
                  {resumeFile && (
                    <div className="text-[10px] font-mono font-bold text-green-600 mt-2 uppercase tracking-widest flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-glow-green shrink-0 mt-1" /> 
                      <span className="break-all">Payload Staged:<br/>{resumeFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <EncryptionZone
              label="Minimum Acceptable Parameter"
              value={minExpectation}
              onChange={setMinExpectation}
              min={30000}
              max={500000}
              step={5000}
            />

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex gap-3 shadow-recessed">
              <Lock className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-xs font-mono text-ink-muted leading-relaxed">
                <strong className="text-green-600 uppercase tracking-widest">Protocol Rules:</strong><br/>
                Only your identity matrix and payload link are revealed upon a successful match. Your scalar expectation is never decrypted, even in the event of a negative evaluation.
              </p>
            </div>

            <div className="mt-2 flex gap-4">
              <Link to="/jobs" className="btn btn-secondary py-4 px-6 shrink-0 shadow-floating">
                Abort
              </Link>
              {!isConnected ? (
                <button id="connect-to-apply-btn" type="button" className="btn btn-primary w-full py-4 text-base shadow-floating" onClick={openConnectModal}>
                  Connect Terminal
                </button>
              ) : (
                <button
                  id="submit-apply-btn"
                  type="submit"
                  className="btn btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-floating"
                  disabled={isTxPending || !fhevmReady}
                >
                  {isTxPending ? 'Processing...' : 'Encrypt & Transmit Request'}
                </button>
              )}
            </div>
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
