"""Extract the supplied Empire State mesh; run in isolated background Blender.

blender --background --factory-startup --disable-autoexec --python-exit-code 1
  --python web/scripts/assets/extract-ollie-empire.py
Original input is read only. No internet or application session is used.
"""
import bpy
import hashlib
import json
import shutil
import struct
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(r'C:/Users/Thomas/Downloads/new_york_buildings.glb')
PACKAGE = ROOT / 'content/quests/empire-source'
EVIDENCE = ROOT / 'web/test-results/empire-souvenir'
EXPORT = ROOT / 'web/public/assets/shop/ollie-empire-state.glb'
for directory in [PACKAGE, EVIDENCE, EXPORT.parent]:
    directory.mkdir(parents=True, exist_ok=True)
source_bytes = SOURCE.read_bytes()
json_chunk_length = struct.unpack_from('<I', source_bytes, 12)[0]
source_asset = json.loads(source_bytes[20:20+json_chunk_length])['asset']
credits = source_asset['extras']
assert credits['author'] == 'sumitmangela (https://sketchfab.com/sumitmangela)'
assert credits['license'] == 'CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)'
assert credits['source'] == 'https://sketchfab.com/3d-models/new-york-buildings-e7922fe0f7b14ed786f84529f9217dac'
(PACKAGE/'source-attribution.json').write_text(json.dumps(source_asset, indent=2), encoding='utf-8')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def bounds(objects):
    pts = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

def audit(objects):
    lo, hi = bounds(objects)
    return dict(dimensions_blender_xyz=list(hi-lo), minimum=list(lo), maximum=list(hi),
                triangles=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons),
                materials=sorted({m.name for o in objects for m in o.data.materials}),
                meshes=len(objects), uv_layers=[len(o.data.uv_layers) for o in objects])

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
originals = list(bpy.context.scene.objects)
archive = bpy.data.collections.new('Source_NYC_Complete_Hidden')
bpy.context.scene.collection.children.link(archive)
for obj in originals:
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    archive.objects.link(obj)
original = next(o for o in originals if o.type == 'MESH' and any(m.name == 'empire_state' for m in o.data.materials))
asset = bpy.data.collections.new('Ollie_Empire_State')
bpy.context.scene.collection.children.link(asset)
empire = original.copy()
empire.data = original.data.copy()
asset.objects.link(empire)
empire.matrix_world = original.matrix_world.copy()
empire.parent = None
empire.name = 'Ollie_Empire_State'
for key, value in credits.items():
    empire[key] = value
empire['changes'] = 'Empire State isolated; other buildings retained hidden in editable source; centered horizontally, base zero, uniformly scaled to 1.8 m height.'
empire.data.transform(empire.matrix_world)
empire.matrix_world = Matrix.Identity(4)
empire.data.update()
bpy.context.view_layer.update()
lo, hi = bounds([empire])
scale = 1.8 / (hi.z-lo.z)
center = Vector(((lo.x+hi.x)/2, (lo.y+hi.y)/2, lo.z))
empire.data.transform(Matrix.Diagonal((scale,scale,scale,1)) @ Matrix.Translation(-center))
empire.data.update()
bpy.context.view_layer.update()
for slot in empire.material_slots:
    slot.material = slot.material.copy()
    slot.material.name = 'Ollie_Empire_State_Source_Material'
    for node in slot.material.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            image = node.image.copy()
            node.image = image
            if max(image.size) > 1024:
                ratio = 1024/max(image.size)
                image.scale(max(1,round(image.size[0]*ratio)),max(1,round(image.size[1]*ratio)))
            image.pack()
