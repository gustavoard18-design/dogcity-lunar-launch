"""Puxa os vermelhos da textura de cor do GLB para o laranja Bitcoin (matiz ~28°)."""
import io, json, struct, sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl])
bl = struct.unpack('<I', b[20 + jl:24 + jl])[0]
binc = b[28 + jl:28 + jl + bl]

base_tex = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
t = j['textures'][base_tex]
img_index = t.get('source', t.get('extensions', {}).get('EXT_texture_webp', {}).get('source'))

views = j['bufferViews']
new_bin = bytearray()
for vi, v in enumerate(views):
    data = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    if vi == j['images'][img_index]['bufferView']:
        im = Image.open(io.BytesIO(data)).convert('RGB')
        hsv = np.array(im.convert('HSV')).astype(np.float32)
        h, s, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
        # Matiz do PIL: 0..255. Vermelho ~0-12 ou >245; alvo laranja ~20 (≈28°).
        red = ((h < 14) | (h > 245)) & (s > 90) & (val > 60)
        hh = np.where(h > 128, h - 256, h)
        target = 20.0
        k = np.clip((s - 90) / 60, 0, 1)
        h2 = np.where(red, hh + (target - hh) * k, h)
        hsv[..., 0] = np.mod(h2, 256)
        out_im = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
        buf = io.BytesIO()
        out_im.save(buf, 'WEBP', quality=88, method=6)
        data = buf.getvalue()
        print('recolor pixels', int(red.sum()), 'size', len(data))
    while len(new_bin) % 4:
        new_bin.append(0)
    v['byteOffset'] = len(new_bin)
    v['byteLength'] = len(data)
    new_bin += data
while len(new_bin) % 4:
    new_bin.append(0)
j['buffers'][0]['byteLength'] = len(new_bin)
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4:
    js += b' '
total = 12 + 8 + len(js) + 8 + len(new_bin)
out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(new_bin), 0x004E4942) + bytes(new_bin)
open(dst, 'wb').write(out)
print('total', len(out))
