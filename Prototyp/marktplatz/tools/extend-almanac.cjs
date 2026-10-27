const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../assets/collection/catalog.json'),catalog=JSON.parse(fs.readFileSync(file));
const additions=[
  ['night-light','Night and Light','Rhyme','normal','rhyme','star','NIGHT · LIGHT · BRIGHT','A little light makes dark nights bright.',['A lantern shines into the night.','Its little flame is warm and bright.','Listen for the shared /aɪt/ sound.'],'Read the two lines aloud.'],
  ['bat-cat','Bat and Cat','Rhyme','normal','rhyme','cat','BAT · CAT · HAT','A little bat sat on a hat.',['A little bat sat on a hat.','A sleepy cat looked up at that.','Bat, cat, hat and that rhyme.'],'One sound can connect a whole poem.'],
  ['moon-spoon','Moon and Spoon','Rhyme','normal','rhyme','spoon','MOON · SPOON · SOON','A silver spoon beneath the moon.',['A silver spoon beneath the moon.','A sleepy ghost will wake up soon.','Moon, spoon and soon rhyme.'],'Make your voice follow the rhythm.'],
  ['book-look','Book and Look','Rhyme','normal','rhyme','eye-book','BOOK · LOOK · TOOK','Come closer now and take a look.',['Come closer now and take a look.','A tiny ghost has found a book.','Book, look and took rhyme.'],'Notice the short /ʊ/ sound.'],
  ['adjective-key','Key of Adjectives','Describing words','normal','vocabulary','key','BRAVE · BRIGHT · STRANGE','A brave cat enters a strange house.',['Adjectives describe nouns.','A bright lantern. A strange noise.','The brave cat opens the gate.'],'Find three adjectives in your next story.'],
  ['past-footsteps','Footsteps in the Past','Regular verbs','normal','grammar','boot','WALK · WALKED · WALKED','The keeper walked home.',['Present: I walk past the gate.','Past: I walked past the gate.','Perfect: I have walked past the gate.'],'Regular verbs often end in -ed.'],
  ['talking-pumpkin','The Talking Pumpkin','Ability with can','normal','grammar','speech','CAN · CANNOT · CAN’T','This pumpkin can tell a story.',['Can + base verb describes ability.','The pumpkin can speak English.','It cannot fly, but it can sing.'],'Use can without to.'],
  ['time-for-tea','Time for Tea','Time expressions','normal','grammar','cup','AT NIGHT · IN OCTOBER','We meet on Monday at night.',['At night. In October. On Monday.','Use on with days.','We read in the evening.'],'Small time words make a big difference.'],
  ['better-late','Better Late Than Never','Proverb','rare','proverb','clock','BETTER LATE THAN NEVER','The ghost arrived late, but arrived.',['Doing something late can be better than not doing it.','The ghost was late for reading club.','It joined in instead of giving up.'],'A traditional proverb about making an effort.'],
  ['two-heads','Two Heads Are Better','Proverb','rare','proverb','two-heads','TWO HEADS ARE BETTER THAN ONE','Two friends solve the puzzle together.',['Working together can help us find better ideas.','One ghost reads. One checks the words.','Together they understand the story.'],'A traditional proverb about teamwork.'],
  ['practice-perfect','Practice Makes Perfect','Proverb','rare','proverb','target','PRACTICE MAKES PERFECT','The witch practises a little each day.',['Practice helps us improve a skill.','The witch reads five new words each day.','A mistake is a chance to practise again.'],'A traditional proverb about steady practice.'],
  ['friend-in-need','A Friend in Need','Proverb','rare','proverb','heart','A FRIEND IN NEED IS A FRIEND INDEED','A friend brings a lantern to help.',['A true friend helps when things are difficult.','The path was dark, so a friend brought a light.','Indeed means really or truly.'],'A traditional proverb about friendship.'],
  ['hidden-key','The Hidden Key','Prepositions of place','rare','grammar','lock','UNDER · NEXT TO · INSIDE','The key is under the old book.',['The key is under the book.','The lock is next to the gate.','A note is inside the box.'],'Describe a hiding place in English.'],
  ['slow-steady','Slow and Steady','Proverb','rare','proverb','tortoise','SLOW AND STEADY WINS THE RACE','A little progress every day adds up.',['Calm, regular effort can bring success.','The tortoise learns one new word a day.','It keeps going, even when learning is slow.'],'A traditional proverb about patience.'],
  ['rain-train','The Rainy Train','Rhyme','rare','rhyme','umbrella','RAIN · TRAIN · LANE','The silver train runs through the rain.',['The silver train runs through the rain.','We wave goodbye beside the lane.','Rain, train and lane rhyme.'],'Listen for the shared /eɪn/ sound.'],
  ['quiet-mouse','Quiet as a Mouse','Simile','rare','simile','mouse','AS QUIET AS A MOUSE','The reader is as quiet as a mouse.',['A simile compares two things.','As quiet as a mouse means very quiet.','The mouse listens beside the book.'],'Use as + adjective + as to compare.'],
  ['silver-lining','The Silver Lining','Proverb','epic','proverb','cloud','EVERY CLOUD HAS A SILVER LINING','Even a difficult day can hold something good.',['A difficult situation may have a good side.','The rain kept us inside.','We found a new story to read together.'],'A traditional proverb about finding hope.'],
  ['book-cover','Beyond the Cover','Proverb','epic','proverb','closed-book','DON’T JUDGE A BOOK BY ITS COVER','An old cover can hide a wonderful story.',['Appearance does not tell us everything.','The book looked old and dusty.','Inside was a funny, exciting story.'],'A traditional proverb about looking deeper.'],
  ['actions-words','Actions Speak Louder','Proverb','epic','proverb','megaphone','ACTIONS SPEAK LOUDER THAN WORDS','The keeper helps instead of just promising.',['What we do can matter more than what we say.','The keeper said he would help.','Then he carried the books home.'],'A traditional proverb about keeping promises.'],
  ['birds-feather','Birds of a Feather','Proverb','epic','proverb','feather','BIRDS OF A FEATHER FLOCK TOGETHER','Friends often share interests.',['People with similar interests often spend time together.','The night readers all enjoy ghost stories.','They meet at the library every Friday.'],'A traditional proverb about shared interests.'],
  ['sleepy-skeletons','Six Sleepy Skeletons','Tongue twister','epic','tongue-twister','skull','SIX SLEEPY SKELETONS','Six sleepy skeletons softly sing.',['Six sleepy skeletons softly sing.','Say it slowly, then try a little faster.','Notice the repeated s and sk sounds.'],'An original little tongue twister.'],
  ['echo-verse','The Echo of Verse','Rhyme','epic','rhyme','bell','MOON · TUNE · JUNE','A lantern hums a quiet tune.',['A lantern hums a quiet tune.','A ghost reads softly to the moon.','Moon, tune and June rhyme.'],'An original couplet for a midnight reading.'],
  ['fortune-brave','Fortune Favours the Brave','Proverb','legendary','proverb','shield','FORTUNE FAVOURS THE BRAVE','The learner tries a new story.',['Trying something difficult can lead to good things.','The learner felt shy but read the first line.','One brave step made the next step easier.'],'A traditional proverb about trying.'],
  ['knowledge-power','Knowledge Is Power','Proverb','legendary','proverb','orb-book','KNOWLEDGE IS POWER','New words open new doors.',['Learning helps us understand and do more.','The reader learnt the meaning of a sign.','Now the hidden door makes sense.'],'A traditional proverb about the value of learning.'],
];
const colors={normal:'#c7b891',rare:'#95b6d2',epic:'#b198c9',legendary:'#dbb166'};
catalog.cards=catalog.cards.filter(c=>c.series!=='textbook-after-dark'&&c.format!=='printed-surface');
catalog.schemaVersion=2;catalog.rarityOrder=['normal','rare','epic','legendary'];catalog.totalCards=30;
for(const card of catalog.cards){if(card.rarity==='uncommon')card.rarity='normal';card.kind||='grammar';card.motifModel=`motifs/${card.id}.glb`;card.thumbnail=`cards/${card.id}-thumb.png`;}
for(const item of [...catalog.frames,...catalog.titles])if(item.rarity==='uncommon')item.rarity='normal';
for(const title of catalog.titles)title.idea=title.idea.replace('all six Season I cards','all 30 Season I cards').replace('six-card Halloween collection','30-card Halloween collection');
for(const [index,row] of additions.entries()){
  const [id,name,topic,rarity,kind,icon,key,example,notes,tip]=row;
  const card={id,number:index+7,name,topic,rarity,kind,color:colors[rarity],icon,key,example,notes,tip,model:`cards/${id}.glb`,motifModel:`motifs/${id}.glb`,front:`cards/${id}-front.svg`,back:`cards/${id}-back.svg`,atlas:`cards/${id}-atlas.png`,thumbnail:`cards/${id}-thumb.png`};
  const existing=catalog.cards.findIndex(c=>c.id===id);if(existing<0)catalog.cards.push(card);else catalog.cards[existing]=card;
}
catalog.cards.sort((a,b)=>a.number-b.number);
if(catalog.cards.length!==30||new Set(catalog.cards.map(c=>c.id)).size!==30)throw Error('Expected 30 unique cards');
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(catalog.rarityOrder.map(r=>[r,catalog.cards.filter(c=>c.rarity===r).length]))));
require('./classic-verses.cjs');
require('./textbook-cards.cjs');
require('./print-studies.cjs');
