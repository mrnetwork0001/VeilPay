import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Code2, Network, Lock, FileDigit, Briefcase } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';

const FAKE_CIPHER = '0x8f3a...c7d2';
const FAKE_CIPHER2 = '0x1b9e...44fa';

function MatchVisualizer() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const cycle = setInterval(() => {
      setPhase(0);
      setTimeout(() => setPhase(1), 800);
      setTimeout(() => setPhase(2), 2400);
      setTimeout(() => setPhase(3), 4000);
    }, 6000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square md:aspect-[4/3] bg-dark-bg rounded-xl border-4 border-chassis shadow-card overflow-hidden">
      {/* Device Bezel Texture */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      
      {/* Inner Screen */}
      <div className="absolute inset-3 bg-black rounded-lg shadow-recessed overflow-hidden border border-white/10 flex flex-col">
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-50 z-10" />
        
        {/* Screen Header */}
        <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-white/5 z-20">
          <span className="text-[10px] font-mono font-bold text-ink-muted tracking-widest uppercase">FHE.le_Engine_v1.0</span>
          <span className="flex items-center gap-2 text-[10px] font-mono text-accent">
            <span className="led led-red shadow-none w-1.5 h-1.5" /> ONLINE
          </span>
        </div>

        {/* Screen Content */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-20 gap-4">
          
          <div className="w-full flex justify-between items-center px-4">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-ink-muted uppercase mb-1">Employer_Max</span>
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-white">
                {phase === 0 ? '$140,000' : <span className="text-accent">{FAKE_CIPHER}</span>}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-ink-muted uppercase mb-1">Candidate_Min</span>
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-white">
                {phase === 0 ? '$120,000' : <span className="text-accent">{FAKE_CIPHER2}</span>}
              </div>
            </div>
          </div>

          <div className="h-12 flex items-center justify-center w-full">
            {phase === 1 && <span className="w-6 h-6 border-2 border-white/20 border-t-accent rounded-full animate-spin" />}
            {phase === 2 && <span className="text-accent font-mono text-sm tracking-widest animate-pulse">[ HOMOMORPHIC EVAL ]</span>}
            {phase === 3 && (
              <div className="px-4 py-1.5 bg-green-500/20 border border-green-500/50 rounded text-green-400 font-mono text-sm font-bold tracking-widest shadow-glow-green">
                MATCH_CONFIRMED = 1
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Hardware Details */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <div className="w-1 h-6 bg-black/20 rounded-l-full shadow-recessed" />
        <div className="w-1 h-6 bg-black/20 rounded-l-full shadow-recessed" />
      </div>
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    icon: <Briefcase className="w-6 h-6 text-ink" />,
    title: 'Employer Posts',
    desc: 'Max budget encrypted client-side. The number never leaves your device in plaintext.',
  },
  {
    number: '02',
    icon: <FileDigit className="w-6 h-6 text-ink" />,
    title: 'Candidate Applies',
    desc: 'Min salary encrypted client-side. Nobody sees this number — not even us.',
  },
  {
    number: '03',
    icon: <Cpu className="w-6 h-6 text-ink" />,
    title: 'On-Chain Match',
    desc: 'FHE.le(min, max) runs on ciphertext. Salaries stay private forever.',
  },
];

export default function Landing() {
  return (
    <div className="pt-8 pb-24">
      {/* ── HERO ── */}
      <section className="max-w-[72rem] mx-auto px-6 md:px-12 py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-12 items-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-8 border border-white/40">
              <span className="led led-green" />
              <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">Powered by Zama FHE</span>
            </div>
            
            <h1 className="font-sans font-extrabold text-5xl md:text-7xl text-ink tracking-tight mb-6 leading-[1.1] drop-shadow-[0_1px_1px_#ffffff]">
              The Salary<br/>Negotiation<br/>
              <span className="inline-block mt-2 px-4 py-1 bg-accent text-ink rounded-md shadow-floating rotate-[-2deg] border border-ink/10">Is Dead.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-ink-muted font-medium max-w-xl mb-10 leading-relaxed">
              VeilPay is the world's first confidential, trustless salary-matching protocol. Both sides stay private. The blockchain decides.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/post-job" id="hero-post-job-btn" className="btn btn-primary w-full sm:w-auto text-base px-8 py-4">
                Post a Job
              </Link>
              <Link to="/jobs" id="hero-browse-jobs-btn" className="btn btn-secondary w-full sm:w-auto text-base px-8 py-4">
                Browse Jobs
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.2} className="relative w-full">
            <MatchVisualizer />
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-[72rem] mx-auto px-6 md:px-12 py-24 relative">
        <FadeIn className="mb-16">
          <div className="font-mono text-sm font-bold text-ink uppercase tracking-widest mb-4 inline-block border-b-4 border-accent pb-1">How It Works</div>
          <h2 className="font-sans font-bold text-4xl text-ink drop-shadow-[0_1px_1px_#ffffff]">Three Steps. Zero Leaks.</h2>
        </FadeIn>

        <div className="relative">
          {/* Physical Connector Pipe (Desktop Only) */}
          <div className="hidden md:block absolute top-1/2 -translate-y-1/2 left-12 right-12 h-3 rounded-full bg-[#d1d9e6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] z-0" />
          
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <StaggerItem key={step.number}>
                <div className="card text-center bg-chassis group hover:-translate-y-2 transition-all duration-300">
                  <div className="absolute top-4 left-4 card-screw" />
                  <div className="absolute top-4 right-4 card-screw" />
                  <div className="absolute bottom-4 left-4 card-screw" />
                  <div className="absolute bottom-4 right-4 card-screw" />
                  
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-chassis shadow-floating flex items-center justify-center">
                    {step.icon}
                  </div>
                  <div className="font-mono text-xs font-bold text-ink-muted mb-2">STEP {step.number}</div>
                  <h4 className="font-sans font-bold text-xl text-ink mb-3">{step.title}</h4>
                  <p className="text-ink-muted text-sm leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── CORE FHE INSIGHT (Dark Panel) ── */}
      <section className="w-full bg-dark-bg py-24 mt-12 shadow-[inset_0_10px_20px_rgba(0,0,0,0.2)] relative overflow-hidden">
        {/* Carbon Fiber overlay */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="max-w-[72rem] mx-auto px-6 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeIn>
            <div className="font-mono text-sm font-bold text-accent uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Core Computation
            </div>
            <h2 className="font-sans font-bold text-4xl text-white mb-6">
              One Line of Code.<br/>Infinite Privacy.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-md">
              The entire salary-matching logic is a single homomorphic comparison. Both values go in as ciphertexts. A boolean comes out. The numbers stay encrypted forever.
            </p>
            <Link to="/post-job" id="cta-post-job" className="btn btn-primary text-base">
              Post a Job
            </Link>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="bg-dark-panel rounded-xl shadow-card border border-white/10 p-6 font-mono text-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10 text-white/50 text-xs">
                <Code2 className="w-4 h-4" /> VeilPay.sol — resolveApplication()
              </div>
              <pre className="text-white/80 leading-loose overflow-x-auto">
<span className="text-white/40">// THE CORE FHE COMPUTATION</span><br/>
<span className="text-accent font-bold">ebool</span> matched = FHE.le(<br/>
&nbsp;&nbsp;application.min_expectation,<br/>
&nbsp;&nbsp;posting.max_budget<br/>
);<br/><br/>
<span className="text-white/40">// min_expectation: ciphertext ✓</span><br/>
<span className="text-white/40">// max_budget:      ciphertext ✓</span><br/>
<span className="text-white/40">// plaintext seen:  NEVER      ✓</span>
              </pre>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-[72rem] mx-auto px-6 md:px-12 py-32 text-center">
        <FadeIn>
          <div className="card max-w-2xl mx-auto py-16 px-8 relative bg-[linear-gradient(135deg,#e0e5ec,#d1d9e6)]">
            {/* Top hanging hole */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-chassis shadow-recessed" />
            
            <ShieldCheck className="w-16 h-16 text-ink mx-auto mb-6 shadow-floating rounded-full bg-accent p-3 border border-ink/10" />
            <h2 className="font-sans font-bold text-3xl md:text-4xl text-ink mb-6 drop-shadow-[0_1px_1px_#ffffff]">Ready to Match Fairly?</h2>
            <p className="text-ink-muted text-lg mb-10 max-w-md mx-auto">
              Your salary data never leaves your browser unencrypted. Trust the math.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/post-job" id="final-cta-post" className="btn btn-primary px-8">Post a Job</Link>
              <Link to="/jobs" id="final-cta-browse" className="btn btn-secondary px-8">Browse Jobs</Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
