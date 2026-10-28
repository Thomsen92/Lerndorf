import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const $ = id => document.getElementById(id);
const base = './assets/collection/';
const catalog = await fetch(`${base}catalog.json`).then(r => { if (!r.ok) throw new Error('Collection catalog could not load'); return r.json(); });
const scene = new T.Scene(), holder = new T.Group(); scene.add(holder);
const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.setClearColor(0,0); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); $('card-stage').appendChild(renderer.domElement);
const camera = new T.PerspectiveCamera(35,1,.1,40), controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 3.5; controls.maxDistance = 8;
controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI-.25;
camera.position.set(.25,.1,5.3); controls.target.set(0,0,0); controls.update();
scene.add(new T.HemisphereLight('#e9ded3','#63506c',2.0));
const key = new T.DirectionalLight('#ffe6be',3.0); key.position.set(-3,5,7); scene.add(key);
const rim = new T.DirectionalLight('#ca7181',2.3); rim.position.set(4,2,-3); scene.add(rim);
const loader = new GLTFLoader(), cache = new Map(), errors = [];
let current = null, flipped = false, targetRotation = 0, token = 0, activeSection = 'cards', raf = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function resize() { const stage = $('card-stage'), w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w,h); camera.aspect = w/h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe($('card-stage')); addEventListener('resize',resize);
function element(tag, className, text) { const el = document.createElement(tag); if (className) el.className=className; if (text!==undefined) el.textContent=text; return el; }

for (const card of catalog.cards) {
  const button = element('button','card-choice'); button.type='button'; button.dataset.id=card.id;
  button.style.setProperty('--card-color',card.color); button.setAttribute('aria-pressed','false');
  const img=element('img'); img.src=base+card.front; img.alt='';
  const words=element('span'); words.append(element('strong','',card.name),element('small','',card.topic)); button.append(img,words);
  button.addEventListener('click',()=>selectCard(card.id)); $('card-picker').append(button);
}
for (const frame of catalog.frames) {
  const item=element('article','frame-item'); item.style.setProperty('--card-color',frame.color);
  const portrait=element('div','portrait'); portrait.append(element('div','silhouette'));
  const img=element('img'); img.src=base+frame.file; img.alt=frame.name+' profile frame'; portrait.append(img);
  const copy=element('div'); copy.append(element('span','rarity',frame.rarity),element('h3','',frame.name),element('p','',frame.description));
  const download=element('a','download','Download frame ↓'); download.href=base+frame.file; download.download=''; copy.append(download);
  item.append(portrait,copy); $('frame-grid').append(item);
}
for (const title of catalog.titles) {
  const item=element('article','title-item'), img=element('img'); img.src=base+title.file; img.alt=title.name;
  const goal=element('p','',`Collection idea: ${title.idea}`);
  const link=element('a','download','Download title ↓'); link.href=base+title.file; link.download='';
  item.append(img,goal,link); $('title-grid').append(item);
}

async function selectCard(id) {
  const card = catalog.cards.find(c=>c.id===id); if (!card) throw new Error(`Unknown card: ${id}`);
  const request=++token; $('card-loading').hidden=false; $('card-loading').textContent='Opening the card…';
  try {
    if (!cache.has(id)) cache.set(id,loader.loadAsync(base+card.model).then(g=>g.scene));
    const model=await cache.get(id); if(request!==token)return;
    holder.clear(); model.updateMatrixWorld(true);
    // Bounds are taken only once, before normalization, so repeat selections do
    // not compound the scale or move the card away from the viewer.
    if(!model.userData.normalized) {
      const bounds=new T.Box3().setFromObject(model), center=bounds.getCenter(new T.Vector3()), size=bounds.getSize(new T.Vector3()), scale=2.7/size.y;
      model.scale.setScalar(scale); model.position.copy(center).multiplyScalar(-scale); model.userData.normalized=true;
      model.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m.map)m.map.anisotropy=4;});
    }
    holder.add(model); holder.rotation.set(0,0,0); targetRotation=0; flipped=false; current=card;
    camera.position.set(.25,.1,5.3); controls.target.set(0,0,0); controls.update();
    $('flip').textContent='Turn card over ↻'; $('card-name').textContent=card.name; $('card-topic').textContent=card.topic;
    $('card-rarity').textContent=card.rarity; $('card-key').textContent=card.key; $('card-tip').textContent=card.tip;
    document.querySelector('.field-notes').style.setProperty('--card-color',card.color);
    $('card-notes').replaceChildren(...card.notes.map(note=>element('li','',note)));
    $('download-card').href=base+card.model;
    document.querySelectorAll('.card-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
    $('card-loading').hidden=true; resize();
  } catch(error) { errors.push(error.message); $('card-loading').textContent=`This card could not load. ${error.message}`; console.error(error); throw error; }
}
function flipCard() { flipped=!flipped; targetRotation=flipped?Math.PI:0; if(reduced.matches)holder.rotation.y=targetRotation; $('flip').textContent=flipped?'Show the front ↻':'Turn card over ↻'; }
$('flip').addEventListener('click',flipCard);
for(const section of ['cards','rewards'])$('tab-'+section).addEventListener('click',()=>{
  activeSection=section;
  for(const name of ['cards','rewards']) { $(name+'-section').hidden=name!==section; $('tab-'+name).setAttribute('aria-pressed',String(name===section)); }
  if(section==='cards') { resize(); resume(); } else cancelAnimationFrame(raf);
});
function frame() { controls.update(); if(!reduced.matches)holder.rotation.y+=(targetRotation-holder.rotation.y)*.12; renderer.render(scene,camera); raf=requestAnimationFrame(frame); }
function resume() { cancelAnimationFrame(raf); if(!document.hidden&&activeSection==='cards')raf=requestAnimationFrame(frame); }
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else resume();});
await selectCard(catalog.cards[0].id); resize(); resume();
window.collectionPreview={ready:true,selectCard,flip:flipCard,
  stats:()=>({card:current?.id,flipped,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,errors:[...errors],cards:catalog.cards.length,frames:catalog.frames.length,titles:catalog.titles.length}),
  bounds:()=>{const size=new T.Box3().setFromObject(holder).getSize(new T.Vector3());return size.toArray();},
};
