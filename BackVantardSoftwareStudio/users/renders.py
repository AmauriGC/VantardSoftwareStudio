import json

from rest_framework.renderers import BaseRenderer

from .crypto import encrypt_payload


class AESRenderer(BaseRenderer):
    media_type = 'application/json'
    format = 'json'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b''
        ciphertext = encrypt_payload(data)
        return json.dumps({'ciphertext': ciphertext}).encode('utf-8')
