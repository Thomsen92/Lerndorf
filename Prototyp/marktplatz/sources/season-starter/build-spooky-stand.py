"""Isolated Blender builder. Writes only Prototyp/marktplatz, never the user's open scene."""
import bpy, math, json, shutil, hashlib, tempfile
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'sources/season-starter'
OUT = ROOT / 'assets/season-starter/bench/custom-stand-r1'
OUT.mkdir(parents=True, exist_ok=True)
TEMP = SRC / 'export-tmp'
TEMP.mkdir(exist_ok=True)
tempfile.tempdir = str(TEMP)
ORIGINAL = Path('C:/Users/Thomas/Downloads/halloween+cat+3d+model_Clone1.glb')
COPY = SRC / 'halloween-cat-original.glb'
if not COPY.exists(): shutil.copy2(ORIGINAL, COPY)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.preferences.filepaths.save_version = 0
if hasattr(bpy.context.preferences.filepaths,'file_preview_type'):bpy.context.preferences.filepaths.file_preview_type='NONE'

def bounds(objects):
    bpy.context.view_layer.update()
    pts=[o.matrix_world @ Vector(v) for o in objects if o.type=='MESH' for v in o.bound_box]
    return Vector(tuple(min(p[i] for p in pts) for i in range(3))), Vector(tuple(max(p[i] for p in pts) for i in range(3)))

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    if objects: bpy.context.view_layer.objects.active=objects[0]

def export(objects, name):
    select(objects)
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_image_format='JPEG',export_jpeg_quality=90)

# The supplied Tripo cat keeps its geometry and authored PBR maps.
bpy.ops.import_scene.gltf(filepath=str(COPY))
cat=[o for o in bpy.context.scene.objects if o.type=='MESH']
lo,hi=bounds(cat); original_dimensions=list(hi-lo)
factor=1.08/(hi.z-lo.z)
center=(lo+hi)/2
for o in cat:
    world=o.matrix_world.copy()
    o.data.transform(world)
    o.matrix_world.identity()
    for v in o.data.vertices:
        v.co=(v.co-Vector((center.x,center.y,lo.z)))*factor
    o.name='Mascot_HalloweenCat'
    for m in o.data.materials:
        if m and m.use_nodes:
            for node in m.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image:
                    image=node.image
                    if max(image.size)>1024:
                        f=1024/max(image.size); image.scale(max(1,round(image.size[0]*f)),max(1,round(image.size[1]*f)))
                    image.pack()
export(cat,'halloween-cat-mascot.glb')
for o in cat: o.location=Vector((-.68,-.12,1.19))
cat_contact=bounds(cat)[0].z
assert abs(cat_contact-1.19)<.001

def linear(c): return c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4
def material(name,hexcolor,emission=False):
    m=bpy.data.materials.new(name);m.use_nodes=True
    color=tuple(linear(int(hexcolor[i:i+2],16)/255) for i in (1,3,5))+(1,)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=.88
    m.diffuse_color=color
    if emission:
        p.inputs['Emission Color'].default_value=color;p.inputs['Emission Strength'].default_value=2
    return m
wood=material('Warm chestnut timber','#8a5a36')
edge=material('Darker timber and iron','#584136')
purple=material('Plum canvas','#684e83')
cream=material('Ivory canvas and lettering','#f5e9ce')
gold=material('Fairground ochre trim','#d6a34f')
orange=material('Pumpkin orange','#cb713d')
green=material('Pumpkin stems','#637649')
glow=material('Warm lantern glow','#ffc56b',True)
own=[]

def box(name,loc,size,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);own.append(o)
    if bevel:
        mod=o.modifiers.new('Small crafted edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def beam(name,a,b,width,mat):
    a,b=Vector(a),Vector(b);o=box(name,(a+b)/2,(width,width,(b-a).length),mat)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat);own.append(o);return o

font_path='C:/Windows/Fonts/arialbd.ttf'
font=bpy.data.fonts.load(font_path) if Path(font_path).exists() else None
def text(name,body,loc,size,mat,maxwidth=None):
    data=bpy.data.curves.new(name,'FONT');data.body=body;data.align_x='CENTER';data.align_y='CENTER';data.size=size;data.resolution_u=2
    if font:data.font=font
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);data.materials.append(mat)
    bpy.context.view_layer.update()
    if maxwidth and o.dimensions.x>maxwidth:o.scale*=maxwidth/o.dimensions.x
    select([o]);bpy.ops.object.convert(target='MESH');own.append(o);return o