archive.hide_render = True
archive.hide_viewport = True
for image in bpy.data.images:
    if image.type == 'IMAGE' and image.size[0] and not image.packed_file:
        image.pack()
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.ops.object.select_all(action='DESELECT')
empire.select_set(True)
bpy.context.view_layer.objects.active = empire
source_audit = audit([empire])
assert abs(source_audit['dimensions_blender_xyz'][2] - 1.8) < 1e-5
assert abs(source_audit['minimum'][2]) < 1e-5
assert all(abs(source_audit['minimum'][i] + source_audit['maximum'][i]) < 1e-5 for i in (0, 1))
assert source_audit['triangles'] == 1368 and len(source_audit['materials']) == 1
bpy.ops.export_scene.gltf(filepath=str(EXPORT), export_format='GLB', use_selection=True,
                          export_yup=True, export_animations=False, export_cameras=False,
                          export_lights=False, export_extras=True)
lod = EXPORT.with_name('ollie-empire-state.lod.glb')
shutil.copyfile(EXPORT,lod)

stage = bpy.data.collections.new('Review_Stage_Not_Exported')
bpy.context.scene.collection.children.link(stage)
def stage_object(name, data):
    obj=bpy.data.objects.new(name,data)
    stage.objects.link(obj)
    return obj
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=720
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.world.color=(0.22,0.22,0.22)
scene.view_settings.view_transform='AgX'
for name,location,power,size in [('Key',(3,-4,5),450,4),('Fill',(-3,-1,3),180,3),('Rim',(1,4,4),350,3)]:
    light=stage_object(name,bpy.data.lights.new(name,'AREA'))
    light.location=location
    light.data.energy=power
    light.data.shape='DISK'
    light.data.size=size
    light.rotation_euler=(Vector((0,0,0.8))-light.location).to_track_quat('-Z','Y').to_euler()
camera=stage_object('Review_Camera',bpy.data.cameras.new('Review_Camera'))
camera.data.type='ORTHO'
scene.camera=camera
poses={}
def render(name, objects, direction):
    lo,hi=bounds(objects)
    target=(lo+hi)/2
    height=max(hi-lo)
    camera.location=target+Vector(direction)*height
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=height*1.22
    scene.render.filepath=str(EVIDENCE/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    poses[name]=dict(location=list(camera.location),rotation=list(camera.rotation_euler),ortho_scale=camera.data.ortho_scale)

render('selected-front',[empire],(2,-3,1.4))
render('selected-opposite',[empire],(-2,3,1.4))
blend=PACKAGE/'ollie-empire-state.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
# Show the complete provided source without modifying its objects.
empire.hide_render=True
archive.hide_render=False
archive.hide_viewport=False
render('source-all-buildings',[o for o in originals if o.type=='MESH'],(2,-3,1.4))
archive.hide_render=True
archive.hide_viewport=True
# Reimport the actual delivery, and render it with exactly the selected camera framing.
bpy.ops.import_scene.gltf(filepath=str(EXPORT))
export_objects=[o for o in scene.objects if o.type=='MESH' and o not in originals and o != empire]
export_audit=audit(export_objects)
assert export_audit['triangles'] == source_audit['triangles']
assert max(abs(a-b) for a,b in zip(export_audit['dimensions_blender_xyz'], source_audit['dimensions_blender_xyz'])) < 1e-5
render('export-front',export_objects,(2,-3,1.4))
render('export-opposite',export_objects,(-2,3,1.4))
report=dict(source_input=str(SOURCE),source_input_sha256=digest(SOURCE),native_file=str(blend),native_sha256=digest(blend),
 export=str(EXPORT),export_sha256=digest(EXPORT),bytes=EXPORT.stat().st_size,lod_sha256=digest(lod),
 source=source_audit,reimported_export=export_audit,cameras=poses,
 images=[dict(name=n.image.name,size=list(n.image.size)) for m in empire.data.materials for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image],
 license=credits['license'], attribution=credits,
 note='LOD intentionally identical: source is already 1368 triangles; no destructive decimation. Original source retained hidden in editable blend.')
(PACKAGE/'audit-r01.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('EMPIRE_REPORT',json.dumps(report))
