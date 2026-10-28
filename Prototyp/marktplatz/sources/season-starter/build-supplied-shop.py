"""r14: supplied Halloween shop + ONLY largest connected cat + candy cauldron."""
import bpy,bmesh,json,shutil,tempfile,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'sources/season-starter';OUT=ROOT/'assets/season-starter'
tempfile.tempdir=str(SRC/'export-tmp');Path(tempfile.tempdir).mkdir(exist_ok=True)
BENCH=OUT/'bench/custom-stand-r1';BENCH.mkdir(parents=True,exist_ok=True)
for name in ['spooky-stand.glb','spooky-stand-shell.glb','halloween-cat-mascot.glb','model-audit.json','browser-audit.json','stand-preview.png']:
 if (OUT/name).exists() and not (BENCH/name).exists():shutil.copy2(OUT/name,BENCH/name)
if not (SRC/'custom-stand-r1.blend').exists():shutil.copy2(SRC/'spooky-stand.blend',SRC/'custom-stand-r1.blend')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
if hasattr(bpy.context.preferences.filepaths,'file_preview_type'):bpy.context.preferences.filepaths.file_preview_type='NONE'
bpy.context.scene.unit_settings.system='METRIC'
sources={}

def bounds(objects):
 bpy.context.view_layer.update();ps=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 return Vector([min(p[i] for p in ps) for i in range(3)]),Vector([max(p[i] for p in ps) for i in range(3)])
def load(key,filename):
 original=Path('C:/Users/Thomas/Downloads')/filename;copy=SRC/filename
 if not copy.exists():shutil.copy2(original,copy)
 sources[key]={'file':filename,'sha256':hashlib.sha256(copy.read_bytes()).hexdigest()}
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(copy))
 objects=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
 for o in objects:
  o.data.transform(o.matrix_world);o.matrix_world.identity();o.name=key
  for m in o.data.materials:
   if m and m.use_nodes:
    for n in m.node_tree.nodes:
     if n.type=='TEX_IMAGE' and n.image:
      image=n.image
      if max(image.size)>1024:
       f=1024/max(image.size);image.scale(max(1,round(image.size[0]*f)),max(1,round(image.size[1]*f)))
      image.pack()
 return objects
def normalize(objects,height):
 lo,hi=bounds(objects);scale=height/(hi.z-lo.z);center=(lo+hi)/2
 for o in objects:
  for v in o.data.vertices:v.co=(v.co-Vector((center.x,center.y,lo.z)))*scale
 bpy.context.view_layer.update()
def place(objects,x,y):
 for o in objects:o.location=Vector((x,y,0))
def export(objects,file):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(OUT/file),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_image_format='JPEG',export_jpeg_quality=90)
def count(objects):
 total=0
 for o in objects:o.data.calc_loop_triangles();total+=len(o.data.loop_triangles)
 return total

shop=load('HalloweenShop','halloween+shop+3d+model.glb');normalize(shop,3.6);export(shop,'halloween-shop.glb')
cat=load('LargeHalloweenCat','halloween+cat+3d+model_Clone1.glb')
assert len(cat)==1
obj=cat[0];verts=obj.data.vertices;parent=list(range(len(verts)))
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
def union(a,b):parent[find(a)]=find(b)
positions={}
for v in verts:
 p=tuple(round(c,5) for c in v.co)
 if p in positions:union(v.index,positions[p])
 else:positions[p]=v.index
for e in obj.data.edges:union(*e.vertices)
groups={}
for v in verts:groups.setdefault(find(v.index),[]).append(v.index)
largest=max(groups.values(),key=len);keep=set(largest)
assert len(largest)==5076,'Unexpected reference revision; do not select arbitrary islands'
bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(obj.data);bm.free();obj.data.update()
normalize(cat,1.15);export(cat,'halloween-cat-large.glb');place(cat,-.55,-1.86)
cauldron=load('CandyCauldron','halloween+candy+cauldron+3d+model.glb');normalize(cauldron,1.0);export(cauldron,'halloween-candy-cauldron.glb');place(cauldron,1.15,-1.90)
parts=shop+cat+cauldron
export(parts,'halloween-shop-event.glb')
lo,hi=bounds(parts)
report={'revision':'r14','activeModel':'halloween-shop-event.glb','benched':'bench/custom-stand-r1/','sources':sources,'triangles':count(parts),'materials':len({m for o in parts for m in o.data.materials}),'sourceDimensions':list(hi-lo),'catSelection':{'method':'largest welded-position connectivity island; original UVs preserved','retainedLogicalComponents':1,'retainedSourceVertices':len(largest),'removedOtherIslands':len(groups)-1,'triangles':count(cat)},'placements':{'shop':[0,0,0],'cat':[-.55,0,1.86],'candyCauldron':[1.15,0,1.90]},'textures':[{'name':i.name,'size':list(i.size)}for i in bpy.data.images if i.type=='IMAGE'],'artisticApproval':'user-review-pending'}
assert report['materials']==3
assert report['triangles']<25000
# Deliberately separate placement footprints: shop behind cat and candy cauldron.
shoplo,shophi=bounds(shop);catlo,cathi=bounds(cat);potlo,pothi=bounds(cauldron)
assert cathi.y<shoplo.y and pothi.y<shoplo.y,'Foreground props must not intersect shop'
assert cathi.x<potlo.x,'Mascot and cauldron must not intersect'
for objects in [shop,cat,cauldron]:assert abs(bounds(objects)[0].z)<.001
report['contactAndClearanceVerified']=True
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'halloween-shop-event.blend'),compress=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'halloween-shop-event.glb'));reimport=[o for o in bpy.context.scene.objects if o.type=='MESH'];a,b=bounds(reimport)
assert count(reimport)==report['triangles'];assert max(abs(v-w)for v,w in zip(hi-lo,b-a))<.001
report['exportVerified']=True;report['reimportTriangles']=count(reimport);report['reimportDimensions']=list(b-a)
(OUT/'model-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
