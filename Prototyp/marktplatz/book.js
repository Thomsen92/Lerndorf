import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const stage=document.getElementById('book-stage'),status=document.getElementById('book-loading'),scene=new T.Scene();
const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);stage.append(renderer.domElement);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const camera=new T.PerspectiveCamera(35,1,.01,10),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reduced.matches;controls.enablePan=false;controls.minDistance=.32;controls.maxDistance=1.1;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI-.15;
reduced.addEventListener('change',()=>{controls.enableDamping=false;controls.update();controls.enableDamping=!reduced.matches;});
scene.add(new T.HemisphereLight('#fff3dc','#665064',1.4));const light=new T.DirectionalLight('#fff4e8',2);light.position.set(-2,4,5);scene.add(light);
const errors=[];let model,raf=0;
function pose(x,z){controls.enableDamping=false;controls.update();camera.position.set(x,.035,z);controls.target.set(0,0,0);controls.update();controls.enableDamping=!reduced.matches;}
function front(){pose(.075,.56);}
function back(){pose(-.075,-.56);}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);addEventListener('resize',resize);document.getElementById('book-front').addEventListener('click',front);document.getElementById('book-back').addEventListener('click',back);
stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const s=new T.Spherical().setFromVector3(camera.position);if(event.key==='ArrowLeft')s.theta-=.12;if(event.key==='ArrowRight')s.theta+=.12;if(event.key==='ArrowUp')s.phi=Math.max(.15,s.phi-.1);if(event.key==='ArrowDown')s.phi=Math.min(Math.PI-.15,s.phi+.1);camera.position.setFromSpherical(s);controls.update();});
function frame(){controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(frame);}function resume(){cancelAnimationFrame(raf);if(!document.hidden)frame();}document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else resume();});
try{const gltf=await new GLTFLoader().loadAsync('./assets/collection/textbook/highlight-halloween-book.glb');model=gltf.scene;scene.add(model);model.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());});status.hidden=true;if(new URLSearchParams(location.search).get("view")==="back")back();else front();resize();resume();window.bookPreview={ready:true,front,back,camera:()=>camera.position.toArray(),stats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,errors:[...errors],size:new T.Box3().setFromObject(model).getSize(new T.Vector3()).toArray(),textures:[...new Set(model.children.flatMap(o=>[].concat(o.material||[]).filter(m=>m.map).map(m=>m.map.image.width+'x'+m.map.image.height)))]})};}catch(error){errors.push(error.message);status.textContent='Das Buch konnte nicht geladen werden.';console.error(error);}
