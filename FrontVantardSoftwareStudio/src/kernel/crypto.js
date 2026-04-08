import CryptoJS from 'crypto-js';

const KEY = CryptoJS.enc.Utf8.parse(import.meta.env.VITE_AES_KEY);

export function encryptPayload(data) {
  const plaintext = JSON.stringify(data);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, KEY, {
    iv,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  // Prefijar IV al ciphertext y codificar todo en base64
  const combined = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(combined);
}

export function decryptPayload(ciphertextB64) {
  const combined = CryptoJS.enc.Base64.parse(ciphertextB64);
  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);
  const decrypted = CryptoJS.AES.decrypt({ ciphertext }, KEY, {
    iv,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}
