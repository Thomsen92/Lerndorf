"""Own low-poly collectible card models. Run in an isolated Blender process."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets' / 'collection'
CATALOG = json.loads((ASSETS / 'catalog.json').read_text(encoding='utf-8'))
CATALOG['cards']=[c for c in CATALOG['cards'] if c.get('format')!='printed-surface']
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1
if hasattr(bpy.context.preferences.filepaths, 'file_preview_type'):
    bpy.context.preferences.filepaths.file_preview_type = 'NONE'
bpy.context.preferences.filepaths.save_version=0
reports = []; motif_reports = []
collection = None
M = {}
exec(compile((ROOT/'sources/collection/textbook-figures.py').read_text(encoding='utf-8'),'textbook-figures.py','exec'),globals())

def rgb(value):
    c = [int(value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c) + (1,)

def material(name, color, metal=0, rough=.5, emission=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = rgb(color)
    p.inputs['Metallic'].default_value = metal; p.inputs['Roughness'].default_value = rough
    if emission and 'Emission Color' in p.inputs:
        p.inputs['Emission Color'].default_value = rgb(color)
        p.inputs['Emission Strength'].default_value = emission
    return m

def own(obj, name, mat):
    obj.name = name
    for previous in list(obj.users_collection): previous.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def box(name, pos, dim, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = own(bpy.context.object, name, mat); obj.dimensions = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL'); mod.width = bevel; mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def ball(name, x, z, scale, mat, y=-.0034):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(x,y,z+.0094))
    obj = own(bpy.context.object, name, mat); obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def polygon(name, points, mat, depth=.0012, y=-.0027):
    area = sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))
    if area < 0: points = list(reversed(points))
    count = len(points)
    vertices = [(x,y+depth/2,z+.0094) for x,z in points] + [(x,y-depth/2,z+.0094) for x,z in points]
    faces = [tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh = bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    return own(bpy.data.objects.new(name,mesh),name,mat)

def line(name, a, b, radius, mat):
    start, end = Vector(a), Vector(b); delta = end-start
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=delta.length, location=(start+end)/2)
    obj = own(bpy.context.object,name,mat); obj.rotation_euler = delta.to_track_quat('Z','Y').to_euler()
    return obj

def ring(name, x, z, radius, tube, mat, y=-.0021):
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, location=(x,y,z+.0094), major_radius=radius, minor_radius=tube, rotation=(math.pi/2,0,0))
    return own(bpy.context.object,name,mat)

def badge_box(name,x,z,dimensions,mat,y=-.0033):
    return box(name,(x,y,z+.0094),dimensions,mat,.00035)

def mini_book(x,z):
    polygon('Book left page',[(x-.011,z+.004),(x,z+.001),(x,z-.009),(x-.011,z-.006)],M['ivory'],depth=.001,y=-.0032)
    polygon('Book right page',[(x+.011,z+.004),(x,z+.001),(x,z-.009),(x+.011,z-.006)],M['ivory'],depth=.001,y=-.0032)
    line('Book spine',(x,-.004,z+.0004),(x,-.004,z+.0104),.0004,M['foil'])

def printed_faces(card):
    w, h, y = .0678, .1038, .00147
    vertices = [(-w/2,-y,-h/2),(w/2,-y,-h/2),(w/2,-y,h/2),(-w/2,-y,h/2),
                (w/2,y,-h/2),(-w/2,y,-h/2),(-w/2,y,h/2),(w/2,y,h/2)]
    mesh = bpy.data.meshes.new('Two readable printed sides'); mesh.from_pydata(vertices,[],[(0,1,2,3),(4,5,6,7)]); mesh.update()
    uv = mesh.uv_layers.new(name='Front and back atlas')
    coords = [(0,0),(.5,0),(.5,1),(0,1),(.5,0),(1,0),(1,1),(.5,1)]
    for polygon_face in mesh.polygons:
        for loop_index in polygon_face.loop_indices: uv.data[loop_index].uv = coords[mesh.loops[loop_index].vertex_index]
    mat = material(card['id']+'_printed_atlas','#ffffff',rough=.75)
    image = bpy.data.images.load(str(ASSETS/card['atlas']),check_existing=True); image.pack()
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image
    bsdf = mat.node_tree.nodes.get('Principled BSDF'); mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    if 'Emission Color' in bsdf.inputs:
        mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = .10
    obj = bpy.data.objects.new('Printed front and back',mesh); collection.objects.link(obj); obj.data.materials.append(mat)

def emblem(card):
    # Deliberate relief: the medallion overlaps the card by 0.05 mm; motifs
    # overlap its front as a stamped assembly. No floating disconnected details.
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.0156,depth=.0008,location=(0,-.0018,.0094),rotation=(math.pi/2,0,0))
    own(bpy.context.object,'Recessed medallion',M['ink']); ring('Embossed medallion rim',0,0,.01555,.00040,M['foil'])
    kind = card['icon']
    if card.get('figure'):return textbook_emblem(card)
    if kind == 'lantern':
        ring('Lantern hanging loop',0,.011,.0032,.00055,M['foil'],y=-.0030)
        polygon('Lantern frame',[(-.008,-.006),(-.010,.006),(-.007,.010),(.007,.010),(.010,.006),(.008,-.006)],M['foil'])
        box('Amber lantern glass',(0,-.0036,.0106),(.011,.0014,.0105),M['warm'],.0008)
        box('Lantern central bar',(0,-.0045,.0106),(.0008,.0006,.011),M['foil'])
        box('Lantern foot',(0,-.003,.0023),(.017,.0014,.002),M['foil'],.0004)
    elif kind == 'pumpkin':
        for x in [-.0045,0,.0045]: ball('Pumpkin lobe',x,0,(.007,.0025,.009),M['accent'])
        for x in [-.0039,.0039]: polygon('Carved eye',[(x-.0016,.001),(x+.0016,.001),(x,.004)],M['ink'],.00035,y=-.0060)
        polygon('Carved grin',[(-.006,-.003),(-.003,-.004),(0,-.003),(.003,-.004),(.006,-.003),(.004,-.006),(-.004,-.006)],M['ink'],.00035,y=-.0060)
        line('Pumpkin stem',(0,-.003,.018),(.0016,-.003,.0225),.0012,M['green'])
    elif kind == 'ghost':
        points=[(-.010,-.010),(-.010,.003)]
        points += [(.010*math.cos(math.pi-i*math.pi/16),.003+.010*math.sin(math.pi-i*math.pi/16)) for i in range(17)]
        points += [(.010,-.010),(.006,-.007),(.002,-.011),(-.002,-.007),(-.006,-.011)]
        polygon('Ghost silhouette',points,M['ivory'],depth=.0018,y=-.003)
        for x in [-.0038,.0038]: ball('Ghost eye',x,.002,(.0015,.0005,.0020),M['ink'],y=-.0042)
        ball('Ghost mouth',0,-.004,(.0010,.0005,.0015),M['ink'],y=-.0042)
    elif kind == 'cauldron':
        ball('Cauldron belly',0,-.003,(.011,.0021,.008),M['ink'])
        polygon('Cauldron lip',[(-.012,.003),(.012,.003),(.010,.006),(-.010,.006)],M['foil'],depth=.0016,y=-.0033)
        ball('Potion surface',0,.0046,(.009,.00065,.00125),M['green'],y=-.0045)
        for side in [-1,1]: line('Cauldron foot',(side*.007,-.003,.002),(side*.009,-.003,-.001),.0007,M['foil'])
        for x in [-.006,0,.006]:
            for j in range(3): line('Potion steam',(x+math.sin(j)*.001,-.003,.018+j*.002),(x+math.sin(j+1)*.001,-.003,.020+j*.002),.00035,M['accent'])
    elif kind == 'gate':
        for side in [-1,1]: line('Gate pillar',(side*.011,-.003,.0004),(side*.011,-.003,.0114),.0011,M['foil'])
        for j in range(16):
            a,b=j*math.pi/16,(j+1)*math.pi/16
            line('Gate arch',(.011*math.cos(a),-.003,.0114+.011*math.sin(a)),(.011*math.cos(b),-.003,.0114+.011*math.sin(b)),.0011,M['foil'])
        for x in [-.007,-.0035,0,.0035,.007]: line('Gate bar',(x,-.003,.0004),(x,-.003,.017),.00045,M['foil'])
        line('Gate crossbar',(-.010,-.003,.007),(.010,-.003,.007),.0005,M['foil'])
    elif kind == 'moon':
        for side in [-1,1]: polygon('Bat wing',[(side*.006,-.003),(side*.017,.007),(side*.014,-.001),(side*.019,-.004),(side*.011,-.005),(side*.008,-.010)],M['foil'])
        ball('Ruby blood moon',0,.001,(.010,.0027,.010),M['accent'])
        polygon('Open book left',[(-.011,-.010),(-.001,-.012),(-.001,-.016),(-.011,-.014)],M['ivory'],depth=.0008,y=-.0037)
        polygon('Open book right',[(.011,-.010),(.001,-.012),(.001,-.016),(.011,-.014)],M['ivory'],depth=.0008,y=-.0037)
    elif kind == 'star':
        points=[(math.sin(i*math.pi/5)*(.014 if i%2==0 else .006),math.cos(i*math.pi/5)*(.014 if i%2==0 else .006)) for i in range(10)]
        polygon('Star of light',points,M['foil'],depth=.002,y=-.0032)
        ball('Star jewel',0,0,(.003,.0017,.003),M['warm'],y=-.0048)
    elif kind == 'cat':
        ball('Cat head',0,-.001,(.010,.0028,.009),M['accent'])
        for side in [-1,1]:
            polygon('Cat ear',[(side*.004,.004),(side*.011,.012),(side*.010,-.001)],M['accent'],depth=.0022,y=-.0035)
            ball('Cat eye',side*.0038,.001,(.001,.0005,.0014),M['ink'],y=-.0060)
            for z in [-.003,-.005]:line('Whisker',(side*.005,-.006,z+.0094),(side*.014,-.005,z+.0094),.00027,M['ivory'])
        ball('Cat nose',0,-.004,(.0011,.0006,.0007),M['ink'],y=-.006)
    elif kind == 'spoon':
        ball('Spoon bowl',-.005,.005,(.006,.0013,.008),M['foil'])
        line('Spoon handle',(-.001,-.003,.0094),(.010,-.003,-.004),.0012,M['foil'])
        ball('Spoon handle end',.010,-.013,(.002,.0010,.002),M['foil'])
        ball('Small moon',.009,.009,(.004,.0012,.004),M['ivory'])
    elif kind == 'eye-book':
        mini_book(0,-.003)
        ball('Eye shape',0,.008,(.010,.0015,.0045),M['ivory'])
        ball('Eye iris',0,.008,(.0028,.0010,.0028),M['accent'],y=-.005)
        ball('Eye pupil',0,.008,(.0012,.0006,.0019),M['ink'],y=-.006)
    elif kind == 'key':
        ring('Key bow',-.006,.005,.006,.0011,M['foil'],y=-.0033)
        line('Key shaft',(-.001,-.0033,.0114),(.012,-.0033,-.0006),.0010,M['foil'])
        for x,z in [(.007,-.006),(.011,-.009)]:line('Key tooth',(x,-.0033,z+.0094),(x+.003,-.0033,z+.0124),.0008,M['foil'])
    elif kind == 'boot':
        polygon('Walking boot',[(-.006,.013),(.004,.013),(.004,-.002),(.012,-.006),(.013,-.011),(-.010,-.011),(-.010,-.006),(-.006,-.003)],M['accent'],depth=.003,y=-.0037)
        badge_box('Boot sole',.001,-.011,(.025,.002,.0018),M['foil'],y=-.004)
        for z in [.008,.004,0]:badge_box('Boot lace',-.001,z,(.006,.0007,.0007),M['ivory'],y=-.0055)
    elif kind == 'speech':
        polygon('Speech bubble',[(-.014,.010),(.014,.010),(.014,-.006),(0,-.006),(-.008,-.013),(-.008,-.006),(-.014,-.006)],M['accent'],depth=.0024,y=-.0035)
        for x in [-.007,0,.007]:ball('Spoken word dot',x,.002,(.0013,.0006,.0013),M['ink'],y=-.0051)
    elif kind == 'cup':
        ball('Tea cup',-.002,-.003,(.009,.0022,.008),M['accent'])
        ring('Cup handle',.009,-.001,.004,.0008,M['foil'],y=-.003)
        badge_box('Cup saucer',-.002,-.011,(.024,.0016,.002),M['foil'])
        for x in [-.006,0]:
            for j in range(3):line('Tea steam',(x+math.sin(j)*.001,-.003,.017+j*.002),(x+math.sin(j+1)*.001,-.003,.019+j*.002),.0003,M['ivory'])
    elif kind == 'clock':
        ball('Clock face',0,0,(.012,.0015,.012),M['ivory'])
        ring('Clock rim',0,0,.012,.0011,M['foil'],y=-.0035)
        line('Clock minute hand',(0,-.005,.0094),(0,-.005,.0184),.0006,M['ink'])
        line('Clock hour hand',(0,-.005,.0094),(.006,-.005,.0064),.0007,M['ink'])
        for a in [0,math.pi/2,math.pi,math.pi*1.5]:ball('Clock mark',math.sin(a)*.009,math.cos(a)*.009,(.0006,.0004,.0006),M['foil'],y=-.005)
    elif kind == 'two-heads':
        for side in [-1,1]:
            ball('Friendly ghost head',side*.0065,.001,(.006,.0022,.008),M['ivory'] if side<0 else M['accent'])
            for eye in [-1,1]:ball('Friendly eye',side*.0065+eye*.002,.002,(.0008,.0005,.0011),M['ink'],y=-.0059)
        mini_book(0,-.009)
    elif kind == 'target':
        for r in [.012,.008,.004]:ring('Practice target',0,0,r,.00065,M['foil'] if r!=.008 else M['ivory'],y=-.0032)
        line('Practice arrow',(0,-.004,.0094),(.012,-.004,.0224),.00065,M['accent'])
        polygon('Arrow head',[(.009,.013),(.014,.015),(.013,.009)],M['accent'],depth=.0008,y=-.004)
    elif kind == 'heart':
        points=[(0,-.013),(-.012,-.003),(-.014,.005),(-.010,.012),(-.004,.013),(0,.007),(.004,.013),(.010,.012),(.014,.005),(.012,-.003)]
        polygon('Friendship heart',points,M['accent'],depth=.003,y=-.0035)
        line('Heart glint',(-.009,-.0055,.0144),(-.006,-.0055,.0184),.0005,M['ivory'])
    elif kind == 'lock':
        ring('Lock shackle',0,.006,.006,.0010,M['foil'],y=-.0034)
        badge_box('Lock body',0,-.003,(.021,.003,.015),M['accent'])
        ball('Keyhole',0,-.002,(.0017,.0005,.002),M['ink'],y=-.0053)
        badge_box('Keyhole stem',0,-.005,(.0014,.0007,.004),M['ink'],y=-.0053)
    elif kind == 'tortoise':
        ball('Patient tortoise shell',-.002,0,(.010,.0032,.008),M['green'])
        ball('Tortoise head',.011,0,(.004,.0018,.0036),M['accent'])
        for x in [-.008,.004]:
            for z in [-.007,.007]:ball('Tortoise foot',x,z,(.0025,.0014,.002),M['accent'])
        ball('Tortoise eye',.012,.001,(.00065,.0004,.00065),M['ink'],y=-.0055)
        for x in [-.005,.002]:line('Shell facet',(x,-.006,.0034),(x+.004,-.006,.0154),.00035,M['foil'])
    elif kind == 'umbrella':
        points=[(-.014,0)]+[(.014*math.cos(math.pi-i*math.pi/16),.014*math.sin(math.pi-i*math.pi/16)) for i in range(17)]+[(.007,.002),(0,0),(-.007,.002)]
        polygon('Umbrella canopy',points,M['accent'],depth=.002,y=-.0035)
        line('Umbrella shaft',(0,-.0035,.0194),(0,-.0035,-.0016),.0006,M['foil'])
        ring('Umbrella handle',.002,-.011,.002,.0006,M['foil'],y=-.0035)
        for x,z in [(-.011,-.006),(.010,-.008)]:ball('Rain drop',x,z,(.0009,.0006,.0016),M['ivory'])
    elif kind == 'mouse':
        for x in [-.0065,.0065]:ball('Mouse ear',x,.006,(.005,.0016,.005),M['accent'])
        polygon('Mouse face',[(-.008,.006),(.008,.006),(.006,-.002),(0,-.012),(-.006,-.002)],M['ivory'],depth=.0025,y=-.0038)
        for x in [-.0032,.0032]:ball('Mouse eye',x,.001,(.0008,.0005,.001),M['ink'],y=-.0055)
        ball('Mouse nose',0,-.009,(.0013,.0007,.0011),M['accent'],y=-.0058)
    elif kind == 'cloud':
        for x,z,r in [(-.009,-.002,.006),(0,.004,.009),(.009,-.001,.006)]:ball('Cloud puff',x,z,(r,.0022,r*.8),M['accent'])
        line('Silver lining',(-.011,-.004,.0044),(.011,-.004,.0044),.0009,M['ivory'])
    elif kind == 'closed-book':
        badge_box('Book pages',0,0,(.019,.0025,.026),M['ivory'])
        for y in [-.005,-.0015]:badge_box('Book cover',0,0,(.022,.0008,.028),M['accent'],y=y)
        badge_box('Book binding',-.010,0,(.002,.004,.028),M['foil'])
        for z in [.004,0]:badge_box('Cover rule',.001,z,(.012,.0006,.0008),M['foil'],y=-.0057)
    elif kind == 'megaphone':
        polygon('Megaphone horn',[(-.012,-.004),(.009,-.012),(.009,.013),(-.012,.005)],M['accent'],depth=.003,y=-.0035)
        badge_box('Megaphone rim',.010,.001,(.002,.0034,.027),M['foil'])
        line('Megaphone grip',(-.003,-.003,.0064),(0,-.003,-.0046),.0014,M['foil'])
        for z in [-.005,.003,.011]:line('Sound ray',(.013,-.0035,z+.0094),(.017,-.0035,z+.0094),.00045,M['ivory'])
    elif kind == 'feather':
        polygon('Feather vane',[(-.010,-.012),(-.014,.001),(-.006,.011),(.010,.015),(.013,.003),(.006,-.008)],M['accent'],depth=.0015,y=-.0033)
        line('Feather quill',(-.012,-.0045,-.0056),(.010,-.0045,.0224),.00065,M['foil'])
        for i in range(5):
            x=-.008+i*.0033;z=-.008+i*.004
            line('Feather barb',(x,-.0045,z+.0094),(x-.005,-.0045,z+.0164),.0003,M['ivory'])
    elif kind == 'skull':
        ball('Skeleton skull',0,.002,(.010,.0028,.010),M['ivory'])
        badge_box('Skeleton jaw',0,-.008,(.014,.0028,.007),M['ivory'])
        for x in [-.004,.004]:ball('Eye socket',x,.002,(.0026,.0006,.003),M['ink'],y=-.0062)
        for x in [-.004,0,.004]:badge_box('Skull tooth',x,-.009,(.002,.0007,.004),M['foil'],y=-.0054)
    elif kind == 'bell':
        polygon('Echo bell',[(-.011,-.006),(-.009,-.002),(-.009,.006),(-.006,.012),(0,.014),(.006,.012),(.009,.006),(.009,-.002),(.011,-.006)],M['foil'],depth=.003,y=-.0035)
        ball('Bell clapper',0,-.009,(.0022,.0016,.0022),M['ivory'])
        for x in [-.014,.014]:line('Echo ray',(x,-.003,.0104),(x,-.003,.0174),.0006,M['accent'])
    elif kind == 'shield':
        polygon('Brave shield',[(0,.015),(.012,.011),(.010,-.005),(0,-.016),(-.010,-.005),(-.012,.011)],M['foil'],depth=.0028,y=-.0035)
        polygon('Ruby shield inset',[(0,.011),(.008,.008),(.007,-.003),(0,-.011),(-.007,-.003),(-.008,.008)],M['accent'],depth=.001,y=-.0054)
        ball('Shield gem',0,.001,(.002,.001,.003),M['ivory'],y=-.0062)
    elif kind == 'orb-book':
        mini_book(0,-.007)
        ball('Orb of knowledge',0,.006,(.007,.0034,.007),M['accent'],y=-.004)
        ring('Orb halo',0,.006,.0085,.00045,M['foil'],y=-.004)

def consolidate(target_collection):
    for mat in list({o.active_material for o in target_collection.objects if o.type=='MESH'}):
        members=[o for o in target_collection.objects if o.type=='MESH' and o.active_material==mat]
        if len(members)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in members:o.select_set(True)
            bpy.context.view_layer.objects.active=members[0];bpy.ops.object.join()

def export_selected(target_collection,target):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in target_collection.objects:obj.select_set(True)
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_animations=False)

def measure(target_collection):
    count=0
    for obj in target_collection.objects:obj.data.calc_loop_triangles();count+=len(obj.data.loop_triangles)
    points=[o.matrix_world@Vector(c) for o in target_collection.objects for c in o.bound_box]
    return count,[max(p[k] for p in points)-min(p[k] for p in points) for k in range(3)]

for index, card in enumerate(CATALOG['cards']):
    collection=bpy.data.collections.new('Card_'+card['id']); bpy.context.scene.collection.children.link(collection)
    M={
      'body':material(card['id']+'_cardstock','#443640',rough=.8),
      'foil':material(card['id']+'_foil',card['color'],metal=.72,rough=.28),
      'ink':material(card['id']+'_ink','#34303c',metal=.12,rough=.55),
      'accent':material(card['id']+'_accent',card.get('costumeColor',card['color']),metal=.25,rough=.36),
      'warm':material(card['id']+'_amber','#f6c47c',rough=.32,emission=.25),
      'green':material(card['id']+'_sage','#8da86a',rough=.42),
      'ivory':material(card['id']+'_ivory','#e4dcc7',rough=.6),
    }
    if card.get('figure'):
        skin={'sofia':'#b97d52','bella':'#d3a17f','mason':'#edbd95','ryan':'#d6a781','selena':'#9c6344','liberty':'#82b5a3','dogs':'#bb8353','gamer':'#edbc91'}[card['figure']]
        M['skin']=material(card['id']+'_skin',skin,rough=.75)
        M['ivory']=M['foil']
        M['green'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=rgb('#99968e' if card['figure']=='dogs' else '#649f91' if card['figure']=='liberty' else '#9b714e' if card['figure'] in ['mason','ryan','gamer'] else '#302936')
    box('Cardstock body',(0,0,0),(.072,.0028,.108),M['body'],.0011)
    printed_faces(card)
    for side in [-1,1]:
        box('Foil side',(side*.0348,-.0017,0),(.0012,.0007,.102),M['foil'],.00025)
        box('Foil edge',(0,-.0017,side*.0523),(.069,.0007,.0012),M['foil'],.00025)
    before=set(collection.objects);emblem(card)
    motif_parts=[o for o in collection.objects if o not in before and o.name not in ('Recessed medallion','Embossed medallion rim') and not o.name.startswith('Recessed medallion.') and not o.name.startswith('Embossed medallion rim.')]
    motif_collection=bpy.data.collections.new('Motif_'+card['id']);bpy.context.scene.collection.children.link(motif_collection)
    points=[o.matrix_world@Vector(c) for o in motif_parts for c in o.bound_box]
    center=Vector([(max(p[k] for p in points)+min(p[k] for p in points))/2 for k in range(3)])
    for original in motif_parts:
        copy=original.copy();copy.data=original.data.copy();motif_collection.objects.link(copy);copy.location-=center
    consolidate(motif_collection)
    motif_target=ASSETS/card['motifModel'];export_selected(motif_collection,motif_target)
    motif_triangles,motif_size=measure(motif_collection)
    motif_reports.append({'id':card['id'],'triangles':motif_triangles,'materials':len(motif_collection.objects),'bytes':motif_target.stat().st_size,'sourceSizeXYZ':motif_size})
    # Consolidate by material so each exported card stays inexpensive to render.
    consolidate(collection)
    target=ASSETS/card['model']
    export_selected(collection,target);triangles,size=measure(collection)
    reports.append({'id':card['id'],'triangles':triangles,'materials':len(collection.objects),'bytes':target.stat().st_size,'sourceSizeXYZ':size,'texture':[1024,768]})
    for obj in collection.objects:obj.location.x+=(index%6-2.5)*.09;obj.location.z-=int(index/6)*.16
    for obj in motif_collection.objects:obj.location.x+=(index%6-2.5)*.09;obj.location.z-=int(index/6)*.16+.075

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sources/collection/halloween-almanac.blend'),compress=True)
(ASSETS/'model-audit.json').write_text(json.dumps({'models':reports,'motifs':motif_reports,'visualStatus':'User review pending','source':'sources/collection/halloween-almanac.blend'},indent=2)+'\n',encoding='utf-8')
print('ALMANAC_EXPORT_COMPLETE',len(reports),'cards',len(motif_reports),'motifs')
