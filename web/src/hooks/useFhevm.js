import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useFhevm - Zama FHE Hook with graceful demo fallback
 *
 * Set VITE_FHE_LIVE=true in .env to enable real FHE encryption.
 * Without it, the hook skips SDK init entirely and uses demo mode.
 * This prevents the heavy WASM/ZK-proof computation from freezing the UI
 * when the contract infrastructure doesn't match the SDK yet.
 *
 * Production note: Real FHE requires the contract and frontend SDK
 * to target the same Zama infrastructure deployment.
 */

// Gate real FHE behind an explicit flag - prevents UI freeze from
// heavy ZK computation when contract addresses don't match anyway.
const FHE_LIVE = import.meta.env.VITE_FHE_LIVE === 'true';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xf1259dB36778C0891d2f33dc0A2b5CEA0C75f232';

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

  /**
   * decryptEbool - Public Decryption with Coprocessor Retry
   *
   * The contract calls FHE.makePubliclyDecryptable(matched) in resolveApplication(),
   * so we use instance.publicDecrypt() which does NOT require per-user ACL permission.
   *
   * The Zama coprocessor processes ACL flags asynchronously, so after resolveApplication()
   * is mined, the public decryptability flag may not be synced yet. We retry with
   * exponential backoff to handle this propagation delay.
   */
  const decryptEbool = useCallback(async (handle, _walletClient, onProgress) => {
    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }
    if (!instance) throw new Error("FHE instance not initialized.");

    const MAX_RETRIES = 5;
    const INITIAL_DELAY_MS = 5000; // 5 seconds
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
          const delaySec = Math.round(delayMs / 1000);
          console.log(`[useFhevm] Retry ${attempt}/${MAX_RETRIES} - waiting ${delaySec}s for coprocessor sync...`);
          if (onProgress) onProgress(`Waiting for coprocessor sync (${delaySec}s)... attempt ${attempt + 1}/${MAX_RETRIES}`);
          await new Promise(r => setTimeout(r, delayMs));
        }

        // publicDecrypt accepts an array of handle bytes32 hex strings
        const decryptedResults = await instance.publicDecrypt([handle]);

        // clearValues maps handle hex → cleartext value
        const resultValue = decryptedResults.clearValues[handle];
        if (resultValue === undefined) {
          const keys = Object.keys(decryptedResults.clearValues);
          if (keys.length > 0) {
            return BigInt(decryptedResults.clearValues[keys[0]]) === 1n;
          }
          throw new Error("No decrypted value returned for handle.");
        }
        return BigInt(resultValue) === 1n;
      } catch (err) {
        lastError = err;
        const msg = err?.message || '';
        // Only retry if the error is a coprocessor ACL propagation delay
        if (msg.includes('not allowed for public decryption') || msg.includes('not_ready_for_decryption')) {
          console.warn(`[useFhevm] Coprocessor not ready yet (attempt ${attempt + 1}/${MAX_RETRIES}):`, msg);
          continue;
        }
        // For any other error, fail immediately
        console.error('[useFhevm] Public decryption failed (non-retryable):', err);
        throw err;
      }
    }

    // All retries exhausted
    console.error('[useFhevm] Public decryption failed after all retries:', lastError);
    throw new Error(
      `Coprocessor still processing. The FHE result is not yet available for decryption. ` +
      `Please wait ~30 seconds after "Run FHE Match" and try again.`
    );
  }, []);

  /**
   * encryptUint8
   * Encrypts a small uint value (0-255) for experience years or ratings.
   */
  const encryptUint8 = useCallback(async (value, userAddress) => {
    if (!userAddress) throw new Error("User address required for encryption");

    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }
    if (!instance) throw new Error("FHE instance not initialized. Cannot encrypt.");

    const encrypt = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
    encrypt.add8(BigInt(value));
    const result = await encrypt.encrypt();
    return { handle: result.handles[0], inputProof: result.inputProof };
  }, []);

  /**
   * encryptBool
   * Encrypts a boolean value for remote preference.
   */
  const encryptBool = useCallback(async (value, userAddress) => {
    if (!userAddress) throw new Error("User address required for encryption");

    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }
    if (!instance) throw new Error("FHE instance not initialized. Cannot encrypt.");

    const encrypt = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
    encrypt.addBool(value);
    const result = await encrypt.encrypt();
    return { handle: result.handles[0], inputProof: result.inputProof };
  }, []);

  /**
   * encryptJobPostingInputs
   *
   * CRITICAL: The contract's createJobPosting() calls Impl.verify() three times
   * with the SAME inputProof parameter. All three encrypted values (budget as uint64,
   * experience as uint8, remoteOk as bool) must be encrypted in a SINGLE
   * createEncryptedInput() call so they share one proof.
   *
   * Returns { budgetHandle, expHandle, remoteHandle, inputProof }
   */
  const encryptJobPostingInputs = useCallback(async (budgetValue, experienceValue, remoteValue, userAddress) => {
    if (!userAddress) throw new Error("User address required for encryption");

    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }
    if (!instance) throw new Error("FHE instance not initialized. Cannot encrypt.");

    const encrypt = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
    encrypt.add64(BigInt(budgetValue));
    encrypt.add8(BigInt(experienceValue));
    encrypt.addBool(remoteValue);
    const result = await encrypt.encrypt();

    return {
      budgetHandle: result.handles[0],
      expHandle: result.handles[1],
      remoteHandle: result.handles[2],
      inputProof: result.inputProof,
    };
  }, []);

  /**
   * encryptApplicationInputs
   *
   * Same pattern for candidate applications - bundles salary expectation,
   * experience, and remote preference into a single encrypted input.
   *
   * Returns { salaryHandle, expHandle, remoteHandle, inputProof }
   */
  const encryptApplicationInputs = useCallback(async (salaryValue, experienceValue, remoteValue, userAddress) => {
    if (!userAddress) throw new Error("User address required for encryption");

    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }
    if (!instance) throw new Error("FHE instance not initialized. Cannot encrypt.");

    const encrypt = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
    encrypt.add64(BigInt(salaryValue));
    encrypt.add8(BigInt(experienceValue));
    encrypt.addBool(remoteValue);
    const result = await encrypt.encrypt();

    return {
      salaryHandle: result.handles[0],
      expHandle: result.handles[1],
      remoteHandle: result.handles[2],
      inputProof: result.inputProof,
    };
  }, []);

  /**
   * decryptUint8 - Public Decryption for match scores
   * Same retry logic as decryptEbool but returns the raw uint8 value.
   */
  const decryptUint8 = useCallback(async (handle, _walletClient, onProgress) => {
    let instance = fhevmInstance;
    if (!instance && initPromise) {
      instance = await initPromise.catch(() => null);
    }
    if (!instance) throw new Error("FHE instance not initialized.");

    const MAX_RETRIES = 5;
    const INITIAL_DELAY_MS = 5000;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
          const delaySec = Math.round(delayMs / 1000);
          if (onProgress) onProgress(`Waiting for coprocessor sync (${delaySec}s)... attempt ${attempt + 1}/${MAX_RETRIES}`);
          await new Promise(r => setTimeout(r, delayMs));
        }

        const decryptedResults = await instance.publicDecrypt([handle]);
        const resultValue = decryptedResults.clearValues[handle];
        if (resultValue === undefined) {
          const keys = Object.keys(decryptedResults.clearValues);
          if (keys.length > 0) return Number(decryptedResults.clearValues[keys[0]]);
          throw new Error("No decrypted value returned for handle.");
        }
        return Number(resultValue);
      } catch (err) {
        lastError = err;
        const msg = err?.message || '';
        if (msg.includes('not allowed for public decryption') || msg.includes('not_ready_for_decryption')) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Coprocessor still processing. Please wait and try again.`);
  }, []);

  return {
    isReady: true,
    fheLoaded,
    initError,
    initStage,
    encryptUint64,
    encryptUint8,
    encryptBool,
    encryptJobPostingInputs,
    encryptApplicationInputs,
    decryptEbool,
    decryptUint8,
    instance: fhevmInstance,
  };
}
