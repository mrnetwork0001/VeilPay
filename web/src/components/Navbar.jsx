import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import ConnectWalletButton from './ConnectWalletButton';

export default function Navbar() {
  const location = useLocation();

  const getLinkClass = (path) => {
    const baseClass = "px-4 py-2 rounded-md font-sans text-sm font-bold tracking-wide uppercase transition-all duration-150";
    if (location.pathname === path) {
      return `${baseClass} bg-accent text-ink shadow-floating border-ink/10`;
    }
    return `${baseClass} text-ink-muted hover:bg-muted/50 hover:shadow-recessed`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-[80px] z-50 flex items-center justify-between px-6 md:px-12 bg-chassis border-b border-white/40 shadow-sm">
      <Link to="/" className="flex items-center gap-3" id="nav-logo">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chassis shadow-card border border-white/20">
          <Lock className="text-ink bg-accent p-1 rounded shadow-floating h-6 w-6" />
        </div>
        <span className="font-sans font-bold text-xl tracking-tight text-ink">VeilPay</span>
      </Link>

      <ul className="hidden md:flex items-center gap-1 lg:gap-2 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
        <li><Link to="/" className={getLinkClass('/')} id="nav-home">Home</Link></li>
        <li><Link to="/jobs" className={getLinkClass('/jobs')} id="nav-jobs">Browse Jobs</Link></li>
        <li><Link to="/post-job" className={getLinkClass('/post-job')} id="nav-post-job">Post a Job</Link></li>
        <li><Link to="/dashboard/employer" className={getLinkClass('/dashboard/employer')} id="nav-employer">Employer</Link></li>
        <li><Link to="/dashboard/candidate" className={getLinkClass('/dashboard/candidate')} id="nav-candidate">Applications</Link></li>
      </ul>

      <div className="flex items-center gap-4">
        {/* LED Indicator for 'Online' status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-chassis shadow-recessed">
          <div className="led led-green"></div>
          <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-widest">Sys Online</span>
        </div>
        <ConnectWalletButton variant="navbar" />
      </div>
    </nav>
  );
}
