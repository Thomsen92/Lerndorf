"""Resize only generated wardrobe textures; never touch supplied source models."""
import io,json,struct
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'public/assets'
paths=list((root/'characters/wardrobe').rglob('*.glb'))+list((root/'wardrobe').glob('*.glb'))
for p in paths:
    original=p.read_bytes(); size=struct.unpack_from('<I',original,12)[0]
    doc=json.loads(original[20:20+size]); binary=original[28+size:]
    replacements={}
    linear=set()
    for mat in doc.get('materials',[]):
        for tex in [mat.get('normalTexture'),mat.get('occlusionTexture'),mat.get('pbrMetallicRoughness',{}).get('metallicRoughnessTexture')]:
            if tex: linear.add(doc['textures'][tex['index']]['source'])
    for i,img in enumerate(doc.get('images',[])):
        if 'bufferView' not in img: continue
        view=doc['bufferViews'][img['bufferView']];start=view.get('byteOffset',0)
        im=Image.open(io.BytesIO(binary[start:start+view['byteLength']]))
        im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        out=io.BytesIO()
        if i not in linear and ('A' not in im.getbands() or im.getchannel('A').getextrema()==(255,255)):
            im.convert('RGB').save(out,format='JPEG',quality=88,optimize=True);img['mimeType']='image/jpeg'
        else:
            im.save(out,format='PNG',optimize=True);img['mimeType']='image/png'
        replacements[img['bufferView']]=out.getvalue()
    chunks=[];offset=0
    for i,view in enumerate(doc.get('bufferViews',[])):
        start=view.get('byteOffset',0);chunk=replacements.get(i,binary[start:start+view['byteLength']])
        pad=(-offset)%4;chunks.append(bytes(pad));offset+=pad
        view['byteOffset']=offset;view['byteLength']=len(chunk);chunks.append(chunk);offset+=len(chunk)
    packed=b''.join(chunks);doc['buffers']=[{'byteLength':len(packed)}]
    text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4);packed+=bytes((-len(packed))%4)
    result=struct.pack('<III',0x46546c67,2,28+len(text)+len(packed))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(packed),0x004e4942)+packed
    p.write_bytes(result);print(f'{p.name}: {len(original)} -> {len(result)}')
