import base64
import json
import os

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from django.conf import settings


def _get_key():
    return settings.AES_SECRET_KEY.encode('utf-8')


def encrypt_payload(data: dict) -> str:
    key = _get_key()
    iv = os.urandom(16)
    plaintext = json.dumps(data).encode('utf-8')
    cipher = AES.new(key, AES.MODE_CBC, iv)
    ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
    return base64.b64encode(iv + ciphertext).decode('utf-8')


def decrypt_payload(ciphertext_b64: str) -> dict:
    key = _get_key()
    raw = base64.b64decode(ciphertext_b64)
    iv, ciphertext = raw[:16], raw[16:]
    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
    return json.loads(plaintext.decode('utf-8'))
