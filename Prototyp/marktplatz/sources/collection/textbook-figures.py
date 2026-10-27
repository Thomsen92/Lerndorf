"""Small editable figurines inspired by the three user-supplied textbook pages.
Loaded by build-cards.py; all parts are real closed meshes, not billboards.
"""
def fig_ball(name,x,y,z,scale,mat,subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions,radius=1,location=(x,y,z+.0094))
    obj=own(bpy.context.object,name,mat);obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return obj

def fig_cone(name,x,y,z,r1,r2,depth,mat):
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r1,radius2=r2,depth=depth,location=(x,y,z+.0094))
    return own(bpy.context.object,name,mat)

def textbook_emblem(card):
    f=card['figure'];skin=M['skin'];hair=M['green'];ink=M['ink'];coat=M['accent'];gold=M['foil']
    def limb(name,a,b,r,mat):return line(name,(a[0],a[1],a[2]+.0094),(b[0],b[1],b[2]+.0094),r,mat)
    def dot(name,x,y,z,r,mat):return fig_ball(name,x,y,z,(r,r,r),mat)
    if f=='dogs':
        for i,(x,z,length,mat) in enumerate([(-.004,.004,.0095,skin),(.006,-.009,.0045,hair)]):
            fig_ball('Long dachshund body' if i==0 else 'Round grey dog body',x,-.004,z,(length,.0032,.0034),mat)
            hx=x+length*.72
            fig_ball('Werehound head',hx,-.0046,z+.0025,(.004,.0033,.004),mat,2)
            fig_ball('Long muzzle',hx+.003,-.0062,z+.0014,(.0037,.0020,.0017),mat)
            dot('Dog nose',hx+.0057,-.0068,z+.0019,.0011,ink)
            for side in [-1,1]:
                fig_ball('Drooping ear',hx-.001,-.0046+side*.0027,z+.0003,(.0018,.0011,.0040),ink)
                for px in [x-length*.6,x+length*.3]:limb('Dog paw',(px,-.004+side*.002,z-.001),(px,-.004+side*.002,z-.005),.0008,mat)
            dot('Dog eye',hx+.001,-.0073,z+.0031,.00065,gold)
            limb('Wagging tail',(x-length*.8,-.003,z),(x-length*1.17,-.003,z+.004),.0007,mat)
            dot('Pumpkin collar',hx-.001,-.007,z-.0017,.0017,M['warm'])
        return
    # The five book teenagers and the grammar-page gamer share a collectible
    # chibi construction; costume, hair, accessories and silhouettes differ.
    for side in [-1,1]:
        limb('Boot leg',(side*.003,-.003,-.005),(side*.003,-.003,-.013),.0017,ink)
        fig_ball('Boot',side*.003,-.0042,-.013,(.0023,.003,.0013),ink)
    fig_cone('Costume torso',0,-.003,-.005,.0062,.0046,.010,coat)
    fig_ball('Head',0,-.003,.004,(.0057,.0045,.0061),skin,2)
    for side in [-1,1]:
        dot('Ear',side*.0056,-.003,.004,.0013,skin)
        limb('Sleeve',(side*.004,-.003,-.001),(side*.007,-.004,-.005),.0017,coat)
        dot('Hand',side*.007,-.0045,-.005,.0017,skin)
    # Hair is deliberately sculpted around the back, leaving the face clear.
    fig_ball('Hair cap',0,-.001,.007,(.0059,.0045,.0048),hair)
    for side in [-1,1]:
        fig_ball('Eye white',side*.0019,-.0071,.0048,(.00115,.00055,.0012),M['ivory'])
        dot('Eye pupil',side*.0019,-.00765,.0046,.00060,ink)
    dot('Nose',0,-.0079,.0030,.0008,skin)
    limb('Smile',(-.0019,-.0074,.0018),(.0019,-.0074,.0018),.00035,ink)
    if f in ['sofia','selena']:
        for side in [-1,1]:
            for j in range(7):
                a=j*math.pi/7
                dot('Sculpted curl',side*(.0048+.0012*math.sin(a)),-.0025+.0015*math.cos(j),.009-j*.0016,.0017,hair)
        for j in range(5):dot('Crown curl',-.004+j*.002,-.003,.0095,.0016,hair)
    elif f=='bella':
        for side in [-1,1]:fig_ball('Long straight hair',side*.005,-.0008,.000,(.0018,.0031,.0082),hair)
        polygon('Side swept fringe',[(-.005,.010),(.005,.009),(-.003,.003)],hair,depth=.0015,y=-.007)
        badge_box('Bright smile',0,.0014,(.0042,.0005,.0015),M['ivory'],y=-.0078)
        for x in [-.0013,0,.0013]:badge_box('Brace bracket',x,.0014,(.0006,.0004,.0007),gold,y=-.0082)
        polygon('Vampire collar',[(-.007,-.003),(-.009,.002),(-.003,-.001),(0,-.004),(.003,-.001),(.009,.002),(.007,-.003)],coat,depth=.002,y=-.001)
        badge_box('Library book',.007,-.006,(.006,.003,.008),gold,y=-.0064)
        badge_box('Book cover',.007,-.006,(.005,.0005,.007),coat,y=-.0081)
    elif f in ['mason','ryan','gamer']:
        for j in range(7):
            obj=fig_ball('Swept fringe',-.005+j*.0016,-.006,.008+(.001 if j%2 else 0),(.002,.0018,.0027),hair)
            obj.rotation_euler.y=.3
    if f=='sofia':
        fig_cone('Wide witch hat brim',0,-.001,.010,.009,.009,.0009,coat)
        fig_cone('Moon witch hat',0,-.001,.014,.006,0,.009,coat)
        dot('Hat moon gem',.002,-.006,.014,.0015,gold)
        limb('Broomstick',(-.009,-.003,-.014),(-.009,-.003,.010),.00065,gold)
        fig_cone('Broom bristles',-.009,-.003,-.012,.0035,.0014,.005,M['warm'])
    elif f=='mason':
        fig_ball('Blue hood behind head',0,.001,.004,(.007,.005,.0085),coat)
        for side in [-1,1]:limb('Hood trim',(side*.0056,-.005,-.002),(side*.006,-.005,.009),.0008,M['ivory'])
        fig_cone('Ghost lantern',.008,-.006,-.008,.0024,.0022,.004,M['warm'])
        for side in [-1,1]:dot('Ghost lantern eye',.008+side*.0007,-.008,-.007,.00035,ink)
    elif f=='ryan':
        for side in [-1,1]:polygon('Friendly wolf ear',[(side*.0035,.007),(side*.0075,.014),(side*.008,.006)],hair,depth=.0025,y=-.001)
        for z in [-.002,-.005,-.008]:limb('Flannel check',(-.005,-.007,z),(.005,-.007,z),.00035,ink)
        fig_cone('Maple lantern',.008,-.007,-.008,.0027,.0027,.004,M['warm'])
        polygon('Maple lantern leaf',[(.006,-.008),(.006,-.005),(.007,-.006),(.008,-.004),(.009,-.006),(.010,-.005),(.010,-.008)],coat,depth=.0005,y=-.010)
    elif f=='selena':
        obj=ring('Moonlight tambourine',.007,-.005,.0035,.00075,gold,y=-.007)
        for j in range(6):
            a=j*math.pi/3;dot('Tambourine jingle',.007+math.cos(a)*.0035,-.007,-.005+math.sin(a)*.0035,.0007,M['warm'])
        for side in [-1,1]:dot('Moon earring',side*.006,-.005,.002,.0008,gold)
    elif f=='liberty':
        for j in range(7):
            a=(j-3)*math.pi/8
            limb('Liberty crown ray',(math.sin(a)*.005,-.003,.008+math.cos(a)*.002),(math.sin(a)*.010,-.003,.008+math.cos(a)*.008),.0005,coat)
        fig_cone('Statue robe',0,-.003,-.006,.007,.0035,.012,coat)
        limb('Raised statue arm',(-.004,-.003,-.001),(-.008,-.003,.010),.0016,coat)
        limb('Pumpkin torch stem',(-.008,-.003,.010),(-.008,-.003,.015),.0007,gold)
        for x in [-.0012,0,.0012]:fig_ball('Torch pumpkin lobe',-.008+x,-.003,.016,(.0022,.0024,.0027),M['warm'])
        dot('Pumpkin stalk',-.008,-.003,.019,.0007,coat)
        for x in [-.0008,.0008]:dot('Jack-o-lantern eye',-.008+x,-.0053,.0165,.00035,ink)
        badge_box('Statue tablet',.006,-.003,(.005,.002,.008),coat,y=-.006)
    elif f=='gamer':
        fig_cone('Backwards cap',0,-.001,.010,.0063,.0057,.003,coat)
        badge_box('Cap peak',.005,.0095,(.008,.006,.0008),coat,y=.001)
        fig_ball('Ghost controller',0,-.008,-.006,(.006,.002,.0034),M['ivory'])
        for side in [-1,1]:dot('Controller ghost eye',side*.0017,-.010,-.005,.00065,ink)
        limb('Controller d-pad',(-.004,-.010,-.0065),(-.002,-.010,-.0065),.0004,ink)
        for side in [-1,1]:dot('Controller grip',side*.005,-.008,-.008,.002,M['ivory'])
