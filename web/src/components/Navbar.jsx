import { Link, useLocation } from 'react-router-dom';
import ConnectWalletButton from './ConnectWalletButton';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" id="nav-logo">
        <svg viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#logo-grad)"/>
          <path d="M8 20L16 12L24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="16" cy="22" r="2.5" fill="white"/>
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="#7C3AED"/>
              <stop offset="1" stopColor="#06B6D4"/>
            </linearGradient>
          </defs>
        </svg>
        BlindHire
      </Link>

      <ul className="navbar-nav">
        <li><Link to="/jobs" className={isActive('/jobs')} id="nav-jobs">Browse Jobs</Link></li>
        <li><Link to="/post-job" className={isActive('/post-job')} id="nav-post-job">Post a Job</Link></li>
        <li><Link to="/dashboard/employer" className={isActive('/dashboard/employer')} id="nav-employer">Employer</Link></li>
        <li><Link to="/dashboard/candidate" className={isActive('/dashboard/candidate')} id="nav-candidate">My Applications</Link></li>
      </ul>

      <div className="navbar-actions">
        <ConnectWalletButton variant="navbar" />
      </div>
    </nav>
  );
}
