const {chromium}=require('../../../web/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/collection/catalog.json')));
const BASE='http://127.0.0.1:5188/';
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--use-angle=d3d11']});
  const report={checks:[],errors:[],models:[],visualReview:'User review pending; no screenshots'};
  const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),requests=[];
    page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
    page.on('request',r=>{requests.push(r.url());if(!r.url().startsWith(BASE)&&!/^(data:|blob:)/.test(r.url()))report.errors.push('External request: '+r.url());});
    await page.goto(BASE+'collection.html');await page.waitForFunction(()=>window.collectionPreview?.ready,null,{timeout:60000});
    check('50 active cards and exactly two collection sections',await page.evaluate(()=>window.collectionPreview.stats().cards===50&&document.querySelectorAll('nav button').length===2));
    check('only the active GLB loads on first visit',requests.filter(u=>u.endsWith('.glb')).length===1);
    check('30 original cards, twenty prints and eight preserved benched figures',catalog.cards.length===50&&new Set(catalog.cards.map(c=>c.id)).size===50&&catalog.cards.filter(c=>c.number<=30).length===30&&catalog.cards.filter(c=>c.format==='printed-surface').length===20&&catalog.archivedCards.length===8&&catalog.archivedCards.every(c=>c.status==='benched'&&fs.existsSync(path.join(ROOT,'assets/collection',c.model))));
    check('Highlight cover is the only active Legendary card',catalog.cards.filter(c=>c.rarity==='legendary').map(c=>c.id).join()==='highlight-halloween-card');
    check('same cover artwork serves the almanac and the collectible',catalog.almanacCover.cardId==='highlight-halloween-card'&&catalog.cards.find(c=>c.id===catalog.almanacCover.cardId).front===catalog.almanacCover.front&&await page.locator('#almanac-cover').getAttribute('href')==='#cards-section'&&await page.locator('#open-legendary').getAttribute('href')==='./collection.html?card=highlight-halloween-card');
    for(const id of ['blood-moon-story','fortune-brave','knowledge-power']){
      const card=catalog.cards.find(c=>c.id===id),svg=fs.readFileSync(path.join(ROOT,'assets/collection',card.front),'utf8');
      check(id+': former Legendary is Epic in data and print',card.rarity==='epic'&&svg.includes('EPIC')&&!svg.includes('LEGENDARY'));
    }
    const verses=catalog.cards.filter(c=>c.kind==='rhyme');
    check('all six verse cards contain verifiable original excerpts',verses.length===6&&verses.every(c=>c.source?.type==='original-excerpt'&&/^https:\/\//.test(c.source.url)&&c.source.excerptLines.length>=2));
    for(const card of catalog.cards.filter(c=>c.reference?.sourceImage)){
      const source=fs.readFileSync(path.join(ROOT,'assets/collection',card.front),'utf8'),embedded=source.split('data:image/png;base64,')[1].split('"')[0];
      check(card.id+': original source image embedded byte-for-byte',Buffer.from(embedded,'base64').equals(fs.readFileSync(path.join(ROOT,'assets/collection',card.reference.sourceImage))));
    }
    const ordered=await page.evaluate(()=>window.collectionPreview.stats().filtered);
    const rank={normal:0,rare:1,epic:2,legendary:3};
    check('index is sorted Normal, Rare, Epic, Legendary',ordered.every((id,i)=>!i||rank[catalog.cards.find(c=>c.id===ordered[i-1]).rarity]<=rank[catalog.cards.find(c=>c.id===id).rarity]));
    for(const card of catalog.cards){
      await page.evaluate(async id=>{await window.collectionPreview.setMode('card');await window.collectionPreview.selectCard(id);},card.id);
      await page.waitForTimeout(75);
      let stats=await page.evaluate(()=>window.collectionPreview.stats()),bounds=await page.evaluate(()=>window.collectionPreview.bounds());
      const printed=card.format==='printed-surface';
      check(card.id+': card render and dimensions',stats.card===card.id&&stats.calls>0&&stats.calls<=8&&stats.triangles<=4000&&Math.abs((printed?Math.max(...bounds):bounds[1])-2.7)<.01);
      await page.locator('#flip').click();check(card.id+': front/back switch',await page.evaluate(()=>window.collectionPreview.stats().flipped));
      if(printed){
        check(card.id+': full-size print link and no sculpted motif control',await page.locator('#inspect-print').isVisible()&&await page.locator('#mode-motif').isHidden());
        check(card.id+': bounded model cache',stats.cacheSize<=4);
        const framing=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),position=window.collectionPreview.camera(),stage=document.getElementById('card-stage'),camera=new T.PerspectiveCamera(35,stage.clientWidth/stage.clientHeight,.1,40);camera.position.fromArray(position);camera.lookAt(0,0,0);camera.updateMatrixWorld();return window.collectionPreview.bounds().flatMap((_,i)=>i?[]:[[-1,-1],[1,-1],[-1,1],[1,1]]).every(([x,y])=>{const b=window.collectionPreview.bounds(),p=new T.Vector3(x*b[0]/2,y*b[1]/2,0).project(camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1;});});
        check(card.id+': full printed surface fits the viewport',framing);
        continue;
      }
      await page.evaluate(()=>window.collectionPreview.setMode('motif'));await page.waitForTimeout(75);
      stats=await page.evaluate(()=>window.collectionPreview.stats());bounds=await page.evaluate(()=>window.collectionPreview.bounds());
      check(card.id+': separate 3D motif render',stats.mode==='motif'&&stats.calls>0&&stats.calls<=8&&stats.triangles>0&&stats.triangles<=4000&&Math.abs(Math.max(...bounds)-2.2)<.01&&Math.min(...bounds)>.005);
      check(card.id+': bounded model cache',stats.cacheSize<=4);
      if(card.source){
        check(card.id+': exact excerpt and attribution visible',await page.evaluate(c=>document.getElementById('verse-excerpt').textContent===c.source.excerptLines.join('\n')&&document.querySelector('#card-credit a').href===c.source.url,card));
      }
      if(card.reference){check(card.id+': adaptation labelled',await page.locator('#card-credit').innerText().then(t=>t.includes('Halloween adaptation')));}
      report.models.push({id:card.id,motifTriangles:stats.triangles,motifBounds:bounds});
    }
    const before=await page.evaluate(()=>window.collectionPreview.camera());
    const stage=await page.locator('#card-stage').boundingBox();
    await page.mouse.move(stage.x+stage.width*.45,stage.y+stage.height*.5);await page.mouse.down();await page.mouse.move(stage.x+stage.width*.7,stage.y+stage.height*.5,{steps:8});await page.mouse.up();await page.waitForTimeout(250);
    check('motif can actually be rotated with the mouse',JSON.stringify(before)!==JSON.stringify(await page.evaluate(()=>window.collectionPreview.camera())));
    for(const [rarity,count] of Object.entries({normal:18,rare:17,epic:14,legendary:1})){
      await page.evaluate(r=>window.collectionPreview.setRarity(r),rarity);
      const ids=await page.evaluate(()=>window.collectionPreview.stats().filtered);
      check(rarity+': correct chapter contents',ids.length===count&&ids.every(id=>catalog.cards.find(c=>c.id===id).rarity===rarity));
    }
    await page.evaluate(async()=>{await window.collectionPreview.setRarity('all');await window.collectionPreview.setSearch('proverb');});
    check('proverbs can be found',await page.evaluate(()=>window.collectionPreview.stats().filtered.length>=10));
    await page.evaluate(()=>window.collectionPreview.setSearch('rhyme'));
    check('six authentic verse cards can be found',await page.evaluate(()=>window.collectionPreview.stats().filtered.length===6));
    const first=await page.evaluate(()=>window.collectionPreview.stats().card);await page.locator('#next-card').click();
    await page.waitForFunction(id=>window.collectionPreview.stats().card!==id&&!window.collectionPreview.stats().loading,first);
    await page.locator('#previous-card').click();await page.waitForFunction(id=>window.collectionPreview.stats().card===id&&!window.collectionPreview.stats().loading,first);
    check('previous/next pages stay within the filtered chapter',await page.evaluate(()=>window.collectionPreview.stats().card)===first);
    await page.locator('#card-search').fill('Knowledge Is Power');await page.waitForFunction(()=>window.collectionPreview.stats().filtered.length===1&&!window.collectionPreview.stats().loading);
    check('single-result pages disable navigation',await page.locator('#next-card').isDisabled()&&await page.locator('#previous-card').isDisabled());
    await page.locator('#card-search').fill('no-such-page-8722');await page.waitForFunction(()=>window.collectionPreview.stats().filtered.length===0);
    check('empty search has an explicit recovery',await page.locator('#empty-cards').isVisible());
    await page.locator('#clear-filters').click();await page.waitForFunction(()=>window.collectionPreview.stats().filtered.length===50&&!window.collectionPreview.stats().loading);
    check('clear filters restores all cards',await page.locator('#book-shell').isVisible());
    check('single book study replaces the figure banner',await page.locator('#open-book').getAttribute('href')==='./book.html'&&await page.locator('img[src*="after-dark-banner"]').count()===0);
    check('new print studies have a collection entry',await page.locator('#open-prints').getAttribute('href')==='./collection.html?card=empire-state-postcard');
    await page.evaluate(async()=>{await window.collectionPreview.setSearch('Shakespeare');});
    check('author search finds the sourced Shakespeare card',await page.evaluate(()=>window.collectionPreview.stats().filtered.join()==='echo-verse'));
    await page.locator('#tab-achievements').click();
    check('Achievements is only a coming-later placeholder',await page.locator('#achievements-section').isVisible()&&await page.locator('#achievements-section .frame-item').count()===0&&await page.locator('#cards-section').isHidden());
    await page.locator('#back-to-cards').click();check('back to the almanac works',await page.locator('#cards-section').isVisible());
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
    check('book fits portrait width',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    for(const card of catalog.cards.filter(c=>c.format==='printed-surface')){
      await page.evaluate(async id=>{await window.collectionPreview.setSearch('');await window.collectionPreview.selectCard(id);},card.id);
      check(card.id+': portrait framing fits the complete print',await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),stage=document.getElementById('card-stage'),camera=new T.PerspectiveCamera(35,stage.clientWidth/stage.clientHeight,.1,40);camera.position.fromArray(window.collectionPreview.camera());camera.lookAt(0,0,0);camera.updateMatrixWorld();const b=window.collectionPreview.bounds();return [-1,1].every(x=>[-1,1].every(y=>{const p=new T.Vector3(x*b[0]/2,y*b[1]/2,0).project(camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1;}));}));
    }
    await page.locator('#tab-achievements').click();check('placeholder fits portrait width',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    await page.goto(BASE+'designs.html');await page.waitForFunction(()=>document.querySelectorAll('.frame-item').length===4);
    check('earlier frame/title designs remain viewable',await page.locator('.frame-item').count()===4&&await page.locator('.title-item').count()===6);
    await page.goto(BASE+'collection.html?card=knowledge-power&mode=motif');await page.waitForFunction(()=>window.collectionPreview?.ready);
    check('direct card/motif link works',await page.evaluate(()=>{const s=window.collectionPreview.stats();return s.card==='knowledge-power'&&s.mode==='motif';}));
    await page.evaluate(async ids=>{await Promise.all(ids.map(id=>window.collectionPreview.selectCard(id)));},catalog.cards.slice(3,9).map(c=>c.id));
    check('rapid selection keeps the latest card and cache limit',await page.evaluate(id=>{const s=window.collectionPreview.stats();return s.card===id&&!s.loading&&s.cacheSize<=4;},catalog.cards[8].id));
    check('no runtime errors, missing resources or external requests',report.errors.length===0);
    report.success=true;
  }finally{await browser.close();fs.writeFileSync(path.join(ROOT,'assets/collection/browser-audit.json'),JSON.stringify(report,null,2)+'\n');}
})().catch(e=>{console.error(e);process.exit(1);});
