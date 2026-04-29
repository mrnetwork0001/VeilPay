import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAKE_CIPHER_CHARS = '0123456789abcdef';

function randomHex(length = 64) {
  return '0x' + Array.from({ length }, () =>
    FAKE_CIPHER_CHARS[Math.floor(Math.random() * 16)]
  ).join('');
}

/**
 * EncryptionZone — The "magic" UI component
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
    <div className="encryption-zone">
      <div className="encryption-zone-header">
        <motion.div
          className={`lock-icon ${isEncrypting ? 'encrypting' : ''}`}
          animate={isEncrypting ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {showEncrypted ? '🔒' : '🔓'}
        </motion.div>
        <div>
          <div className="encryption-zone-title">{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--white-50)' }}>
            {showEncrypted ? 'Encrypted via ZamaFHE · Never revealed on-chain' : 'Drag slider or enter amount'}
          </div>
        </div>
      </div>

      <div className="salary-slider-wrapper">
        <AnimatePresence mode="wait">
          {showEncrypted ? (
            <motion.div
              key="encrypted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="salary-display encrypted"
            >
              {cipherDisplay || randomHex(64)}
            </motion.div>
          ) : (
            <motion.div
              key="plain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="salary-display"
            >
              {formatSalary(value)}
            </motion.div>
          )}
        </AnimatePresence>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          onMouseUp={handleBlur}
          onTouchEnd={handleBlur}
          style={{ '--val': `${percentage}%` }}
          id="salary-slider"
        />

        <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--white-50)' }}>
          <span>{formatSalary(min)}</span>
          <span>{formatSalary(max)}</span>
        </div>
      </div>

      <p className="encryption-zone-hint">
        🔐 This value is encrypted <strong>inside your browser</strong> using Zama's Fully Homomorphic Encryption
        before being sent to the blockchain. Nobody — not even us — will ever see this number in plaintext.
      </p>
    </div>
  );
}
