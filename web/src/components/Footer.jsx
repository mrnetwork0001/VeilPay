
export default function Footer() {
  return (
    <footer className="border-t border-white/40 bg-chassis mt-24 py-12 px-6 shadow-recessed relative overflow-hidden">
      {/* Decorative mechanical screws in corners */}
      <div className="absolute top-4 left-4 card-screw"></div>
      <div className="absolute top-4 right-4 card-screw"></div>
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2 text-ink">
            <div className="flex h-6 w-6 items-center justify-center rounded overflow-hidden">
              <img src="/veilpay-logo.png" alt="VeilPay Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight">VeilPay</span>
          </div>
          <p className="text-ink-muted text-sm font-medium">Confidential salary matching powered by <strong className="text-ink font-black bg-accent px-1.5 py-0.5 rounded shadow-sharp">Zama fhEVM</strong></p>
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
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-ink bg-accent/30 hover:bg-accent hover:shadow-floating border border-accent/20 rounded-md transition-all shadow-recessed"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />
            View Contract on Etherscan
          </a>
        </div>
      </div>
    </footer>
  );
}
