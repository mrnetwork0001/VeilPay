import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    react(),
  ],
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
    include: ['wasm-feature-detect'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    headers: {
      // Note: Zama FHE's relayer-sdk requires SharedArrayBuffer (COOP: same-origin),
      // but Coinbase Smart Wallet needs COOP to NOT be same-origin.
      // Using 'same-origin-allow-popups' as a compromise — works for both.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
