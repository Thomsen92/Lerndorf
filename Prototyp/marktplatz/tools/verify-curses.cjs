const {chromium}=require('../../../web/node_modules/playwright');const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'assets/collection'),catalog=JSON.parse(fs.readFileSync(path.join(base,'catalog.json'))),cards=catalog.cards.filter(c=>c.series==='classroom-curses');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--use-angle=d3d11']});const report={checks:[],errors:[],visualReview:'Claude/user acceptance pending; no screenshots'};const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:5188/collection.html?card=bloody-friday-card');await page.waitForFunction(()=>window.collectionPreview?.ready);
 check('eight satire cards with flavour-only effects',cards.length===8&&cards.every(c=>c.kind==='humour'&&c.satire&&c.effectMode==='flavour-only'&&c.effects.length===2));
 const expected=['Bloody Friday','Hausordnung abschreiben','Verweis','Verschärfter Verweis für Vapen','Strich! Hausaufgabe vergessen','Kerim ab in die Kühlbox','Cüss digga das Schwer','Can I go of the toilet'];
 check('all eight requested titles preserved',cards.every((c,i)=>c.name===expected[i]));
 const hashes=new Set();
 for(const card of cards){
  await page.evaluate(id=>window.collectionPreview.selectCard(id),card.id);
  check(card.id+': English effect and self-aware remark displayed',await page.evaluate(c=>document.getElementById('card-effects').textContent===c.effects.join('')&&document.getElementById('card-flavour').textContent===c.flavour&&!document.getElementById('satire-effects').hidden,card));
  check(card.id+': three-call thin textured card',await page.evaluate(()=>{const s=window.collectionPreview.stats();return s.calls<=3&&s.triangles===112;}));
  const svg=fs.readFileSync(path.join(base,card.front),'utf8'),encoded=svg.split('data:image/png;base64,')[1].split('"')[0],art=fs.readFileSync(path.join(base,card.artwork.file));hashes.add(crypto.createHash('sha256').update(art).digest('hex'));
  check(card.id+': generated image actually embedded in print',Buffer.from(encoded,'base64').equals(art));
  for(const side of ['front','back']){
   const layout=await page.evaluate(async url=>{const raw=await fetch(url).then(r=>r.text()),doc=new DOMParser().parseFromString(raw,'image/svg+xml'),svg=document.importNode(doc.documentElement,true);svg.style.position='absolute';svg.style.left='-10000px';document.body.append(svg);await document.fonts.ready;const errors=[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {text:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height};}).filter(b=>b.x<26||b.y<26||b.x+b.w>742||b.y+b.h>1126);svg.remove();return errors;},'./assets/collection/'+card[side]);
   check(card.id+': '+side+' print text fits the card',layout.length===0);
  }
 }
 check('eight distinct generated illustrations',hashes.size===8);
 await page.locator('#open-curses').click();await page.waitForFunction(()=>window.collectionPreview.stats().filtered.length===8&&!window.collectionPreview.stats().loading);check('pack entry filters exactly the eight comedy cards',await page.evaluate(()=>window.collectionPreview.stats().filtered.length===8));
 await page.evaluate(()=>window.collectionPreview.selectCard('toilet-question-card'));check('toilet title preserves joke and effect supplies correction',await page.locator('#card-effects').textContent().then(t=>t.includes('Can I go to the toilet, please?')));
 await page.evaluate(()=>window.collectionPreview.selectCard('highlight-halloween-card'));check('satirical effects do not leak onto the Legendary cover',await page.locator('#satire-effects').isHidden());
 check('Highlight remains the only Legendary',catalog.cards.filter(c=>c.rarity==='legendary').map(c=>c.id).join()==='highlight-halloween-card');check('no runtime or missing-resource errors',report.errors.length===0);report.success=true;
}finally{await browser.close();fs.writeFileSync(path.join(base,'prints/curses/browser-audit.json'),JSON.stringify(report,null,2)+'\n');}})().catch(e=>{console.error(e);process.exit(1);});
