import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useFhevm — Zama FHE Hook with graceful demo fallback
 *
 * Set VITE_FHE_LIVE=true in .env to enable real FHE encryption.
 * Without it, the hook skips SDK init entirely and uses demo mode.
 * This prevents the heavy WASM/ZK-proof computation from freezing the UI
 * when the contract infrastructure doesn't match the SDK yet.
 *
 * Production note: Real FHE requires the contract and frontend SDK
 * to target the same Zama infrastructure deployment.
 */

// Gate real FHE behind an explicit flag — prevents UI freeze from
// heavy ZK computation when contract addresses don't match anyway.
const FHE_LIVE = import.meta.env.VITE_FHE_LIVE === 'true';

let fhevmInstance = null;
let initPromise = null;
let sdkInitialized = false;

export function useFhevm() {
  const [fheLoaded, setFheLoaded] = useState(false);
  const [initError, setInitError] = useState(null);
  const [initStage, setInitStage] = useState('idle');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Avoid double init
    if (initPromise) return;
    if (fhevmInstance) { setFheLoaded(true); setInitStage('ready'); return; }

    initPromise = (async () => {
      try {
        // ── Step 1: Import the SDK ──────────────────────────────────────────────
        if (mountedRef.current) setInitStage('wasm');
        console.log('[useFhevm] Loading @zama-fhe/relayer-sdk...');

        const sdk = await import('@zama-fhe/relayer-sdk/web');
        const { initSDK, createInstance, SepoliaConfig } = sdk;

        // ── Step 2: Initialize WASM modules (TFHE + TKMS) ────────────────────
        if (!sdkInitialized) {
          console.log('[useFhevm] Initializing WASM (TFHE + TKMS)...');
          await initSDK();
          sdkInitialized = true;
          console.log('[useFhevm] ✅ WASM modules loaded');
        }

        // ── Step 3: Create the FHE instance ─────────────────────────────────
        if (mountedRef.current) setInitStage('instance');
        console.log('[useFhevm] Creating FHE instance with SepoliaConfig...');

        const RPC = import.meta.env.VITE_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';

        const instance = await createInstance({
          ...SepoliaConfig,
          network: RPC,
        });

        fhevmInstance = instance;
        console.log('[useFhevm] ✅ Real ZamaFHE initialized (Sepolia relayer)');
        if (mountedRef.current) {
          setFheLoaded(true);
          setInitStage('ready');
        }
        return instance;
      } catch (err) {
        console.error('[useFhevm] FHE SDK initialization failed:', err.message);
        if (mountedRef.current) {
          setInitError(err.message);
          setInitStage('error');
        }
        initPromise = null;
        return null;
      }
    })();

    initPromise.catch(() => {});
  }, []);

  /**
   * encryptUint64
   *
   * Real mode: uses ZamaFHE via relayer-sdk createEncryptedInput()
   * Demo mode: returns deterministically hashed ciphertext for UI demonstrations.
   */
  const encryptUint64 = useCallback(async (value, userAddress) => {
    const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

    if (!userAddress) throw new Error("User address required for encryption");

    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }

    if (!instance) {
      throw new Error("FHE instance not initialized. Cannot encrypt.");
    }

    try {
      const encrypt = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      encrypt.add64(BigInt(value));
      const result = await encrypt.encrypt();

      return {
        handle: result.handles[0],
        inputProof: result.inputProof,
        isDemo: false,
      };
    } catch (err) {
      console.error('[useFhevm] Encryption failed:', err.message);
      throw err;
    }
  }, []);

  return {
    isReady: true,
    fheLoaded,
    initError,
    initStage,
    encryptUint64,
    instance: fhevmInstance,
  };
}
