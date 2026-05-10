import { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

const WALLET_META = {
  injected: { name: 'Browser Wallet', icon: <Globe className="w-4 h-4" /> },
};

function getWalletInfo() {
  return WALLET_META.injected;
}

function shortenAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * ConnectWalletButton - Custom wallet connection UI
 */
export default function ConnectWalletButton({ variant = 'navbar' }) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Browser extension wallets only (MetaMask, Rabby, OKX, Coinbase, Brave)
  const displayOptions = [
    {
      id: 'browser-wallet',
      name: 'Browser Wallet',
      icon: <Globe className="w-4.5 h-4.5" />,
      desc: 'MetaMask, Rabby, OKX, Coinbase',
      connector: connectors.find(c => c.type === 'injected' || c.id === 'injected')
    },
  ].filter(opt => opt.connector);

  // ── Not connected: show connect button ──────────────────────────────────────
  if (!isConnected) {
    const injectedConnector = connectors.find(c => c.type === 'injected' || c.id === 'injected');

    const handleConnect = () => {
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    };

    return (
      <button
        id="connect-wallet-btn"
        className={`btn ${variant === 'navbar' ? 'btn-primary px-4 py-2 text-xs' : 'btn-primary w-full'}`}
        onClick={handleConnect}
        disabled={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
            Connecting...
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>
    );
  }

  // ── Connected: show address + disconnect ────────────────────────────────────
  const walletInfo = getWalletInfo(activeConnector?.id, activeConnector?.type);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        id="wallet-status-btn"
        className="flex items-center gap-2 px-3 py-1.5 bg-chassis border border-white/40 shadow-recessed rounded-md hover:shadow-card transition-all active:translate-y-[1px] active:shadow-pressed"
        onClick={() => setShowDropdown(prev => !prev)}
      >
        <span className="text-ink-muted">{walletInfo.icon}</span>
        <span className="font-mono text-xs font-bold text-ink">{shortenAddress(address)}</span>
        <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-accent text-ink font-bold border border-ink/10 shadow-floating">Sepolia</span>
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute right-0 mt-3 w-64 bg-chassis border border-white/40 shadow-floating rounded-xl overflow-hidden p-4"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <div className="flex flex-col gap-1 mb-4 pb-4 border-b border-ink/5">
              <div className="text-[10px] font-mono uppercase text-ink-muted font-bold tracking-wider">Connected with {walletInfo.name}</div>
              <div className="font-mono text-sm text-ink break-all">{address}</div>
              {balance && (
                <div className="mt-2 font-mono text-xl font-bold text-ink bg-accent px-2 py-0.5 rounded shadow-floating border border-ink/10 inline-block">
                  {parseFloat(balance.formatted).toFixed(4)} <span className="text-sm">ETH</span>
                </div>
              )}
            </div>
            <button
              id="disconnect-wallet-btn"
              className="w-full btn btn-ghost justify-center border border-ink/10 text-xs"
              onClick={() => { disconnect(); setShowDropdown(false); }}
            >
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * useWalletConnect - Replacement for RainbowKit's useConnectModal
 *
 * Pages call openConnectModal() to prompt the user. Since we no longer have
 * a global modal, this scrolls to the navbar connect button and pulses it.
 */
export function useWalletConnect() {
  const { connectors, connect } = useConnect();

  const openConnectModal = () => {
    const btn = document.getElementById('connect-wallet-btn');
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.classList.add('pulse-highlight');
      btn.click();
      setTimeout(() => btn.classList.remove('pulse-highlight'), 2000);
    } else {
      // Fallback: try connecting MetaMask directly
      const mmConnector = connectors.find(c => c.id === 'metaMask' || c.id === 'metaMaskSDK' || c.id === 'injected');
      if (mmConnector) connect({ connector: mmConnector });
    }
  };

  return { openConnectModal };
}
