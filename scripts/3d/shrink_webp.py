"""Reduz as texturas de um GLB (redimensiona e recomprime em JPEG) e regrava o arquivo."""
import io, json, struct, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
# Tamanho máximo por textura: cor, metal/rugosidade, normal.
MAX = [1024, 1024, 1024]
QUALITY = [84, 80, 88]

b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl])
bin_off = 20 + jl + 8
bl = struct.unpack('<I', b[20 + jl:24 + jl])[0]
binc = b[bin_off:bin_off + bl]

views = j['bufferViews']
image_views = {im['bufferView']: i for i, im in enumerate(j['images'])}
new_bin = bytearray()
for vi, v in enumerate(views):
    data = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    if vi in image_views:
        i = image_views[vi]
        im = Image.open(io.BytesIO(data)); im = im.convert('RGBA' if im.mode in ('RGBA','LA') else 'RGB')
        print('image', i, im.size, end=' -> ')
        m = MAX[i] if i < len(MAX) else 1024
        if max(im.size) > m:
            im = im.resize((m, m) if im.size[0] == im.size[1] else (m, int(im.size[1] * m / im.size[0])), Image.LANCZOS)
        out = io.BytesIO()
        im.save(out, 'WEBP', quality=86, method=6)
        data = out.getvalue()
        j['images'][i]['mimeType'] = 'image/webp'
        print(im.size, len(data))
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
print('total', len(b), '->', len(out))
