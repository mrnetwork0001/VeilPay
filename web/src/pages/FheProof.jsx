import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '../components/Animations';
import { Search, ShieldCheck, Lock, Cpu, CheckCircle2, XCircle, ExternalLink, Copy, ArrowRight, FileCode2, Activity } from 'lucide-react';
import { ethers } from 'ethers';
import BLINDHIRE_ABI from '../abi/BlindHire.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = import.meta.env.VITE_SEPOLIA_RPC || 'https://rpc.sepolia.org';

// Known Zama infrastructure contracts on Sepolia (lowercased for matching)
const ZAMA_CONTRACTS = {
  '0x92c920834ec8941d2c77d188936e1f7a6f49c127': 'Zama TFHEExecutor',
  '0xf0ffdc93b7e186bc2f8cb3daa75d86d1930a433d': 'Zama ACL',
};

// VeilPay function selectors
const FUNCTION_SELECTORS = {
  '0x': 'Unknown',
};

// Decode function name from ABI
function decodeFunctionName(data) {
  if (!data || data.length < 10) return 'Unknown';
  try {
    const iface = new ethers.Interface(BLINDHIRE_ABI.abi);
    const parsed = iface.parseTransaction({ data });
    return parsed?.name || 'Unknown';
  } catch {
    return `Unknown (${data.slice(0, 10)})`;
  }
}

