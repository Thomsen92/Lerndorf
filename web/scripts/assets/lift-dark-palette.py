"""Lifts the near-black grey cells of the embedded 32x32 palette of retro monitor GLBs.

monitor-01.glb and tv-crt-07.glb map almost all faces onto the darkest grey cells of the shared
MasterMaterial palette, so in the shop they showed as a black silhouette (teacher, 28.10.2026).
This rewrites only the palette image (appended as a new buffer view); geometry stays untouched.
Run once: python3 web/scripts/assets/lift-dark-palette.py web/public/assets/shop/monitor-01.glb ...
"""
import io
import json
import struct
import sys

from PIL import Image

LIFT = {0: (34, 36, 44), 1: (128, 130, 138), 2: (112, 112, 118), 3: (104, 104, 110)}


def lift(path: str) -> None:
    data = open(path, 'rb').read()
    json_len = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len + 8
    bin_len = struct.unpack('<I', data[20 + json_len:24 + json_len])[0]
    binary = bytearray(data[bin_start:bin_start + bin_len])
    image = gltf['images'][0]
    view = gltf['bufferViews'][image['bufferView']]
    start = view.get('byteOffset', 0)
    png = Image.open(io.BytesIO(bytes(binary[start:start + view['byteLength']]))).convert('RGBA')
    w, h = png.size
    for row in range(0, 2):  # glTF textures are not flipped: v near 0 is the top of the image
        for col, colour in LIFT.items():
            r, g, b, a = png.getpixel((col, row))
            if r + g + b < 3 * 110:
                png.putpixel((col, row), (*colour, a))
    out = io.BytesIO()
    png.save(out, 'PNG')
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    binary += out.getvalue()
    while len(binary) % 4:
        binary.append(0)
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(out.getvalue())})
    image['bufferView'] = len(gltf['bufferViews']) - 1
    gltf['buffers'][0]['byteLength'] = len(binary)
    text = json.dumps(gltf, separators=(',', ':')).encode()
    while len(text) % 4:
        text += b' '
    total = 12 + 8 + len(text) + 8 + len(binary)
    glb = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(text), b'JSON') + text
    glb += struct.pack('<I4s', len(binary), b'BIN\x00') + bytes(binary)
    open(path, 'wb').write(glb)
    print('lifted', path, len(glb), 'bytes')


for p in sys.argv[1:]:
    lift(p)
