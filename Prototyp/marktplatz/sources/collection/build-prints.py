"""Four thin printed surfaces; exact photo/layout aspect ratio, no sculpted motifs."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];DIR=ROOT/'assets/collection/prints'
manifest=json.loads((DIR/'manifest.json').read_text(encoding='utf-8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
if hasattr(bpy.context.preferences.filepaths,'file_preview_type'):bpy.context.preferences.filepaths.file_preview_type='NONE'
bpy.context.scene.unit_settings.system='METRIC'
reports=[]
def printed_material(name,file):
    material=bpy.data.materials.new(name);material.use_nodes=True;tree=material.node_tree
    image=bpy.data.images.load(str(DIR/file));image.pack()
    tex=tree.nodes.new('ShaderNodeTexImage');tex.image=image;emission=tree.nodes.new('ShaderNodeEmission')
    tree.links.new(tex.outputs['Color'],emission.inputs['Color']);tree.links.new(emission.outputs[0],tree.nodes.get('Material Output').inputs['Surface'])
    return material,image
def metrics(objects):
    triangles=0;points=[]
    for obj in objects:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles);points.extend(obj.matrix_world@Vector(c) for c in obj.bound_box)
    return {'triangles':triangles,'materials':len({m.name for o in objects for m in o.data.materials}),'size':[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]}
for index,item in enumerate(manifest['items']):
    group=bpy.data.collections.new(item['id']);bpy.context.scene.collection.children.link(group)
    front,image=printed_material(item['id']+'_front',item['frontTexture']);back,_=printed_material(item['id']+'_back',item['backTexture'])
    ratio=image.size[0]/image.size[1];w=.21 if ratio>1 else .15*ratio;h=w/ratio;d=.0008 if 'postcard' in item['id'] else .0012
    paper=bpy.data.materials.new(item['id']+'_paper');edge=(.66,.40,.12,1) if item['rarity']=='legendary' else (.8,.74,.61,1);paper.diffuse_color=edge;paper.use_nodes=True;paper.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=edge
    if item['rarity']=='legendary':paper.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.65
    bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.name='Thin paper card';obj.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(paper)
    bevel=obj.modifiers.new('Small paper edge','BEVEL');bevel.width=min(d/4,.00025);bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
    for old in list(obj.users_collection):old.objects.unlink(obj)
    group.objects.link(obj)
    for is_back,mat in [(False,front),(True,back)]:
        y=(d/2+.000004)*(1 if is_back else -1);left=w/2-.0001 if is_back else -w/2+.0001;right=-left;top=h/2-.0001
        mesh=bpy.data.meshes.new('Full printed face');mesh.from_pydata([(left,y,-top),(right,y,-top),(right,y,top),(left,y,top)],[],[(0,1,2,3)]);mesh.update();uv=mesh.uv_layers.new(name='Full print, readable orientation')
        for polygon in mesh.polygons:
            for loop in polygon.loop_indices:uv.data[loop].uv=[(0,0),(1,0),(1,1),(0,1)][mesh.loops[loop].vertex_index]
        face=bpy.data.objects.new('Back print' if is_back else 'Front print',mesh);group.objects.link(face);face.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in group.objects:obj.select_set(True)
    target=ROOT/'assets/collection'/item['model']
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_animations=False)
    source=metrics(list(group.objects));assert source['triangles']<4000 and source['materials']<=3
    reports.append({'id':item['id'],'source':source,'textures':list(image.size),'bytes':target.stat().st_size})
    for obj in group.objects:obj.location.x+=(index%2)*.30;obj.location.z-=(index//2)*.26
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sources/collection/textbook-prints.blend'),compress=True)
for item,report in zip(manifest['items'],reports):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/collection'/item['model']))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];export=metrics(objects)
    assert export['triangles']==report['source']['triangles'] and export['materials']==3
    assert all(abs(a-b)<1e-6 for a,b in zip(export['size'],report['source']['size']))
    for suffix,sign in [('_front',-1),('_back',1)]:
        printed=[o for o in objects if any(m and m.name.startswith(item['id']+suffix) for m in o.data.materials)];assert len(printed)==1
        assert all(sign*(o.matrix_world.to_3x3()@p.normal).normalized().y>.99 for o in printed for p in o.data.polygons)
        uv=printed[0].data.uv_layers.active;assert min(v.uv.x for v in uv.data)==0 and max(v.uv.x for v in uv.data)==1
    assert max(report['textures'])<=1024
    report.update({'export':export,'fullFrontBackUV':True,'success':True})
(DIR/'model-audit.json').write_text(json.dumps({'success':True,'models':reports,'visualReview':'User review pending'},indent=2)+'\n',encoding='utf-8')
print('PRINT_EXPORT_AUDIT_PASSED',len(reports),'printed surfaces')
