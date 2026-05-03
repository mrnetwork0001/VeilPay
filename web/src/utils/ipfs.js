/**
 * uploadToIPFS — Upload a file to IPFS via a public pinning gateway.
 *
 * Uses web3.storage / Pinata-compatible IPFS HTTP API.
 * Falls back to a local simulation if no API key is configured.
 *
 * Set VITE_PINATA_JWT in .env to enable real uploads.
 *
 * @param {File} file - The file to upload
 * @returns {Promise<{ cid: string, url: string }>}
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_API = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

/**
 * Upload to IPFS via Pinata
 */
async function pinataUpload(file) {
  const formData = new FormData();
  formData.append('file', file);

  // Optional: add metadata
  const metadata = JSON.stringify({
    name: `VeilPay-Resume-${Date.now()}`,
    keyvalues: {
      app: 'VeilPay',
      type: 'resume',
      uploadedAt: new Date().toISOString(),
    },
  });
  formData.append('pinataMetadata', metadata);

  // Pin options
  const options = JSON.stringify({ cidVersion: 1 });
  formData.append('pinataOptions', options);

  const response = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    url: `${PINATA_GATEWAY}/${data.IpfsHash}`,
    size: data.PinSize,
    size: data.PinSize,
  };
}


/**
 * Main upload function — uses Pinata if configured, otherwise demo mode
 */
export async function uploadToIPFS(file) {
  if (!file) throw new Error('No file provided');

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PDF and DOC/DOCX files are supported');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size must be under 10MB');
  }

  if (!PINATA_JWT) {
    throw new Error('IPFS upload failed: VITE_PINATA_JWT is not configured.');
  }

  console.log(`[IPFS] Uploading ${file.name} (${(file.size / 1024).toFixed(1)}KB) to Pinata...`);
  return pinataUpload(file);
}

/**
 * Upload an image to IPFS (for company logos)
 * Accepts common image formats: PNG, JPG, GIF, SVG, WebP
 */
export async function uploadImageToIPFS(file) {
  if (!file) throw new Error('No file provided');

  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PNG, JPG, GIF, SVG, and WebP images are supported');
  }

  // Validate file size (max 5MB for logos)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image size must be under 5MB');
  }

  if (!PINATA_JWT) {
    throw new Error('IPFS upload failed: VITE_PINATA_JWT is not configured.');
  }

  console.log(`[IPFS] Uploading logo ${file.name} (${(file.size / 1024).toFixed(1)}KB) to Pinata...`);
  return pinataUpload(file);
}

/**
 * Check if real IPFS is configured
 */
export function isIPFSConfigured() {
  return !!PINATA_JWT;
}
