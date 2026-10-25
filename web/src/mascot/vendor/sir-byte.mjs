// Source: github.com/Thomsen92/Sir-Byte @ ea10e0c - unchanged except this header.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {ByteBehavior} from './behavior.mjs';
import {sampleSpeech} from './speech-motion.mjs';

export const TASK_DIRECTIONS=Object.freeze({
 'top-left':Object.freeze({x:-1,y:.8,z:0}),'top-front-left':Object.freeze({x:-Math.SQRT1_2,y:.8,z:Math.SQRT1_2}),
 'top-front':Object.freeze({x:0,y:.8,z:1}),'top-front-right':Object.freeze({x:Math.SQRT1_2,y:.8,z:Math.SQRT1_2}),'top-right':Object.freeze({x:1,y:.8,z:0}),
 left:Object.freeze({x:-1,y:0,z:0}),'front-left':Object.freeze({x:-Math.SQRT1_2,y:0,z:Math.SQRT1_2}),
 front:Object.freeze({x:0,y:0,z:1}),'front-right':Object.freeze({x:Math.SQRT1_2,y:0,z:Math.SQRT1_2}),right:Object.freeze({x:1,y:0,z:0}),
 'bottom-left':Object.freeze({x:-1,y:-.8,z:0}),'bottom-front-left':Object.freeze({x:-Math.SQRT1_2,y:-.8,z:Math.SQRT1_2}),
 'bottom-front':Object.freeze({x:0,y:-.8,z:1}),'bottom-front-right':Object.freeze({x:Math.SQRT1_2,y:-.8,z:Math.SQRT1_2}),'bottom-right':Object.freeze({x:1,y:-.8,z:0})
});

const eyeVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const eyeFragment=`
varying vec2 vUv;
uniform vec2 gaze;
uniform vec4 lids;
uniform float blink;
uniform float wink;
uniform float surprise;
float eye(vec2 p, vec2 center, float upper, float lower, float angle, float closure){
 vec2 q=p-center-gaze*vec2(.075,.045);
 q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
 float open=max(.025,1.-closure);
 q.y/=open;
 vec2 radius=vec2(.102,.175)*(1.+surprise*.16);
 float d=(length(q/radius)-1.)*.10;
 float top=.175-upper*.235;
 float bottom=-.175+lower*(.235-2.*q.x*q.x);
 d=max(d,q.y-top);
 d=max(d,bottom-q.y);
 float core=1.-smoothstep(-.003,.004,d);
 float halo=exp(-max(d,0.)*100.)*.22;
 return core+halo;
}
void main(){
 vec2 p=vUv-.5;
 float a=eye(p,vec2(-.205,0.),lids.x,lids.z,-lids.x*.22,max(blink,wink));
 float b=eye(p,vec2(.205,0.),lids.y,lids.w,lids.y*.22,blink);
 float v=max(a,b);
 gl_FragColor=vec4(vec3(.27,.97,1.)*(.9+v*.15),clamp(v,0.,1.));
}`;

