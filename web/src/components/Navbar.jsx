import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ConnectWalletButton from './ConnectWalletButton';

const NAV_LINKS = [
  { path: '/', label: 'Home', id: 'nav-home' },
  { path: '/jobs', label: 'Browse Jobs', id: 'nav-jobs' },
  { path: '/post-job', label: 'Post a Job', id: 'nav-post-job' },
  { path: '/proof', label: 'FHE Proof', id: 'nav-proof' },
  { path: '/dashboard/employer', label: 'Employer', id: 'nav-employer' },
  { path: '/dashboard/candidate', label: 'Applications', id: 'nav-candidate' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getLinkClass = (path) => {
    const baseClass = "px-4 py-2 rounded-md font-sans text-sm font-bold tracking-wide uppercase transition-all duration-150";
    if (location.pathname === path) {
      return `${baseClass} bg-accent text-ink shadow-floating border-ink/10`;
    }
    return `${baseClass} text-ink-muted hover:bg-muted/50 hover:shadow-recessed`;
  };

  const getMobileLinkClass = (path) => {
    const baseClass = "block w-full px-5 py-3.5 rounded-lg font-sans text-base font-bold tracking-wide uppercase transition-all duration-150";
    if (location.pathname === path) {
      return `${baseClass} bg-accent text-ink shadow-floating`;
    }
    return `${baseClass} text-ink-muted hover:bg-muted/40`;
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-[80px] z-50 flex items-center justify-between px-6 lg:px-12 bg-chassis border-b border-white/40 shadow-sm">
        <Link to="/" className="flex items-center gap-3" id="nav-logo">
          <div className="flex h-10 w-10 items-center justify-center rounded-md shadow-card border border-white/20 overflow-hidden">
            <img src="/veilpay-logo.png" alt="VeilPay Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-ink">VeilPay</span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-1 xl:gap-2 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
          {NAV_LINKS.map((link) => (
            <li key={link.path}>
              <Link to={link.path} className={getLinkClass(link.path)} id={link.id}>{link.label}</Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          {/* Wallet Button (Desktop) */}
          <div className="hidden lg:block">
            <ConnectWalletButton variant="navbar" />
          </div>

          {/* Hamburger (Mobile) */}
          <button
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-chassis shadow-card border border-white/30 active:shadow-recessed transition-shadow"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
          >
            {mobileOpen ? <X className="w-5 h-5 text-ink" /> : <Menu className="w-5 h-5 text-ink" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              className="fixed top-[80px] right-0 bottom-0 z-40 w-[280px] bg-chassis border-l border-white/30 shadow-card flex flex-col lg:hidden overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >

              {/* Nav Links */}
              <div className="flex flex-col gap-1 px-4 py-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={getMobileLinkClass(link.path)}
                    id={`mobile-${link.id}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Wallet Connect (Mobile) */}
              <div className="mt-auto px-5 pb-8 pt-4 border-t border-ink/10">
                <div className="mb-3">
                  <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-widest">Wallet</span>
                </div>
                <ConnectWalletButton variant="navbar" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
