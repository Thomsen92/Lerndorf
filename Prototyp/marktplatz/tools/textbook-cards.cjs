const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../assets/collection'),file=path.join(root,'catalog.json'),catalog=JSON.parse(fs.readFileSync(file));
const colors={normal:'#c7b891',rare:'#95b6d2',epic:'#b198c9',legendary:'#dbb166'};
const additions=[
 ['sofia-moon-witch','Sofia, the Moon Witch','normal','sofia','#7955a4','A friendly introduction','HI · I’M · THIS IS','Hi! I’m Sofia, the moon witch.',['Meet Sofia from the introduction page.','This is my lantern. These are my books.','Introduce a friend: This is …'],'Use this is for one thing; these are for more.'],
 ['mason-aurora-ghost','Mason, the Aurora Ghost','rare','mason','#719cb8','Alaska · time differences','EARLIER · LATER · THAN','My midnight starts later than yours.',['Mason’s blue hood is ready for a ghost walk.','Compare two clocks: earlier than / later than.','In our Halloween story, he carries a ghost lantern.'],'The costume and story are our Halloween adaptation.'],
 ['bella-vampire-reader','Bella, the Vampire Reader','rare','bella','#953c59','New York · present continuous','IS READING · IS FLYING','Bella is reading while the bats are flying.',['Bella keeps her long hair and bright braces.','She is reading: be + verb ending in -ing.','The bats are flying above the library.'],'Describe what is happening right now.'],
 ['ryan-maple-werewolf','Ryan, the Maple Werewolf','epic','ryan','#af6845','Canada · describing a character','FRIENDLY · FURRY · BRAVER','Ryan is a friendly, furry night explorer.',['Meet our Halloween version of Ryan from Canada.','He is braver than he was before.','His lantern is brighter than the moonlit path.'],'Brave becomes braver; bright becomes brighter.'],
 ['selena-moon-musician','Selena, the Moon Musician','normal','selena','#419d9e','Jamaica · rhythm and adjectives','LOUD · LOUDER · LOUDEST','The little drum gets louder and louder.',['Selena brings a tambourine to the moonlit market.','Loud, louder, the loudest: compare the sounds.','Our costumes and dialogue are invented adaptations.'],'Describe the music in your own English words.'],
 ['liberty-after-dark','Lady Liberty after Dark','legendary','liberty','#649f91','New York · a famous landmark','TALL · TALLER · TALLEST','The pumpkin torch is brighter than a candle.',['Recognise the crown and raised torch from the cover.','Our Halloween statue holds a glowing pumpkin.','Compare two lights using brighter than.'],'A landmark from the cover, with a Halloween twist.'],
 ['werehound-twins','The Werehound Twins','rare','dogs','#b8804e','Comparatives · as … as','LONG · LONGER · LONGEST','I’m longer than you. But I’m cuter!',['The long brown dog meets the small grey dog again.','Long becomes longer; cute becomes cuter.','Our two werehounds are as friendly as each other.'],'Use than for differences; as … as for equality.'],
 ['ghost-level-gamer','The Ghost-Level Gamer','normal','gamer','#bd6056','Comparisons · less … than','LESS DIFFICULT THAN','This ghost level is less difficult than the last one.',['Recognise the cap and controller from the grammar page.','The controller has become a friendly little ghost.','More exciting / less difficult: compare game levels.'],'Not as difficult as is another useful comparison.'],
];
catalog.archivedCards=catalog.archivedCards||[];
for(const [i,row] of additions.entries()){
 const [id,name,rarity,figure,costumeColor,topic,key,example,notes,tip]=row;
 const card={id,number:31+i,name,rarity,kind:'grammar',series:'textbook-after-dark',color:colors[rarity],icon:'book-'+figure,figure,costumeColor,topic,key,example,notes,tip,model:`cards/${id}.glb`,motifModel:`motifs/${id}.glb`,front:`cards/${id}-front.svg`,back:`cards/${id}-back.svg`,atlas:`cards/${id}-atlas.png`,thumbnail:`cards/${id}-thumb.png`,reference:{type:'user-supplied-textbook-adaptation',work:'Highlight 8 · Mittelschule Bayern · R',publisher:'Cornelsen',page:figure==='liberty'?'Cover':['dogs','gamer'].includes(figure)?'159 · LF 11 · comparison of adjectives':'8 · Hi from America!',note:'Original Halloween adaptation of supplied textbook references. New dialogue is not a textbook quotation.'}};
 card.status='benched';card.benchedOn='2026-10-27';
 const index=catalog.archivedCards.findIndex(c=>c.id===id);if(index<0)catalog.archivedCards.push(card);else catalog.archivedCards[index]=card;
}
catalog.cards=catalog.cards.filter(c=>c.series!=='textbook-after-dark');
catalog.cards.sort((a,b)=>a.number-b.number);catalog.totalCards=catalog.cards.length;
catalog.series=[{id:'season-one',name:'The Midnight Collection',count:30},{id:'textbook-after-dark',name:'Textbook after Dark',count:8,status:'benched'}];
catalog.bookStudy={id:'highlight-halloween-book',name:'Highlight 8 · Halloween cover study',page:'book.html',backPreview:'book.html?view=back',model:'textbook/highlight-halloween-book.glb',cover:'textbook/highlight-halloween-cover.png',backCover:'textbook/highlight-halloween-back.png',status:'user-review'};
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log('30 active cards; eight textbook figures benched; separate textured book study.');
