import { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';

const WALLET_META = {
  metaMaskSDK: { name: 'MetaMask', icon: '🦊' },
  metaMask:    { name: 'MetaMask', icon: '🦊' },
  coinbaseWalletSDK: { name: 'Coinbase', icon: '🔵' },
  coinbaseWallet:    { name: 'Coinbase', icon: '🔵' },
  injected:    { name: 'Browser Wallet', icon: '🌐' },
};

function getWalletInfo(connectorId) {
  return WALLET_META[connectorId] || { name: connectorId, icon: '🔗' };
}

function shortenAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * ConnectWalletButton — Custom wallet connection UI
 *
 * Replaces RainbowKit's ConnectButton. Supports MetaMask, Coinbase Wallet,
 * and any injected EIP-1193 provider. No WalletConnect dependency.
 */
export default function ConnectWalletButton({ variant = 'navbar' }) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowWalletMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deduplicate connectors by ID (wagmi can register multiples)
  const uniqueConnectors = connectors.reduce((acc, c) => {
    // Skip duplicates, prefer the first one found
    const key = c.id === 'metaMaskSDK' ? 'metaMask' : c.id;
    if (!acc.find(x => (x.id === 'metaMaskSDK' ? 'metaMask' : x.id) === key)) {
      acc.push(c);
    }
    return acc;
  }, []);

  // ── Not connected: show connect button ──────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="wallet-connect-wrapper" ref={dropdownRef}>
        <button
          id="connect-wallet-btn"
          className={`btn ${variant === 'navbar' ? 'btn-primary btn-sm' : 'btn-primary btn-lg'}`}
          onClick={() => setShowWalletMenu(prev => !prev)}
          disabled={isPending}
          style={variant === 'navbar' ? {} : { width: '100%' }}
        >
          {isPending ? (
            <><span className="btn-spinner" /> Connecting...</>
          ) : (
            '🔗 Connect Wallet'
          )}
        </button>

        <AnimatePresence>
          {showWalletMenu && (
            <motion.div
              className="wallet-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="wallet-dropdown-title">Connect a Wallet</div>
              {uniqueConnectors.map((connector) => {
                const info = getWalletInfo(connector.id);
                return (
                  <button
                    key={connector.uid}
                    id={`wallet-option-${connector.id}`}
                    className="wallet-option"
                    onClick={() => {
                      connect({ connector });
                      setShowWalletMenu(false);
                    }}
                  >
                    <span className="wallet-option-icon">{info.icon}</span>
                    <span className="wallet-option-name">{info.name}</span>
                    <span className="wallet-option-arrow">→</span>
                  </button>
                );
              })}
              <div className="wallet-dropdown-hint">
                Sepolia Testnet · No WalletConnect required
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Connected: show address + disconnect ────────────────────────────────────
  const walletInfo = getWalletInfo(activeConnector?.id);

  return (
    <div className="wallet-connect-wrapper" ref={dropdownRef}>
      <button
        id="wallet-status-btn"
        className="wallet-status-btn"
        onClick={() => setShowDropdown(prev => !prev)}
      >
        <span className="wallet-status-icon">{walletInfo.icon}</span>
        <span className="wallet-status-address">{shortenAddress(address)}</span>
        <span className="wallet-status-chain">Sepolia</span>
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="wallet-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="wallet-dropdown-info">
              <div className="wallet-dropdown-label">Connected with {walletInfo.name}</div>
              <div className="wallet-dropdown-address">{address}</div>
              {balance && (
                <div className="wallet-dropdown-balance">
                  {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                </div>
              )}
            </div>
            <button
              id="disconnect-wallet-btn"
              className="wallet-disconnect-btn"
              onClick={() => { disconnect(); setShowDropdown(false); }}
            >
              ⏏ Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * useWalletConnect — Replacement for RainbowKit's useConnectModal
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
