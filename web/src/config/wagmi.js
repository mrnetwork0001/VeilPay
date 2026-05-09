import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Wagmi config - VeilPay Configuration
 *
 * Supports browser extension wallets only (Injected EIP-1193 / EIP-6963):
 *   • MetaMask, Rabby, Coinbase Wallet, OKX, Brave, etc.
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'
    ),
  },
});