box('Timber deck',(0,0,.105),(3.84,2.46,.21),edge,.035)
for i in range(9):box('Deck board',(-1.69+i*.422,0,.228),(.405,2.38,.05),wood,.008)
for x in [-1.63,1.63]:
    for y in [-.85,.89]:
        box('Canopy post',(x,y,1.56),(.14,.14,2.63),wood,.014)
        box('Post foot',(x,y,.40),(.24,.24,.27),edge,.018)
        box('Post gold collar',(x,y,2.63),(.18,.18,.10),gold)
    beam('Side bracing',(x,.89,2.15),(x,.37,2.78),.09,edge)
beam('Rear cross brace',(-1.5,.89,.48),(1.5,.89,1.85),.08,edge)
box('Counter body',(0,-.41,.73),(3.2,1.02,.86),wood,.02)
for x in [-1.48,0,1.48]:box('Counter stile',(x,-.94,.73),(.08,.06,.78),edge)
box('Counter lower rail',(0,-.94,.34),(3.17,.06,.12),edge)
box('Thick countertop',(0,-.39,1.14),(3.42,1.18,.10),wood,.025)
box('Counter gold edge',(0,-1.004,1.14),(3.3,.025,.035),gold)
box('Front plum sign',(0,-.99,.76),(2.8,.045,.58),purple,.025)
text('Quiz title','SPOOKY ENGLISH QUIZ',(0,-1.018,.83),.19,cream,2.54)
text('LearnPass front line','10 QUESTIONS  /  150 XP',(0,-1.02,.63),.105,gold,2.4)

# A pitched striped canvas canopy with visible supporting rafters and scalloped valance.
for x in [-1.63,0,1.63]:
    beam('Front roof rafter',(x,-1.14,2.80),(x,0,3.35),.09,edge)
    beam('Back roof rafter',(x,0,3.35),(x,1.14,2.80),.09,edge)
beam('Roof ridge',(-1.9,0,3.35),(1.9,0,3.35),.09,wood)
for i in range(8):
    x=-1.94+i*.485; mat=purple if i%2==0 else cream
    mesh('Striped canvas roof',[(x,-1.18,2.82),(x+.485,-1.18,2.82),(x+.485,0,3.39),(x,0,3.39),(x,1.18,2.82),(x+.485,1.18,2.82)],[(0,1,2,3),(3,2,5,4)],mat)
    for y,rev in [(-1.18,False),(1.18,True)]:
        coords=[(x,y,2.84),(x+.485,y,2.84),(x+.485,y,2.62),(x+.35,y,2.55),(x+.135,y,2.55),(x,y,2.62)]
        mesh('Scalloped valance',coords,[tuple(range(6))],mat)
box('Season sign timber',(0,-1.22,3.25),(2.92,.11,.72),edge,.035)
box('Season sign face',(0,-1.285,3.25),(2.76,.035,.58),purple,.02)
text('Season heading','SEASON I',(0,-1.311,3.35),.32,cream,2.43)
text('Halloween heading','H A L L O W E E N',(0,-1.311,3.10),.135,gold,2.43)
for x in [-1.35,1.35]:
    box('Sign gold stud',(x,-1.314,3.25),(.04,.025,.04),gold)
    beam('Lantern cord',(x,-1.03,2.76),(x,-1.03,2.45),.025,edge)
    box('Lantern cap',(x,-1.03,2.42),(.30,.25,.075),edge,.014)
    box('Lantern luminous body',(x,-1.03,2.23),(.24,.20,.30),glow,.025)
    box('Lantern foot',(x,-1.03,2.04),(.30,.25,.07),edge,.01)
    for dx in [-.12,.12]:
        for dy in [-.1,.1]:box('Lantern corner',(x+dx,-1.03+dy,2.23),(.025,.025,.33),gold)

