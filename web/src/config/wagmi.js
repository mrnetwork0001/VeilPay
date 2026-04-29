import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors';

/**
 * Wagmi config — direct connectors, no WalletConnect dependency.
 *
 * Supports:
 *   • MetaMask (browser extension + mobile)
 *   • Coinbase Wallet (extension + smart wallet)
 *   • Any injected EIP-1193 provider (Brave, Trust, Rabby, etc.)
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'BlindHire' }),
  ],
  transports: {
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'
    ),
  },
});
