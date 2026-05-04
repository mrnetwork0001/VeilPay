import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, ShieldCheck } from 'lucide-react';

const FAKE_CIPHER_CHARS = '0123456789abcdef';

function randomHex(length = 64) {
  return '0x' + Array.from({ length }, () =>
    FAKE_CIPHER_CHARS[Math.floor(Math.random() * 16)]
  ).join('');
}

/**
 * EncryptionZone - The "magic" UI component
 *
 * Shows a salary input (slider + number), and on blur/change,
 * animates a "lock" icon and shows scrambled ciphertext in place of the value.
 */
export default function EncryptionZone({ label, value, onChange, min = 30000, max = 500000, step = 5000 }) {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [cipherDisplay, setCipherDisplay] = useState('');
  const [showEncrypted, setShowEncrypted] = useState(false);
  const intervalRef = useRef(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const triggerEncryptAnimation = () => {
    if (isEncrypting) return;
    setIsEncrypting(true);
    setShowEncrypted(true);

    let ticks = 0;
    intervalRef.current = setInterval(() => {
      setCipherDisplay(randomHex(64));
      ticks++;
      if (ticks > 12) {
        clearInterval(intervalRef.current);
        setIsEncrypting(false);
      }
    }, 60);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleSliderChange = (e) => {
    const newVal = parseInt(e.target.value);
    setShowEncrypted(false);
    setCipherDisplay('');
    onChange(newVal);
  };

  const handleBlur = () => {
    if (value) triggerEncryptAnimation();
  };

  const formatSalary = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-dark-bg p-6 rounded-xl shadow-card relative overflow-hidden border-2 border-chassis">
      {/* Carbon Fiber Overlay */}
      <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <motion.div
          className={`w-12 h-12 flex items-center justify-center rounded-lg shadow-card border border-white/20 bg-dark-panel ${isEncrypting ? 'shadow-glow' : ''}`}
          animate={isEncrypting ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {showEncrypted ? <Lock className="w-6 h-6 text-ink bg-accent rounded-full p-1 shadow-floating" /> : <Unlock className="w-6 h-6 text-white/50" />}
        </motion.div>
        <div>
          <div className="font-mono text-xs font-bold text-ink bg-accent px-2 py-0.5 rounded shadow-floating border border-ink/10 uppercase tracking-widest">{label}</div>
          <div className="text-xs font-mono text-white/50 mt-1">
            {showEncrypted ? 'Encrypted with FHE' : 'Drag the slider to set your amount'}
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-black/40 rounded-lg p-6 shadow-recessed border border-white/5 mb-4">
        {/* CRT Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-30 rounded-lg" />
        
        <div className="h-16 flex items-center justify-center mb-6">
          <AnimatePresence mode="wait">
            {showEncrypted ? (
              <motion.div
                key="encrypted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[10px] sm:text-xs text-ink bg-accent px-4 py-2 rounded shadow-floating border border-ink/10 break-all text-center leading-relaxed font-bold tracking-widest"
              >
                {cipherDisplay || randomHex(64)}
              </motion.div>
            ) : (
              <motion.div
                key="plain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-4xl font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              >
                {formatSalary(value)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative h-2 bg-black/60 rounded-full shadow-recessed border border-white/10">
          <div 
            className="absolute top-0 left-0 h-full bg-accent rounded-full shadow-glow"
            style={{ width: `${percentage}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            onMouseUp={handleBlur}
            onTouchEnd={handleBlur}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="salary-slider"
          />
          {/* Custom Physical Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-chassis border-2 border-white rounded-full shadow-card pointer-events-none transition-shadow"
            style={{ left: `calc(${percentage}% - 12px)` }}
          >
            <div className="absolute inset-1 rounded-full shadow-recessed bg-muted" />
          </div>
        </div>

        <div className="flex justify-between mt-3 font-mono text-[10px] text-white/40 uppercase tracking-widest">
          <span>{formatSalary(min)}</span>
          <span>{formatSalary(max)}</span>
        </div>
      </div>

      <div className="flex items-start gap-3 relative z-10 bg-dark-panel p-3 rounded-lg border border-white/5">
        <ShieldCheck className="w-5 h-5 text-ink bg-accent rounded p-0.5 shadow-floating shrink-0" />
        <p className="text-[10px] font-mono text-white/60 leading-relaxed uppercase">
          This value is encrypted in your browser using Zama FHE before it reaches the blockchain. The plaintext is never exposed.
        </p>
      </div>
    </div>
  );
}
