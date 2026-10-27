// Single Season-I rule: the Highlight cover is the only active Legendary card.
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../assets/collection/catalog.json'),catalog=JSON.parse(fs.readFileSync(file));
const id='highlight-halloween-card',palette={normal:'#c7b891',rare:'#95b6d2',epic:'#b198c9',legendary:'#dbb166'};
for(const card of catalog.cards){if(card.rarity==='legendary'&&card.id!==id)card.rarity='epic';if(card.id===id)card.rarity='legendary';card.color=palette[card.rarity];}
if(catalog.cards.filter(c=>c.rarity==='legendary').map(c=>c.id).join()!==id)throw Error('Only the Highlight cover may be Legendary');
catalog.rarityPolicy={legendaryExclusiveCardId:id,order:['normal','rare','epic','legendary']};
catalog.almanacCover={cardId:id,front:'textbook/highlight-halloween-cover.png',back:'textbook/highlight-halloween-back.png',bookModel:'textbook/highlight-halloween-book.glb',role:'shared-season-almanac-cover',requiresCardOwnership:false};
catalog.bookStudy.almanacCoverCardId=id;
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(catalog.rarityOrder.map(r=>[r,catalog.cards.filter(c=>c.rarity===r).length]))));
require('./card-acquisition.cjs');
