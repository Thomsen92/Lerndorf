const { chromium } = require('../../../web/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../assets/collection');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe', args: ['--use-angle=d3d11'] });
  try {
    const page = await browser.newPage(); await page.goto('http://127.0.0.1:5188/');
    const banner=await page.evaluate(async()=>{const image=new Image();image.src='./assets/collection/textbook/after-dark-concept.png';await image.decode();const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=Math.round(1100*image.height/image.width);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',.84).split(',')[1];});
    fs.writeFileSync(path.join(root,'textbook/after-dark-banner.webp'),Buffer.from(banner,'base64'));
    const catalog = JSON.parse(fs.readFileSync(path.join(root,'catalog.json')));
    for (const card of catalog.cards) {
      if(card.format==='printed-surface')continue;
      const png = await page.evaluate(async card => {
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 768;
        const ctx = canvas.getContext('2d');
        for (const [i, file] of [card.front,card.back].entries()) {
          const img = new Image(); img.src = './assets/collection/' + file; await img.decode(); ctx.drawImage(img,i*512,0,512,768);
        }
        return canvas.toDataURL('image/png').split(',')[1];
      },card);
      fs.writeFileSync(path.join(root,card.atlas),Buffer.from(png,'base64'));
      const thumb=await page.evaluate(async png=>{
        const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;canvas.getContext('2d').drawImage(image,0,0,512,768,0,0,128,192);return canvas.toDataURL('image/png').split(',')[1];
      },png);
      fs.writeFileSync(path.join(root,card.thumbnail),Buffer.from(thumb,'base64'));
    }
    console.log(`Rasterized ${catalog.cards.filter(c=>c.format!=='printed-surface').length} self-contained front/back atlases at 1024 × 768.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
