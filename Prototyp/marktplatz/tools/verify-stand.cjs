const {chromium}=require('../../../web/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../assets/season-starter');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto('http://127.0.0.1:5188/stand.html');
  await page.waitForFunction(()=>window.standPreview?.ready);
  await page.waitForTimeout(200);
  const stats=await page.evaluate(()=>window.standPreview.stats());
  const audit=JSON.parse(fs.readFileSync(path.join(out,'model-audit.json')));
  assert.equal(audit.activeModel,'halloween-shop-event.glb');assert.equal(audit.catSelection.retainedLogicalComponents,1);assert.equal(audit.catSelection.triangles,3487);
  assert.equal(stats.errors.length,0);assert.ok(stats.triangles>=audit.triangles&&stats.triangles<25000);assert.ok(stats.calls<20);assert.ok(stats.textures.every(t=>t==='1024x1024'));
  await page.locator('#season-ticket').click();await assert.equal(await page.locator('#stand-dialog').evaluate(e=>e.open),true);
  assert.ok(!/Sammelkarten|Rare|Epic|Legendary|Seasonal Boxes|Collection/i.test(await page.locator('#stand-dialog').textContent()));
  assert.ok((await page.locator('#stand-dialog').textContent()).includes('150 XP'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#season-ticket').evaluate(e=>e===document.activeElement),true);
  await page.mouse.click(640,450);assert.equal(await page.locator('#stand-dialog').evaluate(e=>e.open),true);
  await page.locator('#stand-dialog-close').click();
  await page.mouse.move(640,450);await page.mouse.down();await page.mouse.move(720,460,{steps:8});await page.mouse.up();assert.equal(await page.locator('#stand-dialog').evaluate(e=>e.open),false);
  await page.locator('#stand-front').click();
  // Review evidence for the user; this is not artistic approval.
  await page.screenshot({path:path.join(out,'stand-preview.png')});
  await page.locator('#stand-back').click();await page.locator('#stand-light').click();assert.equal(await page.locator('#stand-light').getAttribute('aria-pressed'),'true');
  await page.setViewportSize({width:768,height:1024});await page.locator('#stand-front').click();await page.locator('#stand-welcome').click();assert.equal(await page.locator('#stand-dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const clips=JSON.parse(fs.readFileSync(path.join(out,'audio-manifest.json'))).clips;
  const audio=await page.evaluate(async clips=>Promise.all(clips.map(c=>new Promise((resolve,reject)=>{const a=new Audio('./'+c.path);const timer=setTimeout(()=>reject(Error('Audio timeout '+c.path)),10000);a.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve({path:c.path,duration:a.duration});a.removeAttribute('src');a.load();},{once:true});a.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Audio decoding failed '+c.path));},{once:true});a.load();}))),clips);
  assert.equal(audio.length,4);assert.ok(audio.every(a=>a.duration>0));assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),revision:'r14',activeModel:audit.activeModel,stats,errors,audio,checks:['supplied shop composition loads','only largest cat island retained','old stand preserved on bench','welcome only quiz/150XP/LearnPass; no collectible card copy','1024px runtime maps','triangle/material budget','ticket opens welcome','escape restores focus','actual model click opens welcome','orbit drag does not click','back view','light switch','tablet welcome','phone no horizontal overflow','four Edge TTS MP3s decode in browser'],artisticApproval:'user-review-pending'};
  fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
