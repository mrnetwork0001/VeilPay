import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletConnect } from '../components/ConnectWalletButton';
import toast from 'react-hot-toast';
import { FadeIn } from '../components/Animations';
import EncryptionZone from '../components/EncryptionZone';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';
import { useTransaction } from '../components/TransactionOverlay';
import { uploadImageToIPFS } from '../utils/ipfs';
import { Building2, MapPin, Briefcase, FileText, Coins, Award, Wifi, Image } from 'lucide-react';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];
const CUSDC_DECIMALS = 6;

export default function PostJob() {
  const navigate = useNavigate();
  const { account, isConnected, createJobPosting, approveBountyToken, claimFaucet, getBountyBalance } = useContract();
  const { openConnectModal } = useWalletConnect();
  const { isReady: fhevmReady, fheLoaded, encryptJobPostingInputs } = useFhevm();
  const { startTransaction, updateStep, failTransaction, STATUS } = useTransaction();

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    jobType: 'Full-time',
    description: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [maxBudget, setMaxBudget] = useState(120000);
  const [requiredExperience, setRequiredExperience] = useState(3);
  const [remoteOk, setRemoteOk] = useState(true);
  const [bountyPerUnlock, setBountyPerUnlock] = useState('10');
  const [totalDeposit, setTotalDeposit] = useState('50');
  const [isTxPending, setIsTxPending] = useState(false);
  const [cusdcBalance, setCusdcBalance] = useState(null);
  const [claimingFaucet, setClaimingFaucet] = useState(false);

  const toTokenUnits = (val) => BigInt(Math.round(parseFloat(val || '0') * 10 ** CUSDC_DECIMALS));

  // Balance validation
  const depositAmount = parseFloat(totalDeposit || '0');
  const insufficientBalance = cusdcBalance !== null && depositAmount > cusdcBalance;

  // Fetch cUSDC balance when connected
  const refreshBalance = async () => {
    if (!account) return;
    try {
      const bal = await getBountyBalance(account);
      setCusdcBalance(Number(bal) / 10 ** CUSDC_DECIMALS);
    } catch (e) {
      console.warn('Failed to fetch cUSDC balance:', e);
    }
  };

  useEffect(() => {
    if (isConnected && account) refreshBalance();
  }, [isConnected, account]);

  const handleClaimFaucet = async () => {
    setClaimingFaucet(true);
    try {
      await claimFaucet();
      toast.success('Claimed 1,000 cUSDC!', { icon: '🪙' });
      await refreshBalance();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('cooldown')) {
        toast.error('Faucet cooldown active. Try again in 1 hour.');
      } else {
        toast.error('Faucet claim failed: ' + msg.slice(0, 80));
      }
    } finally {
      setClaimingFaucet(false);
    }
  };

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

    const { title, company, location, jobType, description } = formData;
    if (!title || !company || !location) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const depositUnits = toTokenUnits(totalDeposit);
    const bountyUnits = toTokenUnits(bountyPerUnlock);

    if (depositUnits <= 0n) {
      toast.error('Total deposit must be greater than 0.');
      return;
    }
    if (bountyUnits <= 0n || bountyUnits > depositUnits) {
      toast.error('Per-unlock bounty must be > 0 and ≤ total deposit.');
      return;
    }

    setIsTxPending(true);

    // Show the modal IMMEDIATELY so the user sees progress during FHE encryption
    startTransaction('Deploying Job Module', [
      'Uploading company logo to IPFS',
      'Encrypting budget, experience & remote via ZamaFHE',
      'Approving cUSDC for bounty deposit',
      'Deploying job module to Sepolia',
    ]);

    try {
      // Step 1: Upload logo to IPFS (if provided) - uses image-aware uploader
      let logoUrl = '';
      if (logoFile) {
        try {
          const logoResult = await uploadImageToIPFS(logoFile);
          logoUrl = `https://gateway.pinata.cloud/ipfs/${logoResult.cid}`;
        } catch (logoErr) {
          console.warn('Logo upload failed, continuing without logo:', logoErr);
        }
      }
      updateStep(0, STATUS.DONE, logoUrl ? 'Logo uploaded to IPFS' : 'No logo (using initials)');

      // Step 2: Encrypt all three values in ONE call (shared inputProof)
      // This is critical - the contract verifies all 3 handles against the same proof
      let budgetHandle, expHandle, remoteHandle, inputProof;
      try {
        const encResult = await encryptJobPostingInputs(maxBudget, requiredExperience, remoteOk, account);
        budgetHandle = encResult.budgetHandle;
        expHandle = encResult.expHandle;
        remoteHandle = encResult.remoteHandle;
        inputProof = encResult.inputProof;
      } catch (encErr) {
        failTransaction(`FHE encryption failed: ${encErr.message}`);
        return;
      }
      updateStep(1, STATUS.DONE, 'Budget + Experience + Remote encrypted');

      // Step 3: Approve cUSDC spending
      let approveReceipt;
      try {
        approveReceipt = await approveBountyToken(depositUnits);
      } catch (approveErr) {
        failTransaction(`cUSDC approval failed: ${approveErr.message}`);
        return;
      }
      updateStep(2, STATUS.DONE, `${totalDeposit} cUSDC approved`, approveReceipt?.hash || null);

      // Step 4: Deploy to Sepolia with cUSDC deposit
      const deployReceipt = await createJobPosting(
        title, company, location, jobType, description, logoUrl,
        budgetHandle, expHandle, remoteHandle, inputProof,
        bountyUnits, depositUnits
      );
      updateStep(3, STATUS.DONE, `Job deployed with ${totalDeposit} cUSDC bounty pool`, deployReceipt?.hash || null);

      setTimeout(() => navigate('/dashboard/employer'), 2000);
    } catch (err) {
      console.error(err);
      failTransaction(err.message || 'Transaction failed.');
    } finally {
      setIsTxPending(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-6">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
            <span className="led led-green" />
            <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">For Employers</span>
          </div>
          
          <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-4 drop-shadow-[0_1px_1px_#ffffff]">
            Post a Job<br/>
            <span className="inline-block mt-2 px-3 py-1 bg-accent text-ink rounded shadow-floating border border-ink/10">Salary Stays Encrypted</span>
          </h1>
          <p className="text-ink-muted text-lg mb-8">
            Your budget, experience requirements, and remote preference are all encrypted using Zama FHE before they ever reach the blockchain.
          </p>

          <form id="post-job-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* ── Position Details Card ── */}
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

                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="description">
                    <FileText className="w-3.5 h-3.5" /> Brief Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-input resize-none"
                    rows="2"
                    maxLength={200}
                    placeholder="Describe the role in 1-2 sentences..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">
                    {formData.description.length}/200
                  </span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="form-label" htmlFor="jobType">Job Type</label>
                    <select
                      id="jobType"
                      name="jobType"
                      className="form-input cursor-pointer appearance-none"
                      value={formData.jobType}
                      onChange={handleChange}
                    >
                      {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-2" htmlFor="logoFile">
                      <Image className="w-3.5 h-3.5" /> Company Logo
                    </label>
                    <input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      className="form-input py-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-mono file:font-bold file:bg-chassis file:text-ink-muted file:shadow-floating hover:file:bg-muted/40 cursor-pointer"
                      onChange={e => {
                        const file = e.target.files[0];
                        setLogoFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setLogoPreview(ev.target.result);
                          reader.readAsDataURL(file);
                        } else {
                          setLogoPreview(null);
                        }
                      }}
                    />
                    {logoPreview && (
                      <div className="mt-2 flex items-center gap-3">
                        <img src={logoPreview} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover border border-white/40 shadow-floating" />
                        <span className="text-[10px] font-mono font-bold text-green-600 uppercase tracking-widest">Preview</span>
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">Optional • Uploaded to IPFS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Encrypted Requirements Card ── */}
            <div className="card">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              <h3 className="font-sans font-bold text-xl text-ink mb-6 border-b border-ink/10 pb-4 flex items-center gap-2">
                <Award className="w-5 h-5" /> Encrypted Requirements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="form-label" htmlFor="requiredExperience">Min. Years Experience</label>
                  <input
                    id="requiredExperience"
                    type="number"
                    min="0"
                    max="30"
                    className="form-input"
                    value={requiredExperience}
                    onChange={e => setRequiredExperience(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">Encrypted via FHE</span>
                </div>
                <div className="form-group">
                  <label className="form-label flex items-center gap-2" htmlFor="remoteOk">
                    <Wifi className="w-3.5 h-3.5" /> Remote Work OK?
                  </label>
                  <button
                    id="remoteOk"
                    type="button"
                    className={`form-input text-left font-bold uppercase tracking-widest cursor-pointer transition-all ${remoteOk ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-red-500/10 text-red-700 border-red-500/30'}`}
                    onClick={() => setRemoteOk(p => !p)}
                  >
                    {remoteOk ? '✅ Yes - Remote OK' : '❌ No - On-site Only'}
                  </button>
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">Encrypted via FHE</span>
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

            {/* ── Interview Bounty Card ── */}
            <div className="card">
              <div className="absolute top-4 left-4 card-screw" />
              <div className="absolute top-4 right-4 card-screw" />
              <h3 className="font-sans font-bold text-xl text-ink mb-4 border-b border-ink/10 pb-4 flex items-center gap-2">
                <Coins className="w-5 h-5" /> Interview Bounty
              </h3>
              <p className="text-xs font-mono text-ink-muted mb-5 leading-relaxed">
                Deposit cUSDC to reward candidates whose resumes you unlock. Unused funds are refunded when you close the job.
              </p>

              {/* cUSDC Balance + Faucet */}
              {isConnected && (
                <div className="mb-5 bg-muted/30 rounded-lg border border-white/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest block mb-1">Your cUSDC Balance</span>
                    <span className="font-sans font-bold text-2xl text-ink">
                      {cusdcBalance !== null ? cusdcBalance.toLocaleString() : '-'}
                      <span className="text-sm font-mono text-ink-muted ml-1">cUSDC</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    id="claim-faucet-btn"
                    className="btn btn-secondary text-xs h-10 px-5 shrink-0 shadow-floating"
                    onClick={handleClaimFaucet}
                    disabled={claimingFaucet}
                  >
                    {claimingFaucet ? 'Claiming...' : '🪙 Claim 1,000 cUSDC'}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="form-label" htmlFor="totalDeposit">Total Deposit (cUSDC)</label>
                  <input
                    id="totalDeposit"
                    type="number"
                    step="1"
                    min="1"
                    className="form-input"
                    value={totalDeposit}
                    onChange={e => setTotalDeposit(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="bountyPerUnlock">Per-Unlock Bounty (cUSDC)</label>
                  <input
                    id="bountyPerUnlock"
                    type="number"
                    step="1"
                    min="1"
                    className="form-input"
                    value={bountyPerUnlock}
                    onChange={e => setBountyPerUnlock(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 bg-accent/20 p-3 rounded-lg border border-accent/30">
                <span className="text-xs font-mono font-bold text-ink uppercase tracking-widest">
                  Max resumes you can unlock: {totalDeposit && bountyPerUnlock && parseFloat(bountyPerUnlock) > 0
                    ? Math.floor(parseFloat(totalDeposit) / parseFloat(bountyPerUnlock))
                    : '-'}
                </span>
              </div>
            </div>

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
                  className={`btn w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed ${
                    insufficientBalance ? 'btn-secondary border-red-500/30 text-red-600' : 'btn-primary'
                  }`}
                  disabled={isTxPending || !fhevmReady || insufficientBalance}
                >
                  {isTxPending
                    ? 'Processing...'
                    : insufficientBalance
                    ? `Insufficient cUSDC (need ${totalDeposit}, have ${cusdcBalance?.toLocaleString()})`
                    : `Post Job Securely (Deposit ${totalDeposit} cUSDC)`}
                </button>
              )}
            </div>

            {isConnected && account && (
              <p className="text-center text-xs font-mono text-ink-muted uppercase tracking-widest mt-2">
                Connected: {account.slice(0, 8)}...{account.slice(-6)} · Sepolia
              </p>
            )}
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
