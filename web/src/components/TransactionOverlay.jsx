import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Circle, X, ExternalLink } from 'lucide-react';

// ── Step statuses ──────────────────────────────────────────────────────────────
const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  ERROR: 'error',
};

// ── Context ────────────────────────────────────────────────────────────────────
const TransactionContext = createContext(null);

export function useTransaction() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransaction must be used inside TransactionProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function TransactionProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const stepsRef = useRef([]);

  const startTransaction = useCallback((txTitle, stepLabels) => {
    const initial = stepLabels.map((label, i) => ({
      label,
      status: i === 0 ? STATUS.ACTIVE : STATUS.PENDING,
      detail: null,
    }));
    stepsRef.current = initial;
    setTitle(txTitle);
    setSteps(initial);
    setError(null);
    setTxHash(null);
    setVisible(true);
  }, []);

  const updateStep = useCallback((index, status, detail = null, stepTxHash = null) => {
    stepsRef.current = stepsRef.current.map((step, i) => {
      if (i === index) return { ...step, status, detail, txHash: stepTxHash || step.txHash };
      // When a step completes, activate the next pending one
      if (i === index + 1 && status === STATUS.DONE && step.status === STATUS.PENDING) {
        return { ...step, status: STATUS.ACTIVE };
      }
      return step;
    });
    setSteps([...stepsRef.current]);
  }, []);

  const failTransaction = useCallback((errMsg) => {
    // Mark the currently active step as errored
    stepsRef.current = stepsRef.current.map(step =>
      step.status === STATUS.ACTIVE ? { ...step, status: STATUS.ERROR, detail: errMsg } : step
    );
    setSteps([...stepsRef.current]);
    setError(errMsg);
  }, []);

  const setTransactionHash = useCallback((hash) => {
    setTxHash(hash);
  }, []);

  const closeOverlay = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <TransactionContext.Provider value={{
      startTransaction,
      updateStep,
      failTransaction,
      setTransactionHash,
      closeOverlay,
      STATUS,
    }}>
      {children}
      <AnimatePresence>
        {visible && (
          <Overlay
            title={title}
            steps={steps}
            error={error}
            txHash={txHash}
            onClose={closeOverlay}
          />
        )}
      </AnimatePresence>
    </TransactionContext.Provider>
  );
}

// ── Step icon ──────────────────────────────────────────────────────────────────
function StepIcon({ status }) {
  switch (status) {
    case STATUS.DONE:
      return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
    case STATUS.ERROR:
      return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
    case STATUS.ACTIVE:
      return <Loader2 className="w-5 h-5 text-accent shrink-0 animate-spin" />;
    default:
      return <Circle className="w-5 h-5 text-ink-muted/30 shrink-0" />;
  }
}

// ── Overlay component ──────────────────────────────────────────────────────────
function Overlay({ title, steps, error, txHash, onClose }) {
  const allDone = steps.every(s => s.status === STATUS.DONE);
  const hasError = steps.some(s => s.status === STATUS.ERROR);
  const completedCount = steps.filter(s => s.status === STATUS.DONE).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        className="relative w-full max-w-md bg-chassis border border-white/20 rounded-2xl shadow-floating overflow-hidden"
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screws */}
        <div className="hidden md:block absolute top-4 left-4 card-screw" />
        <div className="hidden md:block absolute top-4 right-4 card-screw" />

        {/* Progress bar */}
        <div className="h-1 bg-ink/10">
          <motion.div
            className={`h-full ${hasError ? 'bg-red-500' : allDone ? 'bg-green-500' : 'bg-accent'}`}
            initial={{ width: 0 }}
            animate={{ width: `${allDone ? 100 : progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h3 className="font-sans font-bold text-lg text-ink leading-tight">{title}</h3>
            <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mt-1">
              {hasError ? 'Transaction Failed' : allDone ? 'Transaction Complete' : `Step ${completedCount + 1} of ${steps.length}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 pb-4">
          <div className="flex flex-col gap-1">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  step.status === STATUS.ACTIVE ? 'bg-accent/10 border border-accent/20' :
                  step.status === STATUS.DONE ? 'bg-green-500/5' :
                  step.status === STATUS.ERROR ? 'bg-red-500/5 border border-red-500/20' :
                  'opacity-40'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <StepIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-xs leading-relaxed ${
                    step.status === STATUS.ACTIVE ? 'text-ink font-bold' :
                    step.status === STATUS.DONE ? 'text-green-600 font-bold' :
                    step.status === STATUS.ERROR ? 'text-red-500 font-bold' :
                    'text-ink-muted'
                  }`}>
                    {step.label}
                  </p>
                  {step.detail && (
                    <p className={`font-mono text-[10px] mt-1 leading-relaxed break-all ${
                      step.status === STATUS.ERROR ? 'text-red-400' : 'text-ink-muted'
                    }`}>
                      {step.detail}
                    </p>
                  )}
                  {step.txHash && step.status === STATUS.DONE && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded text-[9px] font-mono font-bold text-ink-muted uppercase tracking-widest transition-colors w-fit"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)} · view
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tx Hash */}
        {txHash && (
          <div className="px-6 pb-4">
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full shadow-glow-green shrink-0" />
              <span className="font-mono text-[10px] text-ink uppercase tracking-widest">View on Etherscan</span>
              <span className="font-mono text-[10px] text-ink-muted ml-auto">{txHash.slice(0, 10)}...{txHash.slice(-6)}</span>
            </a>
          </div>
        )}

        {/* Footer status */}
        <div className={`px-6 py-4 border-t ${
          hasError ? 'border-red-500/20 bg-red-500/5' :
          allDone ? 'border-green-500/20 bg-green-500/5' :
          'border-ink/10 bg-muted/10'
        }`}>
          <div className="flex items-center gap-3">
            {hasError ? (
              <>
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-mono text-xs text-red-500 font-bold uppercase tracking-widest">
                  Failed — click outside or ✕ to close
                </span>
              </>
            ) : allDone ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="font-mono text-xs text-green-600 font-bold uppercase tracking-widest">
                  All steps completed successfully
                </span>
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 text-accent shrink-0 animate-spin" />
                <span className="font-mono text-xs text-ink-muted font-bold uppercase tracking-widest">
                  Processing on-chain transaction...
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
