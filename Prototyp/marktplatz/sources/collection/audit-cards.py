"""Reimport the actual GLB files in isolated Blender; compare to source audit."""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'assets/collection'
catalog=json.loads((ASSETS/'catalog.json').read_text(encoding='utf-8'))
source_report=json.loads((ASSETS/'model-audit.json').read_text(encoding='utf-8'))
source={c['id']:c for c in source_report['models']}
motif_source={c['id']:c for c in source_report.get('motifs',[])}
report=[]
for card in catalog['cards']:
    if card.get('format')=='printed-surface':continue
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ASSETS/card['model']))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
    dimensions=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
    triangles=0; materials=set(); images=set(); printed_normals=[]
    for obj in meshes:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        for mat in obj.data.materials:
            if not mat:continue
            materials.add(mat.name)
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type=='TEX_IMAGE' and node.image:images.add(tuple(node.image.size))
            if 'printed_atlas' in mat.name:
                assert obj.data.uv_layers.active is not None, card['id']+' missing print UVs'
                printed_normals.extend((obj.matrix_world.to_3x3()@p.normal).normalized().y for p in obj.data.polygons)
    assert triangles==source[card['id']]['triangles'],card['id']+' triangle mismatch'
    assert triangles<=4000 and len(materials)<=8,card['id']+' exceeds budget'
    assert all(max(size)<=1024 for size in images),card['id']+' texture too large'
    assert all(abs(a-b)<1e-5 for a,b in zip(dimensions,source[card['id']]['sourceSizeXYZ'])),card['id']+' size mismatch'
    assert any(n<-.99 for n in printed_normals) and any(n>.99 for n in printed_normals),card['id']+' missing front/back print'
    report.append({'id':card['id'],'triangles':triangles,'materials':len(materials),'textures':list(images),'dimensionsXYZ':dimensions,'frontAndBack':True,'sourceMatchesExport':True})
motif_report=[]
for card in catalog['cards']:
    if card.get('format')=='printed-surface':continue
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ASSETS/card['motifModel']))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    dimensions=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
    triangles=0;materials=set()
    for obj in meshes:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles);materials.update(m.name for m in obj.data.materials if m)
    assert triangles==motif_source[card['id']]['triangles'] and 0<triangles<=4000,card['id']+' motif triangle mismatch/budget'
    assert len(materials)<=8 and min(dimensions)>0,card['id']+' invalid motif'
    assert all(abs(a-b)<1e-5 for a,b in zip(dimensions,motif_source[card['id']]['sourceSizeXYZ'])),card['id']+' motif size mismatch'
    motif_report.append({'id':card['id'],'triangles':triangles,'materials':len(materials),'dimensionsXYZ':dimensions,'sourceMatchesExport':True})
(ASSETS/'export-audit.json').write_text(json.dumps({'success':True,'models':report,'motifs':motif_report,'visualReview':'User review pending'},indent=2)+'\n',encoding='utf-8')
print('EXPORT_AUDIT_PASSED',len(report),'cards',len(motif_report),'motifs')
