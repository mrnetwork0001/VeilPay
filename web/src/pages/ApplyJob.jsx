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
import { Lock, MapPin, Briefcase, FileText, User, Award, Wifi, Coins } from 'lucide-react';
import { ethers } from 'ethers';

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, getJobPosting, applyToJob } = useContract();
  const { openConnectModal } = useWalletConnect();
  const { isReady: fhevmReady, fheLoaded, encryptApplicationInputs } = useFhevm();
  const { startTransaction, updateStep, failTransaction, STATUS } = useTransaction();

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [minExpectation, setMinExpectation] = useState(100000);
  const [yearsExperience, setYearsExperience] = useState(3);
  const [remotePreference, setRemotePreference] = useState(true);
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
      'Encrypting salary, experience & remote via ZamaFHE',
      'Submitting application to Sepolia',
    ]);

    try {
      // Step 1: Upload resume to IPFS
      const ipfsResult = await uploadToIPFS(resumeFile);
      const ipfsCid = ipfsResult.cid;
      updateStep(0, STATUS.DONE, `CID: ${ipfsCid.slice(0, 16)}...`);

      // Step 2: Encrypt all three values in ONE call (shared inputProof)
      // Critical - the contract verifies all 3 handles against the same proof
      let salaryHandle, expHandle, remoteHandle, inputProof;
      try {
        const encResult = await encryptApplicationInputs(minExpectation, yearsExperience, remotePreference, account);
        salaryHandle = encResult.salaryHandle;
        expHandle = encResult.expHandle;
        remoteHandle = encResult.remoteHandle;
        inputProof = encResult.inputProof;
      } catch (encErr) {
        failTransaction(`FHE encryption failed: ${encErr.message}`);
        return;
      }
      updateStep(1, STATUS.DONE, 'Salary + Experience + Remote encrypted');

      // Step 3: Submit to Sepolia
      const applyReceipt = await applyToJob(Number(jobId), formData.candidateName, ipfsCid, salaryHandle, expHandle, remoteHandle, inputProof);
      updateStep(2, STATUS.DONE, 'Application confirmed onchain', applyReceipt?.hash || null);

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

  const bountyDisplay = job?.bountyPerUnlock ? `${Number(job.bountyPerUnlock) / 1e6} cUSDC` : null;

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
                    {bountyDisplay && (
                      <span className="text-[10px] font-mono uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 shadow-recessed flex items-center gap-1.5 text-green-700">
                        <Coins className="w-3 h-3" /> {bountyDisplay} per unlock
                      </span>
                    )}
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
            <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">For Candidates</span>
          </div>
          
          <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-4 drop-shadow-[0_1px_1px_#ffffff]">
            Apply to Job<br/>
            <span className="inline-block mt-2 px-3 py-1 bg-accent text-ink rounded shadow-floating border border-ink/10">Your Salary Stays Private</span>
          </h1>
          <p className="text-ink-muted text-lg mb-8">
            Your salary, experience, and remote preference are all encrypted via Zama FHE. Neither party learns the other's values unless there's a match.
          </p>

          <form id="apply-job-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="card">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              
              <h3 className="font-sans font-bold text-xl text-ink mb-6 border-b border-ink/10 pb-4">Your Details</h3>

              <div className="flex flex-col gap-5">
                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="candidateName">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <input
                    id="candidateName"
                    name="candidateName"
                    className="form-input"
                    placeholder="Enter your full name"
                    value={formData.candidateName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="resume">
                    <FileText className="w-3.5 h-3.5" /> Resume (PDF/DOC)
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
                      <span className="break-all">File selected:<br/>{resumeFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Encrypted Requirements Card */}
            <div className="card">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              <h3 className="font-sans font-bold text-xl text-ink mb-6 border-b border-ink/10 pb-4 flex items-center gap-2">
                <Award className="w-5 h-5" /> Encrypted Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="form-label" htmlFor="yearsExperience">Years of Experience</label>
                  <input
                    id="yearsExperience"
                    type="number"
                    min="0"
                    max="30"
                    className="form-input"
                    value={yearsExperience}
                    onChange={e => setYearsExperience(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">Encrypted via FHE</span>
                </div>
                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="remotePreference">
                    <Wifi className="w-3.5 h-3.5" /> Open to Remote?
                  </label>
                  <button
                    id="remotePreference"
                    type="button"
                    className={`form-input text-left font-bold uppercase tracking-widest cursor-pointer transition-all ${remotePreference ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-red-500/10 text-red-700 border-red-500/30'}`}
                    onClick={() => setRemotePreference(p => !p)}
                  >
                    {remotePreference ? '✅ Yes - Open to Remote' : '❌ No - On-site Only'}
                  </button>
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">Encrypted via FHE</span>
                </div>
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

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex gap-3 shadow-recessed">
              <Lock className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-xs font-mono text-ink-muted leading-relaxed">
                <strong className="text-green-600 uppercase tracking-widest">How It Works:</strong><br/>
                Your salary, experience, and remote preference are matched against the employer's requirements using FHE. A weighted score (0-100) determines the match quality - all without revealing any values.
              </p>
            </div>

            <div className="mt-2 flex gap-4">
              <Link to="/jobs" className="btn btn-secondary py-4 px-6 shrink-0 shadow-floating">
                Cancel
              </Link>
              {!isConnected ? (
                <button id="connect-to-apply-btn" type="button" className="btn btn-primary w-full py-4 text-base shadow-floating" onClick={openConnectModal}>
                  Connect Wallet
                </button>
              ) : (
                <button
                  id="submit-apply-btn"
                  type="submit"
                  className="btn btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-floating"
                  disabled={isTxPending || !fhevmReady}
                >
                  {isTxPending ? 'Processing...' : 'Submit Application'}
                </button>
              )}
            </div>
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
