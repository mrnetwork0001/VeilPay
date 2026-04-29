import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

/**
 * Wagmi config — Custom VeilPay Configuration
 *
 * Supports:
 *   • Browser Wallet (Injected EIP-1193 / EIP-6963 like MetaMask, Rabby, OKX)
 *   • WalletConnect (for Mobile Wallets via QR / App Link)
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    walletConnect({ 
      projectId: import.meta.env.VITE_WC_PROJECT_ID || '3fcc6bba6f1de962d911bb5b5c3dba68',
      name: 'WalletConnect',
      showQrModal: true 
    }),
  ],
  transports: {
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'
    ),
  },
});
