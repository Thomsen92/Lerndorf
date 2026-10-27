import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
report={}
for key,file in [('cat','halloween+cat+3d+model_Clone1.glb'),('shop','halloween+shop+3d+model.glb'),('cauldron','halloween+candy+cauldron+3d+model.glb')]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath='C:/Users/Thomas/Downloads/'+file)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 entry={'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)],'components':[]}
 for o in meshes:
  verts=o.data.vertices;parent=list(range(len(verts)))
  def find(i):
   while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
   return i
  def union(a,b):parent[find(a)]=find(b)
  positions={}
  for v in verts:
   pos=tuple(round(c,5) for c in v.co)
   if pos in positions:union(v.index,positions[pos])
   else:positions[pos]=v.index
  for e in o.data.edges:union(*e.vertices)
  groups={}
  for v in verts:groups.setdefault(find(v.index),[]).append(v.index)
  for indices in groups.values():
   if len(indices)<8:continue
   ps=[o.matrix_world@verts[i].co for i in indices];lo=[min(p[i] for p in ps) for i in range(3)];hi=[max(p[i] for p in ps) for i in range(3)]
   entry['components'].append({'vertices':len(indices),'min':lo,'max':hi,'root':indices[0]})
 entry['components'].sort(key=lambda c:c['vertices'],reverse=True);report[key]=entry
(ROOT/'sources/season-starter/supplied-models-inspection.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
