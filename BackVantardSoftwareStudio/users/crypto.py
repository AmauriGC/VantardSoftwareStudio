import base64
import json

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from django.conf import settings


def _get_key_iv():
    key = settings.AES_SECRET_KEY.encode('utf-8')
    iv  = settings.AES_IV.encode('utf-8')
    return key, iv


def encrypt_payload(data: dict) -> str:
    key, iv = _get_key_iv()
    plaintext = json.dumps(data).encode('utf-8')
    cipher = AES.new(key, AES.MODE_CBC, iv)
    ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
    return base64.b64encode(ciphertext).decode('utf-8')


def decrypt_payload(ciphertext_b64: str) -> dict:
    key, iv = _get_key_iv()
    ciphertext = base64.b64decode(ciphertext_b64)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
    return json.loads(plaintext.decode('utf-8'))
