// Confirmed r11: Normal/Rare from coin-bearing pass tiers; Epic/Legendary from chests.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../assets/collection'),file=path.join(root,'catalog.json'),catalog=JSON.parse(fs.readFileSync(file));
const coinTiers=Array.from({length:40},(_,i)=>i+1).filter(t=>t<=20||t%5===0);
const pass=catalog.cards.filter(c=>['normal','rare'].includes(c.rarity)).sort((a,b)=>(a.rarity==='normal'?0:1)-(b.rarity==='normal'?0:1)||a.number-b.number);
const rewards=coinTiers.map((tier,i)=>({tier,cardIds:pass.slice(Math.floor(i*pass.length/coinTiers.length),Math.floor((i+1)*pass.length/coinTiers.length)).map(c=>c.id)}));
for(const card of catalog.cards){
 if(['normal','rare'].includes(card.rarity)){const row=rewards.find(r=>r.cardIds.includes(card.id));if(!row)throw Error('Pass card not assigned');card.acquisition={source:'learnpass',tier:row.tier,additionalToCoins:true,uniquePerPlayer:true};}
 else card.acquisition={source:'season-chest',uniquePerPlayer:true};
}
const chestIds=catalog.cards.filter(c=>c.acquisition.source==='season-chest').map(c=>c.id);
catalog.acquisitionPolicy={version:'r11',duplicates:false,ownershipLimit:1,learnpass:{rarities:['normal','rare'],coinTiers,additionalToCoins:true,order:'normal-first-then-rare-by-number',allocation:'equal-progress-one-or-two-per-coin-tier'},chest:{rarities:['epic','legendary'],cardIds:chestIds,excludeOwnedBeforeDraw:true,exhausted:'no-card-bonus-original-village-item-unchanged',cardHitRate:null,rarityWeights:null},implementationStatus:'prototype-metadata-and-plan-only'};
catalog.passCardRewards=rewards;
if(pass.length!==35||coinTiers.length!==24||chestIds.length!==15||new Set(rewards.flatMap(r=>r.cardIds)).size!==35)throw Error('Acquisition rule count mismatch');
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(root,'card-acquisition.json'),JSON.stringify({seasonId:'2026-11-halloween',policy:catalog.acquisitionPolicy,passRewards:rewards},null,2)+'\n');
console.log('35 unique pass cards across 24 coin tiers; 15 unique Epic/Legendary chest cards.');