export function createSirByte(){
 const root=new THREE.Group();root.name='SirByte';
 const floatRig=new THREE.Group();floatRig.name='FloatRig';root.add(floatRig);
 const bodyRig=new THREE.Group();bodyRig.name='BodyRig';floatRig.add(bodyRig);
 const head=new THREE.Group();head.name='HeadRig';head.position.y=1.92;floatRig.add(head);
 const shell=new THREE.MeshPhysicalMaterial({color:0x52848d,metalness:.12,roughness:.37,clearcoat:.5,clearcoatRoughness:.3});
 const dark=new THREE.MeshStandardMaterial({color:0x102b36,metalness:.3,roughness:.35});
 const rim=new THREE.MeshStandardMaterial({color:0x2c5965,metalness:.55,roughness:.25});
 const hatMat=new THREE.MeshStandardMaterial({color:0x172936,roughness:.67,metalness:.08});
 const red=new THREE.MeshStandardMaterial({color:0x4b1028,roughness:.67,metalness:.02});
 const glow=new THREE.MeshStandardMaterial({color:0x68dadd,emissive:0x38bfc9,emissiveIntensity:.7,roughness:.26});
 function mesh(name,g,m,parent,x=0,y=0,z=0){g.normalizeNormals();const o=new THREE.Mesh(g,m);o.name=name;o.position.set(x,y,z);parent.add(o);return o;}
 function ball(name,m,parent,pos,scale,segments=32){const o=mesh(name,new THREE.SphereGeometry(1,segments,20),m,parent,...pos);o.scale.set(...scale);return o;}
 mesh('HeadShell',new RoundedBoxGeometry(2.13,1.57,1.29,5,.45),shell,head);
 function panel(w,h,r,depth){
  const x=-w/2,y=-h/2,s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:3,steps:1,curveSegments:10});
 }
 mesh('VisorGasket',panel(1.82,1.17,.29,.04),rim,head,0,-.025,.63);
 const visor=mesh('ObsidianDisplay',panel(1.73,1.08,.26,.035),new THREE.MeshPhysicalMaterial({color:0x06191f,metalness:.1,roughness:.24,clearcoat:1,clearcoatRoughness:.2}),head,0,-.025,.69);
 const uniforms={gaze:{value:new THREE.Vector2()},lids:{value:new THREE.Vector4()},blink:{value:0},wink:{value:0},surprise:{value:0}};
 const eyeMaterial=new THREE.ShaderMaterial({vertexShader:eyeVertex,fragmentShader:eyeFragment,uniforms,transparent:true,depthWrite:false,toneMapped:false});
 const eyes=mesh('LiveDisplayEyes',new THREE.PlaneGeometry(1.63,1.05),eyeMaterial,head,0,-.025,.754);
 // Egg profile narrows toward the underside, matching the supplied floating-body reference.
 const profile=[new THREE.Vector2(0,-.67),new THREE.Vector2(.18,-.64),new THREE.Vector2(.38,-.52),new THREE.Vector2(.55,-.30),new THREE.Vector2(.66,.02),new THREE.Vector2(.69,.29),new THREE.Vector2(.65,.46),new THREE.Vector2(.49,.56),new THREE.Vector2(0,.57)];
 const curve=new THREE.SplineCurve(profile);const bodyGeo=new THREE.LatheGeometry(curve.getPoints(32),40);
 const body=mesh('EggBody',bodyGeo,shell,bodyRig,0,.59,0);body.scale.z=.76;
 const neck=mesh('NeckJoint',new THREE.CylinderGeometry(.25,.3,.18,24),dark,floatRig,0,1.22,0);
 const arms=[],flipperTips=[];
 for(const s of [-1,1]){
  const pivot=new THREE.Group();pivot.name=s<0?'FlipperLeftRig':'FlipperRightRig';pivot.position.set(s*.68,.95,0);bodyRig.add(pivot);
  ball('ShoulderJoint',rim,pivot,[0,0,0],[.13,.15,.14],20);
  const flipper=ball(s<0?'FlipperLeft':'FlipperRight',shell,pivot,[s*.11,-.34,.03],[.16,.48,.18]);flipper.rotation.z=s*.19;
  arms.push(pivot);
  flipperTips.push(new THREE.Vector3(0,-1,0).multiply(flipper.scale).applyEuler(flipper.rotation).add(flipper.position));
 }
 const bow=new THREE.Group();bow.name='BowTie';bow.position.set(0,1.04,.43);bodyRig.add(bow);
 const bowFabric=new THREE.MeshPhysicalMaterial({color:0x651c38,roughness:.48,metalness:0,sheen:.65,sheenColor:0xa34c65,sheenRoughness:.65});
 for(const side of [-1,1]){
  // Dense, sculpted cloth lobes: pinched at the knot, broad rounded outer ends.
  const geometry=new THREE.SphereGeometry(1,64,40),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),u=(side*x+1)/2;
   const fold=.018*Math.exp(-(((u-.28)/.28)**2))*Math.exp(-((y/.24)**2))*Math.max(0,z);
   positions.setXYZ(i,side*(.02+.37*u),y*(.065+.19*u),z*(.085-.025*u)-fold+.025);
  }
  geometry.computeVertexNormals();
  mesh('BowWing',geometry,bowFabric,bow);
 }
 mesh('BowKnot',new RoundedBoxGeometry(.15,.18,.16,6,.055),bowFabric,bow,0,0,.06);
 const badge=mesh('ChestBadgeRim',new THREE.CylinderGeometry(.105,.105,.035,24),rim,bodyRig,0,.58,.51);badge.rotation.x=Math.PI/2;
 const light=mesh('ChestLight',new THREE.CircleGeometry(.073,24),glow,bodyRig,0,.58,.532);
 // Short mounting seat: its lower 0.025 is intentionally socketed into the shell.
 // The broad brim itself remains outside the head instead of cutting through it.
 const hatSeat=mesh('HatSeat',new THREE.CylinderGeometry(.50,.50,.10,40),hatMat,head,.03,.81,-.03);hatSeat.scale.z=.66;
 // Seated against the rounded shell with ~0.003 clearance at the lowest contact.
 const hat=new THREE.Group();hat.name='BowlerHat';hat.position.set(.03,.830,-.03);hat.rotation.z=-.045;head.add(hat);
 const brim=ball('HatBrim',hatMat,hat,[0,.04,0],[.94,.07,.68],40);
 // Closed lathed crown, dome silhouette rather than a top hat.
 const crownCurve=new THREE.SplineCurve([new THREE.Vector2(0,0),new THREE.Vector2(.64,0),new THREE.Vector2(.66,.13),new THREE.Vector2(.62,.40),new THREE.Vector2(.48,.61),new THREE.Vector2(.23,.72),new THREE.Vector2(0,.74)]);
 const crown=mesh('HatCrown',new THREE.LatheGeometry(crownCurve.getPoints(28),40),hatMat,hat,0,.07,0);crown.scale.z=.82;
 const band=mesh('HatRibbon',new THREE.CylinderGeometry(.658,.66,.12,40,1,true),red,hat,0,.22,0);band.scale.z=.82;
 // Independent hover rig: the flipper conducts, without holding the cane.
 const cane=new THREE.Group();cane.name='IdleCane';floatRig.add(cane);cane.visible=false;
 const caneSpin=new THREE.Group();caneSpin.name='CaneSpin';caneSpin.scale.setScalar(1.15);cane.add(caneSpin);
 const caneModel=new THREE.Group();caneModel.position.y=.4;caneSpin.add(caneModel);
 const gold=new THREE.MeshStandardMaterial({color:0xcba35b,metalness:.8,roughness:.28});
 const caneBlack=new THREE.MeshStandardMaterial({color:0x101922,metalness:.25,roughness:.3});
 mesh('CaneShaft',new THREE.CylinderGeometry(.022,.016,.76,16),caneBlack,caneModel,0,-.41,0);
 ball('CaneKnob',gold,caneModel,[0,.015,0],[.065,.052,.052],20);
 mesh('CaneCollar',new THREE.CylinderGeometry(.03,.03,.055,16),gold,caneModel,0,-.045,0);
 mesh('CaneTip',new THREE.CylinderGeometry(.018,.013,.065,16),gold,caneModel,0,-.82,0);
 const popMaterial=new THREE.MeshBasicMaterial({color:0x83e4e7,transparent:true,opacity:0,depthWrite:false});
 const popRing=mesh('CanePopRing',new THREE.TorusGeometry(.15,.009,6,32),popMaterial,cane);popRing.visible=false;
 const behavior=new ByteBehavior();
 let time=0,nextBlink=2.7,blinkStart=-10,smoothedTilt=0,smoothedLift=0;
 let idleWait=0,nextCane=9,caneTime=-1,caneRequested=false,caneMode='idle',lastReaction=behavior.revision;
 const viewerTarget=new THREE.Vector3(),pointDirection=new THREE.Vector3(),shaftDirection=new THREE.Vector3(0,1,0),pointRotation=new THREE.Quaternion();
 function playCane(){caneRequested=true;}
 let taskDirection=TASK_DIRECTIONS.front,taskWorldTarget=null,taskArm=1;
 const armPointRotation=new THREE.Quaternion();
 const taskTip=new THREE.Vector3(),taskShoulder=new THREE.Vector3(),armRestDirection=new THREE.Vector3();
 function pointAtTask(target='front'){
  if(typeof target==='string'){
   if(!Object.hasOwn(TASK_DIRECTIONS,target))throw new Error(`Unknown task direction: ${target}`);
   taskDirection=TASK_DIRECTIONS[target];taskWorldTarget=null;
  }else{
   if(!target||![target.x,target.y,target.z].every(Number.isFinite))throw new Error('Task target must be a finite world position {x,y,z}');
   taskWorldTarget=new THREE.Vector3(target.x,target.y,target.z);
  }
  behavior.react('point');
 }
 const ease=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
 const smoothLids=new THREE.Vector4();const targetLids=new THREE.Vector4();
 const smoothGaze=new THREE.Vector2();
 const speechPose={weight:0,pitch:0,roll:0,yaw:0,lift:0,leftArm:0,rightArm:0,upperLeft:0,upperRight:0,smile:0,eyeScale:1};
 function update(dt,{reducedMotion=false,speaking=false,speechTime=0,speechDuration=14.16,speechLevel=0,viewerPosition=null}={}){
  const newReaction=behavior.revision!==lastReaction,requestedState=behavior.state;
  dt=Math.min(Math.max(dt,0),.08);time+=dt;const e=behavior.update(dt);lastReaction=behavior.revision;const k=1-Math.exp(-dt*9);
  const speech=sampleSpeech(speechTime,speechDuration,speechLevel);if(!speaking)speech.weight=0;
  for(const key of Object.keys(speechPose))speechPose[key]=THREE.MathUtils.lerp(speechPose[key],speech[key],k);
  const sw=speechPose.weight;
  const pointing=behavior.state==='point';
  const canIdle=behavior.state==='idle'&&!speaking&&sw<.01&&!reducedMotion;
  if(newReaction&&requestedState==='celebrate'&&!reducedMotion){caneTime=0;caneMode='celebrate';idleWait=0;}
  else if(newReaction&&requestedState!=='idle'){caneTime=-1;}
  const celebrating=caneMode==='celebrate'&&caneTime>=0&&['celebrate','idle'].includes(behavior.state)&&!reducedMotion;
  if(!canIdle&&!celebrating){idleWait=0;caneTime=-1;caneRequested=false;}
  else if(caneTime<0){idleWait+=dt;if(caneRequested||idleWait>=nextCane){caneTime=0;caneMode='idle';idleWait=0;caneRequested=false;}}
  else {caneRequested=false;caneTime+=dt;if(caneTime>=4.8){caneTime=-1;nextCane=18+Math.random()*12;}}
  const caneWeight=pointing?1:caneTime<0?0:ease(caneTime/.55)*(1-ease((caneTime-4.1)/.7));
  // Pop, rise in a small arc, double somersault, hovering bow, then wink away.
  const wasVisible=cane.visible;
  const reveal=ease((caneTime-.18)/.26),vanish=1-ease((caneTime-4.1)/.35);
  const caneScale=pointing?1:caneTime<0?0:reveal*vanish*(1+.18*Math.sin(Math.PI*ease((caneTime-.18)/.5)));
  cane.visible=caneScale>0;cane.scale.setScalar(caneScale);
  if(cane.visible&&!wasVisible&&!pointing)root.dispatchEvent({type:'cane-pop',phase:'appear'});
  if(wasVisible&&!cane.visible&&caneTime>=4.45)root.dispatchEvent({type:'cane-pop',phase:'disappear'});
  const celebration=caneMode==='celebrate';
  const pointWeight=celebration&&caneTime>=0?ease((caneTime-.4)/.25)*(1-ease((caneTime-2.15)/.3)):0;
  const twirl=celebration?ease((caneTime-2.45)/1.3):ease((caneTime-.85)/2.05),bow=celebration?0:Math.sin(Math.PI*ease((caneTime-3.05)/.85));
  cane.position.set(1.48+.12*Math.sin(twirl*Math.PI*2),1.05+.28*Math.sin(twirl*Math.PI)+.045*Math.sin(caneTime*3),.35+.12*Math.sin(twirl*Math.PI*2));
  cane.position.y+=.75*pointWeight;
  cane.rotation.set(0,.24*Math.sin(twirl*Math.PI),.1+.2*bow);
  caneSpin.rotation.set(Math.PI*4*twirl,0,.06*Math.sin(caneTime*3));
  if(pointWeight>0){
   // Victory salute: raise the gold knob, with the shaft hanging below it.
   // Keep a slight lean toward the viewer, rather than aiming the tip at them.
   floatRig.updateWorldMatrix(true,false);
   viewerTarget.copy(viewerPosition??new THREE.Vector3(0,1.6,8));
   floatRig.worldToLocal(viewerTarget);
   pointDirection.copy(viewerTarget).sub(cane.position);
   pointDirection.y=Math.max(.001,Math.hypot(pointDirection.x,pointDirection.z))*2.2;
   pointDirection.normalize().applyQuaternion(cane.quaternion.clone().invert());
   pointRotation.setFromUnitVectors(shaftDirection,pointDirection);
   caneSpin.quaternion.slerp(pointRotation,pointWeight);
  }
  if(pointing){
   // Presets are character-local (+Z is forward). A task position is world-space.
   // Camera movement must never change where the robot points in the game.
   floatRig.position.y=.17;bodyRig.rotation.set(0,0,0);
   if(taskWorldTarget){
    floatRig.updateWorldMatrix(true,false);viewerTarget.copy(taskWorldTarget);floatRig.worldToLocal(viewerTarget);
    taskArm=viewerTarget.x<0?0:1;
    pointDirection.copy(viewerTarget).sub(arms[taskArm].position);
   }else{
    pointDirection.set(taskDirection.x,taskDirection.y,taskDirection.z);
    taskArm=pointDirection.x<0?0:1;
   }
   if(pointDirection.lengthSq()<1e-10)pointDirection.set(0,0,1);
   pointDirection.normalize();
  }
  const popAge=caneTime-.18;
  popRing.visible=!pointing&&cane.visible&&popAge>=0&&popAge<.45;
  popRing.scale.setScalar(1+Math.max(0,popAge)*4);popMaterial.opacity=.65*(1-ease(popAge/.45));
  if(time>nextBlink&&(!speaking||speechLevel<.12)){blinkStart=time;nextBlink=time+3.5+Math.random()*2.8;}
  const bt=time-blinkStart;uniforms.blink.value=!pointing&&bt<.19?Math.sin(Math.PI*bt/.19)**2:0;
  uniforms.wink.value=THREE.MathUtils.lerp(uniforms.wink.value,pointing?1:0,reducedMotion?1:k);
  targetLids.fromArray(e.eyes);targetLids.lerp(new THREE.Vector4(speechPose.upperLeft,speechPose.upperRight,speechPose.smile,speechPose.smile),sw*.55);smoothLids.lerp(targetLids,k);uniforms.lids.value.copy(smoothLids);
  eyes.scale.setScalar(THREE.MathUtils.lerp(1,speechPose.eyeScale,sw));
  let gx=behavior.gaze.x,gy=behavior.gaze.y;
  if(behavior.state==='think'){gx=-.65;gy=.65;}
  gx=THREE.MathUtils.lerp(gx,.65,caneWeight*.55*(1-pointWeight));gy=THREE.MathUtils.lerp(gy,-.35,caneWeight*.55*(1-pointWeight));
  gx*=1-pointWeight;gy*=1-pointWeight;
  gx*=1-sw;gy*=1-sw;
  if(pointing){gx=pointDirection.x*.7;gy=pointDirection.y*.7;}
  smoothGaze.lerp(new THREE.Vector2(gx,gy),k);uniforms.gaze.value.copy(smoothGaze);
  uniforms.surprise.value=THREE.MathUtils.lerp(uniforms.surprise.value,behavior.state==='surprise'?1:0,k);
  smoothedTilt=THREE.MathUtils.lerp(smoothedTilt,e.tilt,k);smoothedLift=THREE.MathUtils.lerp(smoothedLift,e.lift,k);
  const motion=reducedMotion||pointing?0:1;
  const t=behavior.elapsed;
  const joy=behavior.state==='celebrate'?Math.sin(Math.min(t,2.6)*9)*Math.exp(-t*.6)*(1-sw):0;
  floatRig.position.y=.17+motion*(Math.sin(time*1.55)*.025+smoothedLift*(1-sw)+joy*.045+speechPose.lift*sw);
  bodyRig.rotation.z=motion*(Math.sin(time*.65)*.018+joy*.07);
  head.rotation.set((-smoothGaze.y*.075+speechPose.pitch*sw)*motion,(smoothGaze.x*.12+speechPose.yaw*sw)*motion,(smoothedTilt*(1-sw)+speechPose.roll*sw)*motion);
  head.rotation.z-=caneWeight*.055;
  if(pointing)head.rotation.z=-.075;
  arms.forEach((arm,i)=>{
   const s=i===0?-1:1;let angle=s*.09;
   if(behavior.state==='celebrate')angle=s*(1.5+joy*.18);
   if(['cheeky','dry','smug'].includes(behavior.state)&&i===1)angle=behavior.state==='dry'?.6:1.12;
   if(behavior.state==='think'&&i===0)angle=-1.85;
   if(behavior.state==='support')angle=s*.6;
   if(behavior.state==='surprise')angle=s*.9;
   angle=THREE.MathUtils.lerp(angle,i===0?speechPose.leftArm:speechPose.rightArm,sw);
   if(i===1)angle=THREE.MathUtils.lerp(angle,.65+.45*pointWeight+.17*Math.sin(twirl*Math.PI*2),caneWeight);
   const pointingArm=pointing&&i===taskArm;
   if(pointingArm){
    // Align the actual shoulder-to-flipper-tip axis with the task direction.
    armRestDirection.copy(flipperTips[i]).normalize();
    armPointRotation.setFromUnitVectors(armRestDirection,pointDirection);
    arm.quaternion.copy(armPointRotation);
    return;
   }
   const armTarget=pointing?s*.09:angle*motion;
   arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,armTarget,reducedMotion?1:k);
   arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,behavior.state==='think'&&i===0?-.5*motion:0,k);
   arm.rotation.y=THREE.MathUtils.lerp(arm.rotation.y,0,reducedMotion?1:k);
  });
  if(pointing){
   const i=taskArm,arm=arms[i];
   arm.localToWorld(taskTip.copy(flipperTips[i]));floatRig.worldToLocal(taskTip);
   arm.getWorldPosition(taskShoulder);floatRig.worldToLocal(taskShoulder);
   pointDirection.copy(taskTip).sub(taskShoulder).normalize();
   // The lower end of the 15%-enlarged cane floats 0.055 beyond the flipper.
   // Position from the actual tip every frame, so pose and camera changes stay joined.
   cane.position.copy(taskTip).addScaledVector(pointDirection,.4525*1.15+.055);
   cane.rotation.set(0,0,0);caneSpin.quaternion.setFromUnitVectors(shaftDirection,pointDirection);
  }
 }
 function makeExportModel(){
  const copy=root.clone(true);copy.position.set(0,0,0);copy.scale.setScalar(1);copy.rotation.set(0,0,0);
  // The neutral export never captures a transient prop or a partially grown cane.
  copy.getObjectByName('IdleCane').removeFromParent();
  copy.getObjectByName('FloatRig').position.y=.17;
  for(const name of ['HeadRig','BodyRig','FlipperLeftRig','FlipperRightRig'])copy.getObjectByName(name).rotation.set(0,0,0);
  const live=copy.getObjectByName('LiveDisplayEyes');live.removeFromParent();
  // Shader materials are not glTF portable. Static emissive eyes travel in the GLB;
  // the included JS factory is the authoritative live model and controller.
  const exportHead=copy.getObjectByName('HeadRig');
  for(const s of [-1,1]){ball(s<0?'EyeLeftStatic':'EyeRightStatic',glow,exportHead,[s*.334,-.025,.775],[.167,.184,.014],32);}
  return copy;
 }
 let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
 return {root,head,behavior,update,playCane,pointAtTask,makeExportModel,triangles:Math.round(triangles)};
}
