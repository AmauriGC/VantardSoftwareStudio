import CryptoJS from 'crypto-js';

const KEY = CryptoJS.enc.Utf8.parse(import.meta.env.VITE_AES_KEY);
const IV  = CryptoJS.enc.Utf8.parse(import.meta.env.VITE_AES_IV);

export function encryptPayload(data) {
  const plaintext = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(plaintext, KEY, {
    iv:      IV,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString(); // base64
}

export function decryptPayload(ciphertextB64) {
  const decrypted = CryptoJS.AES.decrypt(ciphertextB64, KEY, {
    iv:      IV,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}
