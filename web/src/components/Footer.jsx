import { Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/40 bg-chassis mt-24 py-12 px-6 shadow-recessed relative overflow-hidden">
      {/* Decorative mechanical screws in corners */}
      <div className="absolute top-4 left-4 card-screw"></div>
      <div className="absolute top-4 right-4 card-screw"></div>
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2 text-ink">
            <Lock className="w-5 h-5 text-ink-muted" />
            <span className="font-sans font-bold text-lg tracking-tight">VeilPay</span>
          </div>
          <p className="text-ink-muted text-sm font-medium">Confidential salary matching powered by <strong className="text-accent font-bold">Zama fhEVM</strong></p>
        </div>
        
        <div className="text-center md:text-right">
          <p className="text-xs font-mono text-ink-muted uppercase tracking-widest leading-relaxed">
            Built for the Zama Builder Track Hackathon<br />
            Deployed on Sepolia
          </p>
          <a
            href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 hover:bg-accent hover:text-white rounded-md transition-colors"
          >
            <span className="led led-red w-1.5 h-1.5 shadow-none" />
            View Contract on Etherscan
          </a>
        </div>
      </div>
    </footer>
  );
}
