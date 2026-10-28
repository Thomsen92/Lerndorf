import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const $=id=>document.getElementById(id),base='./assets/collection/';
const catalog=await fetch(base+'catalog.json').then(r=>{if(!r.ok)throw Error('The almanac could not load');return r.json();});
const ranks=['normal','rare','epic','legendary'],names={normal:'Normal',rare:'Rare',epic:'Epic',legendary:'Legendary'};
const colors={normal:'#c7b891',rare:'#95b6d2',epic:'#b198c9',legendary:'#dbb166'};
const cards=[...catalog.cards].sort((a,b)=>ranks.indexOf(a.rarity)-ranks.indexOf(b.rarity)||a.number-b.number);
const scene=new T.Scene(),holder=new T.Group();scene.add(holder);
const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));$('card-stage').appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(35,1,.1,40),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3.4;controls.maxDistance=8;controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI-.2;
scene.add(new T.HemisphereLight('#e9ded3','#63506c',2));
const key=new T.DirectionalLight('#ffe6be',3);key.position.set(-3,5,7);scene.add(key);
const rim=new T.DirectionalLight('#ca7181',2.3);rim.position.set(4,2,-3);scene.add(rim);
const loader=new GLTFLoader(),cache=new Map(),pending=new Map(),errors=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let current=null,mode='card',rarity='all',query='',flipped=false,targetRotation=0,token=0,activeSection='cards',raf=0,lastFrame=0,loading=false;
const CACHE_LIMIT=4;
const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const printLink=element('a','download','Druckbild in voller Größe ↗');printLink.id='inspect-print';printLink.target='_blank';printLink.rel='noopener';printLink.hidden=true;$('download-card').before(printLink);
const satirePanel=element('section','satire-effects');satirePanel.id='satire-effects';satirePanel.hidden=true;satirePanel.append(element('h3','','Imaginary effect'));const effectList=element('ul');effectList.id='card-effects';satirePanel.append(effectList);const remark=element('p','self-aware-remark');remark.id='card-flavour';satirePanel.append(remark);$('card-tip').before(satirePanel);
function filtered(){return cards.filter(c=>(rarity==='all'||c.rarity===rarity)&&(!query||[c.name,c.topic,c.kind,c.key,c.series?.replaceAll('-',' '),c.source?.author,c.source?.work,...c.notes].join(' ').toLowerCase().includes(query)));}
function resize(){const s=$('card-stage'),w=s.clientWidth,h=s.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(current?.format==='printed-surface'&&!loading&&holder.children.length)resetView();}
new ResizeObserver(resize).observe($('card-stage'));addEventListener('resize',resize);
function resetView(){
  controls.enableDamping=false;controls.update();controls.target.set(0,0,0);
  if(current?.format==='printed-surface'&&holder.children.length){const size=new T.Box3().setFromObject(holder.children[0]).getSize(new T.Vector3()),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2)),distance=Math.max(size.y/(2*tan),size.x/(2*tan*camera.aspect))*1.2;controls.minDistance=Math.min(3.4,distance*.45);controls.maxDistance=Math.max(8,distance*1.7);camera.position.set(.05,.02,distance);}
  else{controls.minDistance=3.4;controls.maxDistance=8;camera.position.set(.25,.1,5.3);}
  controls.update();controls.enableDamping=true;
}
function release(model){const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [].concat(o.material)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});for(const v of geometries)v.dispose();for(const v of materials)v.dispose();for(const v of textures)v.dispose();}
function trimCache(){for(const [id,model] of cache){if(cache.size<=CACHE_LIMIT)break;if(model===holder.children[0])continue;cache.delete(id);release(model);}}
async function loadModel(card,inspection){
  const id=card.id+':'+inspection;
  if(cache.has(id)){const model=cache.get(id);cache.delete(id);cache.set(id,model);return model;}
  if(!pending.has(id))pending.set(id,loader.loadAsync(base+(inspection==='motif'?card.motifModel:card.model)).then(g=>{
    const model=g.scene;model.updateMatrixWorld(true);
    const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
    const scale=card.format==='printed-surface'?2.7/Math.max(size.x,size.y,size.z):inspection==='motif'?2.2/Math.max(size.x,size.y,size.z):2.7/size.y;
    model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);
    model.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m.map)m.map.anisotropy=4;});
    cache.set(id,model);pending.delete(id);return model;
  }).catch(e=>{pending.delete(id);throw e;}));
  return pending.get(id);
}
function renderFilters(){
  $('rarity-filters').replaceChildren();
  for(const r of ['all',...ranks]){
    const count=r==='all'?cards.length:cards.filter(c=>c.rarity===r).length;
    const b=element('button','chapter-button',`${r==='all'?'All chapters':names[r]} · ${count}`);b.type='button';b.dataset.rarity=r;b.setAttribute('aria-pressed',String(rarity===r));b.style.setProperty('--chapter-color',colors[r]||'#d9a65d');
    b.addEventListener('click',()=>setRarity(r));$('rarity-filters').append(b);
  }
}
function renderIndex(){
  const list=filtered();$('card-picker').replaceChildren();let chapter='';
  for(const card of list){
    if(chapter!==card.rarity){chapter=card.rarity;$('card-picker').append(element('h3','index-chapter',names[chapter]));}
    const button=element('button','card-choice');button.type='button';button.dataset.id=card.id;button.style.setProperty('--card-color',colors[card.rarity]);button.setAttribute('aria-pressed',String(current?.id===card.id));
    const image=element('img');image.src=base+card.thumbnail;image.alt='';image.loading='lazy';image.width=35;image.height=53;
    const copy=element('span');copy.append(element('strong','',card.name),element('small','',card.topic));button.append(image,copy);button.addEventListener('click',()=>selectCard(card.id));$('card-picker').append(button);
  }
  $('index-summary').textContent=`${list.length} of ${cards.length} pages`;$('book-shell').hidden=!list.length;$('empty-cards').hidden=!!list.length;
  updatePaging();return list;
}
function updatePaging(){const list=filtered(),index=list.findIndex(c=>c.id===current?.id);$('page-position').textContent=list.length?`${Math.max(0,index)+1} / ${list.length}`:'0 / 0';$('previous-card').disabled=index<=0;$('next-card').disabled=index<0||index>=list.length-1;}
async function setRarity(value){if(value!=='all'&&!ranks.includes(value))throw Error('Unknown rarity');rarity=value;renderFilters();const list=renderIndex();if(list.length)await selectCard(list.some(c=>c.id===current?.id)?current.id:list[0].id);}
async function setSearch(value){query=value.trim().toLowerCase();$('card-search').value=value;const list=renderIndex();if(list.length)await selectCard(list.some(c=>c.id===current?.id)?current.id:list[0].id);}
function showCopy(card){
  const printed=card.format==='printed-surface';$('mode-motif').hidden=printed;$('mode-card').textContent=printed?'Printed card':'Card';
  $('inspect-print').hidden=!printed;$('inspect-print').href=base+card.front;
  renderer.toneMapping=printed?T.NoToneMapping:T.ACESFilmicToneMapping;renderer.toneMappingExposure=printed?1:1.1;
  $('card-name').textContent=card.name;$('card-topic').textContent=card.topic;$('card-rarity').textContent=names[card.rarity];$('card-kind').textContent=(card.kind||'grammar').replaceAll('-',' ');
  $('card-key').textContent=card.key;$('card-tip').textContent=card.tip;
  $('verse-excerpt').hidden=!card.source;$('verse-excerpt').textContent=card.source?.excerptLines.join('\n')||'';
  const notes=card.satire?[card.description]:card.source?card.notes.slice(card.source.excerptLines.length):card.notes;
  $('satire-effects').hidden=!card.satire;$('card-effects').replaceChildren(...(card.effects||[]).map(value=>element('li','',value)));$('card-flavour').textContent=card.flavour||'';
  $('card-notes').replaceChildren(...notes.map(n=>element('li','',n)));$('card-number').textContent=`Plate ${String(card.number).padStart(2,'0')} · ${cards.length} designs`;
  $('card-credit').replaceChildren();$('card-credit').hidden=!card.source&&!card.reference;
  if(card.source){const a=element('a','',`${card.source.author} · ${card.source.work} ↗`);a.href=card.source.url;a.target='_blank';a.rel='noopener noreferrer';$('card-credit').append(a,element('small','',card.source.location));}
  else if(card.reference){$('card-credit').append(element('span','',`Highlight 8 · ${card.reference.page}`),element('small','','Halloween adaptation · new dialogue'));}
  document.querySelector('.field-notes').style.setProperty('--card-color',colors[card.rarity]);
  $('download-card').href=base+(mode==='motif'?card.motifModel:card.model);$('download-card').textContent=mode==='motif'?'Download 3D motif ↓':'Download 3D card ↓';
  $('flip').hidden=mode!=='card';$('flip').textContent='Turn card over ↻';
  $('viewer-hint').textContent=mode==='motif'?'Drag to turn the motif · Scroll to zoom':'Drag to rotate · Scroll to zoom';
  for(const m of ['card','motif'])$('mode-'+m).setAttribute('aria-pressed',String(m===mode));
}
async function selectCard(id){
  const card=cards.find(c=>c.id===id);if(!card)throw Error('Unknown card: '+id);
  if(card.format==='printed-surface')mode='card';
  if(!filtered().some(c=>c.id===id)){rarity='all';query='';$('card-search').value='';renderFilters();}
  current=card;const request=++token;loading=true;$('card-loading').hidden=false;$('card-loading').textContent=mode==='motif'?'Opening the motif…':'Turning the page…';
  showCopy(card);renderIndex();
  try{
    const model=await loadModel(card,mode);
    if(request!==token){trimCache();return;}
    holder.clear();holder.add(model);holder.rotation.set(0,0,0);targetRotation=0;flipped=false;resetView();trimCache();
    $('card-loading').hidden=true;loading=false;resize();updatePaging();
    const url=new URL(location.href);url.searchParams.set('card',card.id);url.searchParams.set('mode',mode);history.replaceState(null,'',url);
  }catch(error){errors.push(error.message);loading=false;$('card-loading').textContent='This page could not open. Choose another card to continue.';console.error(error);throw error;}
}
async function setMode(value){if(!['card','motif'].includes(value))throw Error('Unknown inspection mode');mode=value;if(current)await selectCard(current.id);}
async function turnPage(direction){const list=filtered(),index=list.findIndex(c=>c.id===current?.id),next=list[index+direction];if(next)await selectCard(next.id);}
function flip(){if(mode!=='card')return;flipped=!flipped;targetRotation=flipped?Math.PI:0;if(reduced.matches)holder.rotation.y=targetRotation;$('flip').textContent=flipped?'Show the front ↻':'Turn card over ↻';}
function setSection(section){activeSection=section;for(const name of ['cards','achievements']){$(name+'-section').hidden=name!==section;$('tab-'+name).setAttribute('aria-pressed',String(name===section));}if(section==='cards'){resize();resume();}else cancelAnimationFrame(raf);}
$('flip').addEventListener('click',flip);$('reset-card-view').addEventListener('click',resetView);
$('open-curses').addEventListener('click',async()=>{setSection('cards');await setRarity('all');await setSearch('classroom curses');$('cards-section').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});});
for(const value of ['card','motif'])$('mode-'+value).addEventListener('click',()=>setMode(value));
for(const section of ['cards','achievements'])$('tab-'+section).addEventListener('click',()=>setSection(section));
$('back-to-cards').addEventListener('click',()=>setSection('cards'));
$('previous-card').addEventListener('click',()=>turnPage(-1));$('next-card').addEventListener('click',()=>turnPage(1));
$('card-search').addEventListener('input',e=>setSearch(e.target.value));$('clear-filters').addEventListener('click',async()=>{query='';$('card-search').value='';await setRarity('all');});
$('card-stage').addEventListener('keydown',event=>{const step={ArrowLeft:-.12,ArrowRight:.12,ArrowUp:-.08,ArrowDown:.08}[event.key];if(step===undefined)return;event.preventDefault();const s=new T.Spherical().setFromVector3(camera.position);if(event.key==='ArrowLeft'||event.key==='ArrowRight')s.theta+=step;else s.phi=T.MathUtils.clamp(s.phi+step,.2,Math.PI-.2);camera.position.setFromSpherical(s);controls.update();});
addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement||$('card-stage').contains(event.target)||activeSection!=='cards')return;if(event.key==='ArrowLeft'){event.preventDefault();turnPage(-1);}if(event.key==='ArrowRight'){event.preventDefault();turnPage(1);}});
function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;controls.update();if(!reduced.matches)holder.rotation.y+=(targetRotation-holder.rotation.y)*Math.min(1,dt*9);renderer.render(scene,camera);raf=requestAnimationFrame(frame);}
function resume(){cancelAnimationFrame(raf);if(!document.hidden&&activeSection==='cards'){lastFrame=performance.now();raf=requestAnimationFrame(frame);}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else resume();});
$('total-cards').textContent=cards.length;renderFilters();renderIndex();
const params=new URLSearchParams(location.search);if(params.get('mode')==='motif')mode='motif';
await selectCard(cards.find(c=>c.id===params.get('card'))?.id||cards[0].id);resize();resume();
window.collectionPreview={ready:true,selectCard,setMode,setRarity,setSearch,turnPage,flip,setSection,
  stats:()=>({card:current?.id,mode,rarity,query,filtered:filtered().map(c=>c.id),flipped,loading,section:activeSection,cacheSize:cache.size,cacheLimit:CACHE_LIMIT,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,errors:[...errors],cards:cards.length,frames:catalog.frames.length,titles:catalog.titles.length}),
  bounds:()=>new T.Box3().setFromObject(holder).getSize(new T.Vector3()).toArray(),camera:()=>camera.position.toArray(),
};
