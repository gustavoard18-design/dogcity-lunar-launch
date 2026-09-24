"""Remove a base plana (disco) que o TRELLIS gera sob o objeto e regrava o GLB."""
import json, struct, sys
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl])
bl = struct.unpack('<I', b[20 + jl:24 + jl])[0]
binc = bytearray(b[28 + jl:28 + jl + bl])

pr = j['meshes'][0]['primitives'][0]
def view(ai):
    a = j['accessors'][ai]
    bv = j['bufferViews'][a['bufferView']]
    return a, bv, bv.get('byteOffset', 0) + a.get('byteOffset', 0)

pa, _, po = view(pr['attributes']['POSITION'])
P = np.frombuffer(bytes(binc[po:po + pa['count'] * 12]), dtype='<f4').reshape(-1, 3)
ia, ibv, io = view(pr['indices'])
assert ia['componentType'] == 5125
I = np.frombuffer(bytes(binc[io:io + ia['count'] * 4]), dtype='<u4').reshape(-1, 3)

floor = P[:, 1].min()
flat = P[I][:, :, 1].max(axis=1) < floor + 0.004
keep = I[~flat]
print('triangles', len(I), '->', len(keep), '(removidos', int(flat.sum()), ')')

# Novo índice no fim do buffer
new = keep.astype('<u4').tobytes()
while len(binc) % 4:
    binc.append(0)
off = len(binc)
binc += new
j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(new), 'target': 34963})
ia.pop('byteOffset', None)
ia['bufferView'] = len(j['bufferViews']) - 1
ia['count'] = int(keep.size)
# Recalcula limites da posição sem o disco
used = P[np.unique(keep)]
pa['min'] = used.min(0).tolist()
pa['max'] = used.max(0).tolist()
print('bounds', [round(x, 3) for x in pa['min']], [round(x, 3) for x in pa['max']])
while len(binc) % 4:
    binc.append(0)
j['buffers'][0]['byteLength'] = len(binc)

js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4:
    js += b' '
total = 12 + 8 + len(js) + 8 + len(binc)
out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binc), 0x004E4942) + bytes(binc)
open(dst, 'wb').write(out)
print('size', len(out))
