"""A simple book, with the edited cover mapped directly onto its front face."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];ASSETS=ROOT/'assets/collection/textbook'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.preferences.filepaths.save_version=0
if hasattr(bpy.context.preferences.filepaths,'file_preview_type'):bpy.context.preferences.filepaths.file_preview_type='NONE'
def rgb(c):
    values=[int(c[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values)+(1,)
def mat(name,color):
    material=bpy.data.materials.new(name);material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=rgb(color);shader.inputs['Roughness'].default_value=.82
    return material
def box(name,location,size,material,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location);obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(material)
    if bevel:
        modifier=obj.modifiers.new('Soft book edges','BEVEL');modifier.width=bevel;modifier.segments=2;bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj
image=bpy.data.images.load(str(ASSETS/'highlight-halloween-cover.png'));original_size=list(image.size)
W=.20;H=W*image.size[1]/image.size[0];D=.017
cover=mat('Golden book boards','#f4ba16');paper=mat('Cream paper edges','#ede6d5');lines=mat('Fine page divisions','#b7ac97')
box('Closed paper block',(.0008,0,0),(W-.006,D-.0028,H-.006),paper,.0005)
box('Front hard cover',(0,-D/2+.0006,0),(W,.0012,H),cover,.00045)
box('Back hard cover',(0,D/2-.0006,0),(W,.0012,H),cover,.00045)
box('Solid book spine',(-W/2+.001,0,0),(.002,D,H),cover,.00045)
for i in range(12):
    y=-.0062+i*.00112
    box('Visible page line - fore edge',(.0008+(W-.006)/2+.000025,y,0),(.00005,.00008,H-.007),lines)
    for side in [-1,1]:box('Visible page line - end',(.0008,y,side*(H-.006)/2+side*.000025),(W-.007,.00008,.00005),lines)
image.scale(round(1024*original_size[0]/original_size[1]),1024)
image.filepath_raw=str(ASSETS/'highlight-halloween-texture.png');image.file_format='PNG';image.save();image.pack()
printed=mat('Direct front cover texture','#ffffff');shader=printed.node_tree.nodes.get('Principled BSDF')
tex=printed.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;printed.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
# An unlit print preserves the supplied cover colors and legible typography;
# boards, spine and paper retain physical lighting and shading.
output=printed.node_tree.nodes.get('Material Output');emission=printed.node_tree.nodes.new('ShaderNodeEmission')
printed.node_tree.links.new(tex.outputs['Color'],emission.inputs['Color']);printed.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
y=-D/2-.000012;w=W-.00055;h=H-.00055
mesh=bpy.data.meshes.new('Full cover face UV');mesh.from_pydata([(-w/2,y,-h/2),(w/2,y,-h/2),(w/2,y,h/2),(-w/2,y,h/2)],[],[(0,1,2,3)]);mesh.update()
uv=mesh.uv_layers.new(name='Entire edited cover, no crop')
for polygon in mesh.polygons:
    for loop in polygon.loop_indices:uv.data[loop].uv=[(0,0),(1,0),(1,1),(0,1)][mesh.loops[loop].vertex_index]
obj=bpy.data.objects.new('Edited cover printed on book face',mesh);bpy.context.scene.collection.objects.link(obj);obj.data.materials.append(printed)
back_image=bpy.data.images.load(str(ASSETS/'highlight-halloween-back.png'));back_original_size=list(back_image.size)
back_image.scale(round(1024*original_size[0]/original_size[1]),1024)
back_image.filepath_raw=str(ASSETS/'highlight-halloween-back-texture.png');back_image.file_format='PNG';back_image.save();back_image.pack()
back_print=mat('Direct back cover meme texture','#ffffff')
back_tex=back_print.node_tree.nodes.new('ShaderNodeTexImage');back_tex.image=back_image
back_emission=back_print.node_tree.nodes.new('ShaderNodeEmission')
back_print.node_tree.links.new(back_tex.outputs['Color'],back_emission.inputs['Color']);back_print.node_tree.links.new(back_emission.outputs[0],back_print.node_tree.nodes.get('Material Output').inputs['Surface'])
y=D/2+.000012
# Viewed from behind, the physical +X edge is the image's left edge.
back_mesh=bpy.data.meshes.new('Full back cover face UV');back_mesh.from_pydata([(w/2,y,-h/2),(-w/2,y,-h/2),(-w/2,y,h/2),(w/2,y,h/2)],[],[(0,1,2,3)]);back_mesh.update()
back_uv=back_mesh.uv_layers.new(name='Entire meme back cover, readable from behind')
for polygon in back_mesh.polygons:
    for loop in polygon.loop_indices:back_uv.data[loop].uv=[(0,0),(1,0),(1,1),(0,1)][back_mesh.loops[loop].vertex_index]
back_obj=bpy.data.objects.new('Meme printed on back cover',back_mesh);bpy.context.scene.collection.objects.link(back_obj);back_obj.data.materials.append(back_print)
for material in [cover,paper,lines]:
    members=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==material]
    bpy.ops.object.select_all(action='DESELECT')
    for member in members:member.select_set(True)
    bpy.context.view_layer.objects.active=members[0]
    if len(members)>1:bpy.ops.object.join()
bpy.ops.object.select_all(action='SELECT')
target=ASSETS/'highlight-halloween-book.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True,export_materials='EXPORT',export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sources/collection/highlight-halloween-book.blend'),compress=True)
def measure():
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    triangles=0
    for obj in objects:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    return {'triangles':triangles,'materials':len({m.name for o in objects for m in o.data.materials}),'size':[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]}
source=measure()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(target));export=measure()
assert source['triangles']==export['triangles'] and source['triangles']<4000
assert all(abs(a-b)<1e-6 for a,b in zip(source['size'],export['size']))
assert export['materials']<=5
printed_objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m and m.name.startswith('Direct front cover') for m in o.data.materials)]
assert len(printed_objects)==1 and len(printed_objects[0].data.polygons)==2
assert all((o.matrix_world.to_3x3()@p.normal).normalized().y<-.99 for o in printed_objects for p in o.data.polygons)
uvs=[tuple(v.uv) for o in printed_objects for v in o.data.uv_layers.active.data]
assert min(u[0] for u in uvs)==0 and max(u[0] for u in uvs)==1 and min(u[1] for u in uvs)==0 and max(u[1] for u in uvs)==1
back_objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m and m.name.startswith('Direct back cover') for m in o.data.materials)]
assert len(back_objects)==1 and len(back_objects[0].data.polygons)==2
assert all((o.matrix_world.to_3x3()@p.normal).normalized().y>.99 for o in back_objects for p in o.data.polygons)
back_uvs=[tuple(v.uv) for o in back_objects for v in o.data.uv_layers.active.data]
assert min(u[0] for u in back_uvs)==0 and max(u[0] for u in back_uvs)==1 and min(u[1] for u in back_uvs)==0 and max(u[1] for u in back_uvs)==1
coords=[(loop.uv.x,back_objects[0].data.vertices[back_objects[0].data.loops[i].vertex_index].co.x) for i,loop in enumerate(back_objects[0].data.uv_layers.active.data)]
assert min(x for u,x in coords if u==0)>max(x for u,x in coords if u==1),'Back cover must read left-to-right from behind'
report={'success':True,'source':source,'export':export,'coverOriginalSize':original_size,'embeddedTexture':list(image.size),'backOriginalSize':back_original_size,'embeddedBackTexture':list(back_image.size),'fullCoverUV':True,'frontNormalCorrect':True,'fullBackUV':True,'backNormalCorrect':True,'backNotMirrored':True,'bytes':target.stat().st_size,'visualReview':'User review pending'}
(ASSETS/'book-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('BOOK_EXPORT_AUDIT_PASSED',json.dumps(report))