def pumpkin(name,loc,r):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=(r,r,r*.8)
    for v in o.data.vertices:
        a=math.atan2(v.co.y,v.co.x);f=1+.075*math.cos(6*a);v.co.x*=f;v.co.y*=f
    o.data.materials.append(orange);own.append(o)
    stem=box('Pumpkin stem',(loc[0],loc[1],loc[2]+r*.84),(.10*r/.3,.09*r/.3,.22*r/.3),green,.01);stem.rotation_euler.y=.2
    # Deliberately surface-mounted face triangles, never a second intersecting pumpkin.
    for dx in [-.34,.34]:
        x=loc[0]+r*dx;z=loc[2]+r*.14;y=loc[1]-r*.94
        mesh('Pumpkin glowing eye',[(x-r*.13,y,z-r*.1),(x+r*.13,y,z-r*.1),(x,y,z+r*.16)],[(0,1,2)],glow)
    x,y,z=loc[0],loc[1]-r*.975,loc[2]-r*.27
    mesh('Pumpkin grin',[(x-r*.32,y,z+r*.07),(x+r*.32,y,z+r*.07),(x+r*.20,y,z-r*.08),(x-r*.20,y,z-r*.08)],[(0,1,2,3)],glow)
pumpkin('Counter pumpkin',(.85,-.37,1.43),.29)
pumpkin('Ground pumpkin left',(-1.45,-1.10,.57),.39)
pumpkin('Ground pumpkin right',(1.38,-1.10,.48),.28)
box('Ticket display stand',(.49,.10,1.43),(.10,.10,.48),wood)
box('Ticket plaque',(.49,.04,1.67),(.91,.08,.36),purple,.02)
text('Ticket label','LEARNPASS',(.49,-.01,1.68),.12,gold,.80)

# Join by material to keep a small stable draw-call count. Keep the cat separate.
for mat in [wood,edge,purple,cream,gold,orange,green,glow]:
    members=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in cat and o.active_material==mat]
    if not members:continue
    select(members)
    if len(members)>1:bpy.ops.object.join()
    bpy.context.object.name='Stand_'+mat.name.replace(' ','_')
stand=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in cat]
asset=stand+cat
for o in asset:
    if o not in cat:
        for p in o.data.polygons:p.use_smooth=False
    o['asset_id']='spooky-season-stand'
export(asset,'spooky-stand.glb')
export(stand,'spooky-stand-shell.glb')
source_lo,source_hi=bounds(asset)
triangles=0
for o in asset:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
assert triangles<25000,triangles
assert len({m for o in asset for m in o.data.materials})<=12
# Technical presentation is stored separately from exported asset selection.
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=16
bpy.context.scene.render.resolution_x=960;bpy.context.scene.render.resolution_y=800;bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.world.color=(.20,.24,.32)
bpy.ops.object.camera_add(location=(5.6,-8,5.4));camera=bpy.context.object;camera.name='ReviewCamera';target=Vector((0,0,1.72));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=5.6;bpy.context.scene.camera=camera
for pos,power,size in [((-3,-4,7),850,5),((4,1,6),600,4)]:
    bpy.ops.object.light_add(type='AREA',location=pos);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(target-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.view_settings.view_transform='Standard'
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'custom-stand-r1.blend'),compress=True)
report={'revision':'r1','sourceCatSha256':hashlib.sha256(COPY.read_bytes()).hexdigest(),'originalCatTriangles':7372,'originalCatDimensions':original_dimensions,'triangles':triangles,'materials':len({m for o in asset for m in o.data.materials}),'sourceDimensions':list(source_hi-source_lo),'catGroundContactZ':cat_contact,'counterTopZ':1.19,'forward':'GLB +Z','up':'GLB +Y','anchor':'ground center','artisticApproval':'user-review-pending','textures':[{ 'name':i.name,'size':list(i.size)} for i in bpy.data.images if i.type=='IMAGE']}
# Reopen the actual GLB rather than trusting source-only counts.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'spooky-stand.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
lo,hi=bounds(meshes);export_tri=0
for o in meshes:o.data.calc_loop_triangles();export_tri+=len(o.data.loop_triangles)
report['reimportTriangles']=export_tri;report['reimportDimensions']=list(hi-lo)
assert export_tri==triangles
assert max(abs(a-b) for a,b in zip(source_hi-source_lo,hi-lo))<.001
report['exportVerified']=True
(OUT/'model-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