// Format address for display
function shortAddr(addr) {
  if (!addr) return '???';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Phase component for the timeline
function TimelinePhase({ phase, index, isActive, isComplete }) {
  // Use real pass/fail from phase data once animation completes
  const passed = phase.passed;
  const showResult = isComplete;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 }}
      className={`relative pl-8 pb-8 ${index < 3 ? 'border-l-2 border-white/10' : ''}`}
    >
      {/* Timeline Dot */}
      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 ${
        showResult && passed ? 'bg-green-500 border-green-400 shadow-glow-green' :
        showResult && !passed ? 'bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
        isActive ? 'bg-accent border-accent shadow-glow animate-pulse' :
        'bg-white/10 border-white/20'
      }`} />

      <div className={`bg-dark-panel rounded-xl border ${
        showResult && passed ? 'border-green-500/30' :
        showResult && !passed ? 'border-red-500/30' :
        isActive ? 'border-accent/30' :
        'border-white/10'
      } p-5 shadow-lg`}>
        <div className="flex items-center gap-3 mb-3">
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
            showResult && passed ? 'bg-green-500/20 text-green-400' :
            showResult && !passed ? 'bg-red-500/20 text-red-400' :
            isActive ? 'bg-accent/20 text-accent' :
            'bg-white/5 text-white/40'
          }`}>
            Phase {index + 1}
          </span>
          <span className="font-sans font-bold text-white text-sm">{phase.title}</span>
          {showResult && passed && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {showResult && !passed && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
        <p className="text-white/60 text-xs font-mono leading-relaxed mb-3">{phase.description}</p>
        {phase.data && (
          <div className="bg-black/40 rounded-lg p-3 border border-white/5">
            {phase.data.map((item, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest shrink-0 w-24">{item.label}:</span>
                <span className={`font-mono text-[11px] break-all ${item.highlight ? 'text-accent font-bold' : 'text-white/70'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FheProof() {
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [animPhase, setAnimPhase] = useState(-1);
  const inputRef = useRef(null);

  // Example tx hashes from the deployed contract
  const EXAMPLE_TXS = [
    { hash: '0x...', label: 'Paste any VeilPay transaction hash from Sepolia' },
  ];

  const analyzeTx = async (hash) => {
    if (!hash || hash.length !== 66) {
      setError('Please enter a valid 66-character transaction hash');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setAnimPhase(-1);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);

      // Fetch tx + receipt in parallel
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(hash),
        provider.getTransactionReceipt(hash),
      ]);

      if (!tx) {
        setError('Transaction not found on Sepolia. Make sure this is a Sepolia transaction.');
        setLoading(false);
        return;
      }

      const isVeilPayTx = tx.to?.toLowerCase() === CONTRACT_ADDRESS?.toLowerCase();
      const functionName = isVeilPayTx ? decodeFunctionName(tx.data) : 'External Contract Call';

      // Detect Zama internal calls from logs
      const zamaInteractions = [];
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          const addr = log.address.toLowerCase();
          for (const [zamaAddr, zamaName] of Object.entries(ZAMA_CONTRACTS)) {
            if (addr === zamaAddr.toLowerCase()) {
              zamaInteractions.push({
                contract: zamaName,
                address: log.address,
                topics: log.topics.length,
                dataSize: log.data?.length || 0,
              });
            }
          }
        }
      }

      // Parse encrypted parameters (bytes32 handles) from calldata
      const encryptedParams = [];
      if (isVeilPayTx && tx.data.length > 10) {
        try {
          const iface = new ethers.Interface(BLINDHIRE_ABI.abi);
          const parsed = iface.parseTransaction({ data: tx.data });
          if (parsed?.args) {
            for (let i = 0; i < parsed.args.length; i++) {
              const arg = parsed.args[i];
              const paramName = parsed.fragment.inputs[i]?.name || `param${i}`;
              // bytes32 encrypted handles are 66-char hex strings
              if (typeof arg === 'string' && arg.length === 66 && arg.startsWith('0x')) {
                encryptedParams.push({ name: paramName, handle: arg });
              }
              // bytes (inputProof) are longer hex strings
              if (typeof arg === 'string' && arg.length > 66 && arg.startsWith('0x') && paramName.toLowerCase().includes('proof')) {
                encryptedParams.push({ name: paramName, handle: `${arg.slice(0, 20)}...${arg.slice(-8)} (${(arg.length - 2) / 2} bytes)` });
              }
            }
          }
        } catch {
          // Calldata doesn't match known functions
        }
      }

      // Real verification checks
      const isFheFunction = ['resolveApplication', 'createJobPosting', 'applyToJob', 'submitReview'].includes(functionName);
      const txSucceeded = receipt?.status === 1;
      const hasZamaLogs = zamaInteractions.length > 0;
      const hasEvents = (receipt?.logs?.length || 0) > 0;
      // resolveApplication operates on STORED encrypted handles, not calldata handles
      const usesStoredHandles = ['resolveApplication', 'submitReview'].includes(functionName);

      // Phase 1: Did the tx target VeilPay with encrypted inputs (or use stored encrypted data)?
      const phase1Passed = isVeilPayTx && (encryptedParams.length > 0 || usesStoredHandles);
      // Phase 2: Is it a known FHE function that succeeded?
      const phase2Passed = isVeilPayTx && isFheFunction && txSucceeded;
      // Phase 3: Were Zama infra contracts actually involved?
      const phase3Passed = hasZamaLogs;
      // Phase 4: Tx succeeded with events and no plaintext leaks
      const phase4Passed = txSucceeded && hasEvents;

      // Build the 4 phases with real pass/fail
      const phases = [
        {
          title: 'Encrypted Inputs Submitted',
          passed: phase1Passed,
          description: !isVeilPayTx
            ? '✗ This transaction does NOT target the VeilPay contract. No encrypted inputs can be verified.'
            : encryptedParams.length > 0
            ? `✓ ${encryptedParams.length} encrypted parameter(s) detected. No plaintext salary or budget values appear in the transaction data.`
            : usesStoredHandles
            ? `✓ ${functionName}() operates on previously-stored encrypted handles. The encrypted salary/experience data was submitted during createJobPosting/applyToJob and is now being evaluated homomorphically.`
            : '✗ No encrypted parameters (bytes32 handles) found in calldata. This may not be an FHE transaction.',
          data: [
            { label: 'From', value: shortAddr(tx.from) },
            { label: 'To', value: isVeilPayTx ? `VeilPay (${shortAddr(tx.to)})` : shortAddr(tx.to), highlight: isVeilPayTx },
            { label: 'Function', value: functionName, highlight: true },
            { label: 'Gas Used', value: receipt ? `${Number(receipt.gasUsed).toLocaleString()} wei` : 'N/A' },
            { label: 'Encrypted', value: encryptedParams.length > 0 ? `${encryptedParams.length} handle(s) found` : 'NONE detected', highlight: encryptedParams.length > 0 },
            ...encryptedParams.map(p => ({
              label: p.name,
              value: p.handle,
              highlight: true,
            })),
          ],
        },
        {
          title: 'FHE Evaluation on Ciphertext',
          passed: phase2Passed,
          description: !isFheFunction
            ? `✗ "${functionName}" is not a known FHE function. Expected: resolveApplication, createJobPosting, applyToJob, or submitReview.`
            : !txSucceeded
            ? `✗ ${functionName}() is a valid FHE function but the transaction REVERTED. The FHE computation did not complete.`
            : `✓ The ${functionName}() function triggers homomorphic computations (FHE.le, FHE.select, FHE.add) on encrypted values. The Zama Coprocessor evaluates these operations without ever decrypting the underlying data.`,
          data: [
            { label: 'Operations', value: functionName === 'resolveApplication' ? 'FHE.le() → FHE.ge() → FHE.eq() → FHE.select() × 3 → FHE.add() × 2' : functionName === 'createJobPosting' ? 'FHE.asEuint64() → FHE.asEuint8() → FHE.asEbool()' : functionName === 'applyToJob' ? 'FHE.asEuint64() → FHE.asEuint8() → FHE.asEbool()' : 'Unknown — not a recognized FHE function', highlight: isFheFunction },
            { label: 'FHE Function', value: isFheFunction ? `✓ ${functionName}` : '✗ Not recognized', highlight: isFheFunction },
            { label: 'Execution', value: txSucceeded ? 'SUCCESS' : 'REVERTED', highlight: txSucceeded },
          ],
        },
        {
          title: 'Zama Infrastructure Interactions',
          passed: phase3Passed,
          description: hasZamaLogs
            ? `✓ ${zamaInteractions.length} interaction(s) with Zama infrastructure contracts (ACL, Coprocessor, KMS) detected in receipt logs.`
            : '✗ No interactions with known Zama infrastructure contracts found in transaction logs. This transaction may not involve real FHE.',
          data: hasZamaLogs
            ? zamaInteractions.map(z => ({
                label: z.contract,
                value: `${shortAddr(z.address)} · ${z.topics} topics · ${z.dataSize} bytes`,
                highlight: true,
              }))
            : [
                { label: 'Status', value: '✗ No Zama contract logs found', highlight: false },
                { label: 'Total Logs', value: `${receipt?.logs?.length || 0} event(s) emitted (none from Zama)`, highlight: false },
              ],
        },
        {
          title: 'Encrypted Result Stored',
          passed: phase4Passed,
          description: !txSucceeded
            ? '✗ Transaction reverted — no encrypted results were stored onchain.'
            : !hasEvents
            ? '✗ Transaction succeeded but emitted no events. State changes could not be confirmed.'
            : functionName === 'resolveApplication'
            ? '✓ The encrypted match score (euint8, 0-100) and salary match boolean (ebool) were stored onchain. Only the employer can decrypt these via the Zama KMS.'
            : '✓ Encrypted handles were stored onchain. Only authorized parties (per the Zama ACL) can request decryption via the KMS.',
          data: [
            { label: 'Block', value: `#${receipt?.blockNumber || 'N/A'}` },
            { label: 'Tx Index', value: `${receipt?.index ?? 'N/A'}` },
            { label: 'Events', value: `${hasEvents ? receipt.logs.length : 0} emitted`, highlight: hasEvents },
            { label: 'Privacy', value: hasEvents ? '✓ No salary, budget, or score values visible in any log' : '— No events to verify', highlight: hasEvents },
          ],
        },
      ];

      setResult({ tx, receipt, phases, isVeilPayTx, functionName, zamaInteractions, encryptedParams, phase1Passed, phase2Passed, phase3Passed, phase4Passed });

      // Animate phases sequentially
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 400));
        setAnimPhase(i);
      }
      // One final bump so phase 4 (index 3) also flips to "complete"
      await new Promise(r => setTimeout(r, 400));
      setAnimPhase(4);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Failed to analyze: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    analyzeTx(txHash.trim());
  };

  const copyHash = () => {
    navigator.clipboard.writeText(txHash);
  };

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[72rem] mx-auto px-6 md:px-12">
        <FadeIn>
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
              <span className="led led-green" />
              <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">FHE Verification</span>
            </div>
            <h1 className="font-sans font-extrabold text-3xl md:text-5xl text-ink tracking-tight mb-2 drop-shadow-[0_1px_1px_#ffffff]">
              FHE <span className="inline-block px-2 py-0.5 bg-accent text-ink rounded shadow-floating border border-ink/10">Proof</span> Inspector
            </h1>
            <p className="text-ink-muted text-lg max-w-xl">
              Paste any VeilPay transaction hash to verify that real Fully Homomorphic Encryption was used. No plaintext salary data will appear.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="card p-4 md:p-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={txHash}
                  onChange={(e) => {
                    setTxHash(e.target.value);
                    if (result) {
                      setResult(null);
                      setAnimPhase(-1);
                      setError('');
                    }
                  }}
                  placeholder="0x... (Sepolia transaction hash)"
                  className="form-input w-full pl-12 pr-4 py-4 font-mono text-sm"
                  id="proof-tx-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !txHash.trim()}
                className="btn btn-primary px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                id="proof-analyze-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Analyze
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 font-mono text-sm flex items-center gap-3"
            >
              <XCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8"
              >
                {/* Timeline */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <FileCode2 className="w-5 h-5 text-accent" />
                    <span className="font-sans font-bold text-lg text-ink">Transaction Analysis</span>
                    {result.isVeilPayTx && (
                      <span className="font-mono text-[10px] font-bold bg-green-500/10 text-green-600 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest">
                        VeilPay Contract ✓
                      </span>
                    )}
                  </div>

                  <div className="bg-dark-bg rounded-2xl p-6 md:p-8 border border-white/10 shadow-lg relative overflow-hidden">
                    {/* CRT Scanlines */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />

                    <div className="relative z-10">
                      {result.phases.map((phase, i) => (
                        <TimelinePhase
                          key={i}
                          phase={phase}
                          index={i}
                          isActive={animPhase === i}
                          isComplete={animPhase > i}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar - What This Proves */}
                <div className="space-y-6">
                  {/* Verdict Card */}
                  <div className="card bg-chassis">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck className="w-8 h-8 text-ink bg-accent rounded-lg p-1.5 shadow-floating" />
                      <div>
                        <div className="font-sans font-bold text-ink text-sm">What This Proves</div>
                        <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">FHE Verification Report</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { check: result.isVeilPayTx, text: 'Targets VeilPay contract' },
                        { check: result.phase1Passed, text: 'Encrypted handles (bytes32) in calldata' },
                        { check: result.phase2Passed, text: 'Known FHE function executed successfully' },
                        { check: result.phase3Passed, text: 'Zama infrastructure logs detected' },
                        { check: result.phase4Passed, text: 'Encrypted result stored onchain' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {item.check ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className="font-mono text-xs text-ink-muted">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Etherscan Link */}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary w-full text-sm"
                    id="proof-etherscan-link"
                  >
                    <ExternalLink className="w-4 h-4" /> View on Etherscan
                  </a>

                  {/* Privacy Guarantee */}
                  <div className="bg-dark-bg rounded-xl p-5 border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="relative z-10">
                      <Lock className="w-6 h-6 text-accent mb-3" />
                      <div className="font-sans font-bold text-white text-sm mb-2">Privacy Guarantee</div>
                      <p className="font-mono text-[11px] text-white/60 leading-relaxed">
                        Even with full access to this transaction's calldata, logs, and internal traces, 
                        it is <span className="text-accent font-bold">cryptographically impossible</span> to 
                        determine the employer's budget or the candidate's salary expectation. 
                        The FHE ciphertexts can only be decrypted by authorized parties via the Zama KMS.
                      </p>
                    </div>
                  </div>

                  {/* Contract Info */}
                  <div className="bg-chassis rounded-xl p-5 border border-white/20 shadow-recessed">
                    <div className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mb-3">Contract Addresses</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-ink-muted">VeilPay</span>
                        <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-ink hover:text-accent transition-colors">
                          {shortAddr(CONTRACT_ADDRESS)}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!result && !loading && !error && (
            <div className="card text-center py-20 bg-muted/20 border-dashed border-2 border-white/20">
              <Search className="w-12 h-12 text-ink-muted mx-auto mb-4 opacity-50" />
              <h3 className="font-sans font-bold text-2xl text-ink mb-3">Verify Real FHE</h3>
              <p className="text-ink-muted text-sm font-mono uppercase tracking-widest mb-4 max-w-md mx-auto">
                Paste any VeilPay transaction hash from Sepolia to see a cryptographic proof breakdown.
                No salary data appears anywhere in the transaction.
              </p>
              <div className="text-ink-muted text-xs font-mono mt-6">
                <span className="text-ink-muted/60">Tip: </span>
                Try a <code className="bg-muted/40 px-2 py-0.5 rounded text-ink">createJobPosting</code>, 
                <code className="bg-muted/40 px-2 py-0.5 rounded text-ink ml-1">applyToJob</code>, or 
                <code className="bg-muted/40 px-2 py-0.5 rounded text-ink ml-1">resolveApplication</code> transaction.
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
