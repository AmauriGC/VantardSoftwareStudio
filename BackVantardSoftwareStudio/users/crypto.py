import base64
import json
import os

from Crypto.Cipher import AES
from django.conf import settings


NONCE_SIZE = 12
TAG_SIZE = 16


def _get_key():
    return settings.AES_SECRET_KEY.encode('utf-8')


def encrypt_payload(data: dict) -> str:
    key = _get_key()
    nonce = os.urandom(NONCE_SIZE)
    plaintext = json.dumps(data).encode('utf-8')
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return base64.b64encode(nonce + ciphertext + tag).decode('utf-8')


def decrypt_payload(ciphertext_b64: str) -> dict:
    key = _get_key()
    raw = base64.b64decode(ciphertext_b64, validate=True)
    if len(raw) < (NONCE_SIZE + TAG_SIZE):
        raise ValueError('Ciphertext inválido o incompleto.')

    nonce = raw[:NONCE_SIZE]
    tag = raw[-TAG_SIZE:]
    ciphertext = raw[NONCE_SIZE:-TAG_SIZE]

    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    return json.loads(plaintext.decode('utf-8'))
