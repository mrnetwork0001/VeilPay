import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';

const FAKE_CIPHER = '0x8f3a...c7d2';
const FAKE_CIPHER2 = '0x1b9e...44fa';

function MatchVisualizer() {
  const [phase, setPhase] = useState(0); // 0: loading, 1: encrypted, 2: matched

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => setPhase(0), 5000);
    // Restart cycle
    const cycle = setInterval(() => {
      setPhase(0);
      setTimeout(() => setPhase(1), 600);
      setTimeout(() => setPhase(2), 2200);
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(cycle); };
  }, []);

  return (
    <div className="match-visualizer">
      {/* Employer Block */}
      <motion.div
        className="match-block"
        animate={{ borderColor: phase >= 1 ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)' }}
        transition={{ duration: 0.4 }}
      >
        <div className="match-block-label">Employer Max Budget</div>
        <motion.div
          className="match-block-value"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {phase === 0 ? '$140,000' : FAKE_CIPHER}
          {phase === 0 && <div style={{ fontSize: '0.65rem', color: 'var(--white-50)', marginTop: '0.25rem' }}>$140,000</div>}
        </motion.div>
        {phase >= 1 && (
          <div style={{ marginTop: '0.5rem' }}>
            <span className="badge badge-violet">🔒 FHE Encrypted</span>
          </div>
        )}
      </motion.div>

      {/* Center Arrow / Result */}
      <div className="match-arrow">
        <motion.div
          style={{ color: 'var(--white-50)', fontSize: '1.5rem' }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: phase < 2 ? Infinity : 0, ease: 'linear' }}
        >
          {phase < 2 ? '⚙️' : ''}
        </motion.div>
        {phase === 2 && (
          <motion.div
            className="match-result-badge match"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
          >
            ✓
          </motion.div>
        )}
        <div style={{ fontSize: '0.7rem', color: 'var(--white-50)', textAlign: 'center' }}>
          {phase === 0 && 'TFHE.le()'}
          {phase === 1 && 'Evaluating...'}
          {phase === 2 && 'MATCH'}
        </div>
      </div>

      {/* Candidate Block */}
      <motion.div
        className="match-block"
        animate={{ borderColor: phase >= 1 ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)' }}
        transition={{ duration: 0.4 }}
      >
        <div className="match-block-label">Candidate Min Salary</div>
        <motion.div
          className="match-block-value"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {phase === 0 ? '$120,000' : FAKE_CIPHER2}
        </motion.div>
        {phase >= 1 && (
          <div style={{ marginTop: '0.5rem' }}>
            <span className="badge badge-cyan">🔒 FHE Encrypted</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    icon: '💼',
    title: 'Employer Posts Confidentially',
    desc: 'The company sets their maximum budget. It\'s encrypted in the browser using ZamaFHE — the number never leaves your device in plaintext.',
  },
  {
    number: '02',
    icon: '📝',
    title: 'Candidate Applies Confidentially',
    desc: 'The candidate sets their minimum acceptable salary. Also encrypted client-side. Nobody sees this number — not even us.',
  },
  {
    number: '03',
    icon: '🔮',
    title: 'Smart Contract Evaluates the Match',
    desc: 'TFHE.le(min, max) runs entirely on encrypted values. A boolean result comes out. Salaries stay private forever.',
  },
];

const WHY_FHE_POINTS = [
  {
    icon: '🔒',
    title: 'No Trust Required',
    desc: 'Unlike a middleman, the smart contract cannot lie. The computation is verifiable on Ethereum.',
  },
  {
    icon: '♾️',
    title: 'Mathematically Guaranteed',
    desc: 'FHE means the salaries are never decrypted — the comparison happens directly on ciphertext.',
  },
  {
    icon: '⚖️',
    title: 'Fair for Both Sides',
    desc: 'Neither party learns the other\'s number — only the match outcome. True information parity.',
  },
];

export default function Landing() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-glow" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <FadeIn>
            <div className="hero-eyebrow">
              <span>🔐</span> Powered by Zama fhEVM · Deployed on Sepolia
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="hero-title">
              The Salary Negotiation<br />
              is <span className="hero-title-gradient">Dead.</span><br />
              Long Live the <span className="hero-title-gradient">Match.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="hero-subtitle">
              BlindHire is the world's first confidential, trustless salary-matching protocol.
              Both sides stay private. The blockchain decides. No one loses.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="hero-actions">
              <Link to="/post-job" id="hero-post-job-btn" className="btn btn-primary btn-lg">
                Post a Job 💼
              </Link>
              <Link to="/jobs" id="hero-browse-jobs-btn" className="btn btn-secondary btn-lg">
                Browse Jobs →
              </Link>
            </div>
          </FadeIn>

          {/* Match Visualizer */}
          <FadeIn delay={0.5}>
            <MatchVisualizer />
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--white-50)' }}>
              Live FHE computation demo — both values stay encrypted throughout
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="divider" />

      {/* ── HOW IT WORKS ── */}
      <section className="section">
        <div className="container">
          <FadeIn>
            <span className="section-label">How It Works</span>
            <h2 className="section-title">Three Steps. Zero Leaks.</h2>
            <p className="section-subtitle">
              The entire protocol runs in two encrypted transactions and one homomorphic comparison.
            </p>
          </FadeIn>

          <StaggerContainer className="steps-grid">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <StaggerItem key={step.number}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="step-number">{step.number}</div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{step.icon}</div>
                  <h4 className="step-title">{step.title}</h4>
                  <p style={{ fontSize: '0.875rem' }}>{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <div className="divider" />

      {/* ── CORE FHE INSIGHT ── */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <FadeIn>
              <span className="section-label">The Core Computation</span>
              <h2 className="section-title">One Line of Code. <span className="gradient-text">Infinite Privacy.</span></h2>
              <p style={{ color: 'var(--white-70)', marginBottom: '1.5rem', lineHeight: '1.8' }}>
                The entire salary-matching logic is a single <strong style={{ color: 'var(--violet-light)' }}>homomorphic comparison</strong>.
                Both values go in as ciphertexts. A boolean comes out. The numbers stay encrypted forever.
              </p>
              <Link to="/post-job" id="cta-post-job" className="btn btn-cyan">
                Try It — Post a Job
              </Link>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="card card-glass" style={{ fontFamily: 'monospace', padding: '2rem' }}>
                <div style={{ color: 'var(--white-50)', fontSize: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  BlindHire.sol — resolveApplication()
                </div>
                <pre style={{ fontSize: '0.8rem', color: 'var(--white-70)', lineHeight: '1.9', overflowX: 'auto' }}>
{`// THE CORE FHE COMPUTATION
ebool matched = TFHE.le(
  application.min_expectation,
  posting.max_budget
);

// min_expectation: ciphertext ✓
// max_budget:      ciphertext ✓
// matched:         ebool      ✓
// plaintext seen:  NEVER      ✓`}
                </pre>
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--violet)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--violet-light)', fontWeight: 600 }}>
                    🔐 Zero-Knowledge Computation
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--white-50)', marginTop: '0.25rem' }}>
                    Powered by Zama's Fully Homomorphic Encryption on Ethereum
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── WHY FHE ── */}
      <section className="section">
        <div className="container">
          <FadeIn>
            <span className="section-label">Why FHE?</span>
            <h2 className="section-title" style={{ maxWidth: 540 }}>
              Trustless Means Nobody Has to Trust Anyone.
            </h2>
          </FadeIn>

          <StaggerContainer className="steps-grid" style={{ marginTop: '2rem' }}>
            {WHY_FHE_POINTS.map((p) => (
              <StaggerItem key={p.title}>
                <div className="card">
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{p.icon}</div>
                  <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>{p.title}</h4>
                  <p style={{ fontSize: '0.875rem' }}>{p.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="section" style={{ paddingTop: '2rem' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <FadeIn>
            <div className="card card-glass" style={{ maxWidth: 600, margin: '0 auto', padding: '3rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Ready to <span className="gradient-text">Match Fairly</span>?</h2>
              <p style={{ marginBottom: '2rem', color: 'var(--white-70)' }}>
                Post a job or apply to one. Your salary data never leaves your browser unencrypted.
              </p>
              <div className="hero-actions" style={{ justifyContent: 'center' }}>
                <Link to="/post-job" id="final-cta-post" className="btn btn-primary btn-lg">Post a Job</Link>
                <Link to="/jobs" id="final-cta-browse" className="btn btn-secondary btn-lg">Browse Jobs</Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
