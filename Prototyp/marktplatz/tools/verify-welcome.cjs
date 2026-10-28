const {chromium}=require('../../../web/node_modules/playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--use-angle=d3d11']});const report={checks:[],errors:[],visualReview:'Claude/user acceptance pending; no screenshots'};const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:5188/');await page.waitForFunction(()=>window.market?.ready);await page.waitForTimeout(600);
 check('persistent banner mentions Season I and Seasonal Boxes',await page.locator('.welcome').innerText().then(t=>t.includes('Season I')&&t.includes('Seasonal Boxes')));
 await page.locator('#welcome-button').click();check('welcome panel opens',await page.locator('#season-dialog').isVisible());
 check('season and boxes are explained',await page.locator('#season-meaning').isVisible()&&await page.locator('#seasonal-boxes-title').isVisible());
 check('collection link is local and present',await page.locator('.season-collection-action').getAttribute('href')==='./collection.html');
 check('box availability is marked as preview',await page.locator('#season-dialog .prototype-note').innerText().then(t=>t.includes('Seasonal Boxes')&&t.includes('Vorschau')));
 check('tour pauses while the panel is open',await page.evaluate(()=>!window.market.stats().tour));
 await page.keyboard.press('Escape');check('Escape closes and returns focus',await page.locator('#season-dialog').isHidden()&&await page.locator('#welcome-button').evaluate(e=>e===document.activeElement));
 await page.setViewportSize({width:390,height:844});await page.locator('#welcome-button').click();
 check('welcome fits portrait width',await page.evaluate(()=>{const d=document.getElementById('season-dialog'),b=d.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&d.scrollWidth<=d.clientWidth;}));
 await page.locator('#season-dialog button[value="close"]').click();check('market return button closes the panel',await page.locator('#season-dialog').isHidden());
 check('no runtime or resource errors',report.errors.length===0);report.success=true;
}finally{await browser.close();fs.writeFileSync(path.resolve(__dirname,'../screenshots/welcome-audit.json'),JSON.stringify(report,null,2)+'\n');}})().catch(e=>{console.error(e);process.exit(1);});
