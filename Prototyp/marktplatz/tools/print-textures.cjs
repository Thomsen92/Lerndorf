const {chromium}=require('../../../web/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../assets/collection'),dir=path.join(root,'prints'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',args:['--use-angle=d3d11']});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:5188/assets/collection/prints/manifest.json');
for(const item of manifest.items){
 const data=await page.evaluate(async item=>{
  const front=new Image();front.src='/assets/collection/'+item.front;await front.decode();
  const factor=Math.min(1,1024/Math.max(front.naturalWidth,front.naturalHeight)),w=Math.round(front.naturalWidth*factor),h=Math.round(front.naturalHeight*factor);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(front,0,0,w,h);const frontPNG=canvas.toDataURL('image/png').split(',')[1];
  const back=new Image();back.src='/assets/collection/'+item.back;await back.decode();ctx.fillStyle='#eee0bf';ctx.fillRect(0,0,w,h);const fit=Math.min(w/back.naturalWidth,h/back.naturalHeight);ctx.drawImage(back,(w-back.naturalWidth*fit)/2,(h-back.naturalHeight*fit)/2,back.naturalWidth*fit,back.naturalHeight*fit);const backPNG=canvas.toDataURL('image/png').split(',')[1];
  canvas.width=128;canvas.height=192;ctx.clearRect(0,0,128,192);const thumb=Math.min(128/front.naturalWidth,192/front.naturalHeight);ctx.drawImage(front,(128-front.naturalWidth*thumb)/2,(192-front.naturalHeight*thumb)/2,front.naturalWidth*thumb,front.naturalHeight*thumb);
  return {front:frontPNG,back:backPNG,thumb:canvas.toDataURL('image/png').split(',')[1],width:w,height:h};
 },item);
 fs.writeFileSync(path.join(dir,item.frontTexture),Buffer.from(data.front,'base64'));fs.writeFileSync(path.join(dir,item.backTexture),Buffer.from(data.back,'base64'));fs.writeFileSync(path.join(root,item.thumbnail),Buffer.from(data.thumb,'base64'));item.textureSize=[data.width,data.height];
}
fs.writeFileSync(path.join(dir,'texture-audit.json'),JSON.stringify({items:manifest.items.map(c=>({id:c.id,size:c.textureSize})),success:true},null,2)+'\n');console.log(manifest.items.length+' full front/back print textures rasterized without text regeneration.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
