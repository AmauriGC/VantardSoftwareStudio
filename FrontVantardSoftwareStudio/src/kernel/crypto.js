const NONCE_SIZE = 12;

let cachedKeyPromise = null;

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCodePoint(...bytes.subarray(i, i + chunkSize));
  }

  return globalThis.btoa(binary);
}

function base64ToBytes(b64) {
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    const codePoint = binary.codePointAt(i);
    bytes[i] = codePoint ?? 0;
  }

  return bytes;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function getAesGcmKey() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto no está disponible en este entorno.");
  }

  const rawKeyStr = import.meta.env.VITE_AES_KEY;
  if (!rawKeyStr) {
    throw new Error("Falta configurar VITE_AES_KEY.");
  }

  if (!cachedKeyPromise) {
    const rawKeyBytes = new TextEncoder().encode(rawKeyStr);
    cachedKeyPromise = globalThis.crypto.subtle.importKey(
      "raw",
      rawKeyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }

  return cachedKeyPromise;
}

export async function encryptPayload(data) {
  const key = await getAesGcmKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  const combined = concatBytes(iv, new Uint8Array(encrypted));
  return bytesToBase64(combined);
}

export async function decryptPayload(ciphertextB64) {
  if (!ciphertextB64) {
    throw new Error("Ciphertext vacío.");
  }

  const key = await getAesGcmKey();
  const combined = base64ToBytes(ciphertextB64);
  if (combined.length < NONCE_SIZE + 16) {
    throw new Error("Ciphertext inválido o incompleto.");
  }

  const iv = combined.slice(0, NONCE_SIZE);
  const data = combined.slice(NONCE_SIZE);

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  const plaintext = new TextDecoder().decode(decrypted);
  return JSON.parse(plaintext);
}
