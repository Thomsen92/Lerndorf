const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'assets/collection');
const catalog = JSON.parse(fs.readFileSync(path.join(directory, 'catalog.json')));
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const defs = `<defs><linearGradient id="metal" x2=".8" y2="1"><stop stop-color="#fff0c9"/><stop offset=".22" stop-color="currentColor"/><stop offset=".5" stop-color="#866750"/><stop offset=".7" stop-color="currentColor"/><stop offset="1" stop-color="#493b43"/></linearGradient><linearGradient id="paper" x2=".7" y2="1"><stop stop-color="#f0e2c5"/><stop offset="1" stop-color="#c9b58f"/></linearGradient><linearGradient id="night" x2=".8" y2="1"><stop stop-color="#4b3f58"/><stop offset="1" stop-color="#2b2b33"/></linearGradient><radialGradient id="ruby"><stop stop-color="#ee9a86"/><stop offset=".35" stop-color="#c64b5c"/><stop offset="1" stop-color="#65293c"/></radialGradient></defs>`;
function icon(name, c = '#d9a65d') {
  if(name.startsWith('book-'))return textbookIcon(name.slice(5),c);
  const dark = '#37303d', light = '#f5d49a';
  const icons = {
    lantern: `<path d="M-12-29v-8a12 12 0 0 1 24 0v8" fill="none" stroke="${c}" stroke-width="6"/><path d="M-23-28h46l9 12-7 39H-25l-7-39Z" fill="${dark}" stroke="${c}" stroke-width="4"/><path d="M-17-14h34l-4 29h-26Z" fill="${light}"/><path d="M0-14v29M-20 23h40l6 8h-52Z" stroke="${c}" stroke-width="5"/>`,
    pumpkin: `<path d="M-4-22q-8-16 7-21l7 5q-11 5-7 16" fill="#718456"/><ellipse rx="36" ry="27" cy="3" fill="#c5753c"/><ellipse rx="25" ry="28" cy="3" fill="#e99b4d"/><ellipse rx="12" ry="28" cy="3" fill="#f2b562"/><path d="m-23-2 12-8 3 12Zm46 0-12-8-3 12ZM-22 15l11-1 6 6 9-6 6 3 12-5-8 13H-13Z" fill="${dark}"/>`,
    ghost: `<path d="M-29 30V-6a29 29 0 0 1 58 0v36L18 21 7 32-4 22-16 32Z" fill="#dfded8" stroke="${c}" stroke-width="3"/><ellipse cx="-10" cy="-5" rx="5" ry="8" fill="${dark}"/><ellipse cx="11" cy="-5" rx="5" ry="8" fill="${dark}"/><ellipse cy="14" rx="4" ry="6" fill="${dark}"/>`,
    cauldron: `<path d="M-30-12h60L24 21q-24 16-48 0Z" fill="#4f405a" stroke="${c}" stroke-width="4"/><ellipse cy="-12" rx="32" ry="9" fill="#9bad79" stroke="${c}" stroke-width="4"/><path d="m-20 29-5 9m45-9 5 9M-24-27q-9-8 0-18M-2-29q-9-8 0-18M19-27q-9-8 0-18" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
    gate: `<path d="M-32 32V-6a32 32 0 0 1 64 0v38" fill="none" stroke="${c}" stroke-width="7"/><path d="M-21 29V-6M-7 30V-17M7 30V-17M21 29V-6M-28 14h56" fill="none" stroke="${c}" stroke-width="4"/><path d="M-43-27-27-43-23-34-12-42 0-27 12-42 23-34 27-43 43-27 23-25 17-17 0-22-17-17-23-25Z" fill="${dark}"/>`,
    moon: `<path d="m-13 2-39-24 8 20-13 9 24 1 20 16m26-22 39-24-8 20 13 9-24 1-20 16" fill="${c}" stroke="${dark}" stroke-width="2"/><circle r="26" fill="url(#ruby)" stroke="${light}" stroke-width="2"/><circle cx="-8" cy="-8" r="6" fill="#913448" opacity=".5"/><circle cx="9" cy="8" r="8" fill="#913448" opacity=".4"/>`,
    book: `<path d="M0-19q-17-15-37-8v50q20-7 37 8 17-15 37-8v-50Q17-34 0-19Z" fill="${dark}" stroke="${c}" stroke-width="4"/><path d="M0-17v44M-28-12l18 6m-18 5 18 6m-18 5 18 6M28-12 10-6m18 5L10 5m18 5-18 6" stroke="${light}" stroke-width="3"/>`,
    star: `<path d="m0-40 11 27 29 3-23 19 7 30L0 23-24 39l7-30-23-19 29-3Z" fill="${c}" stroke="${light}" stroke-width="2"/><path d="m-42 25 4 7 8 1-6 5 2 8-8-4-7 4 2-8-6-5 8-1Z" fill="${light}"/>`,
    cat: `<path d="m-29-6-4-31 23 16h20l23-16-4 31q9 33-29 38Q-38 27-29-6Z" fill="${c}" stroke="${dark}" stroke-width="3"/><path d="m-20 2 10 3m30-3-10 3M-4 14h8l-4 5ZM-23 17l-21-3m21 9-21 3m67-9 21-3m-21 9 21 3" stroke="${dark}" stroke-width="3"/>`,
    spoon: `<path d="M-25-33a19 24 0 1 0 24 31l35 39q7 5 11-1t-2-10L5-11a19 24 0 0 0-30-22Z" fill="${c}" stroke="${light}" stroke-width="2"/><path d="M28-39a21 21 0 1 0 15 29A19 19 0 0 1 28-39Z" fill="${light}"/>`,
    'eye-book': `<path d="M-39 2Q-17-8 0 5q17-13 39-3v35Q17 27 0 40q-17-13-39-3Z" fill="${c}" stroke="${light}" stroke-width="2"/><path d="M0 6v31" stroke="${dark}" stroke-width="3"/><path d="M-30-22Q0-48 30-22 0 4-30-22Z" fill="${light}"/><circle cy="-22" r="9" fill="${dark}"/>`,
    key: `<g transform="rotate(-28)"><circle cx="-17" cy="-7" r="18" fill="none" stroke="${c}" stroke-width="8"/><path d="M1-7h41v13m-12-13V9" fill="none" stroke="${c}" stroke-width="8"/></g>`,
    boot: `<path d="M-19-36h30v37l25 12q12 6 5 18h-68V19l8-7Z" fill="${c}" stroke="${light}" stroke-width="3"/><path d="M-25 24h65M-15-25H7M-15-14H7M-15-3H7" stroke="${dark}" stroke-width="4"/>`,
    speech: `<path d="M-42-30h84v50H0l-24 20V20h-18Z" fill="${c}" stroke="${light}" stroke-width="3"/><circle cx="-22" cy="-6" r="5" fill="${dark}"/><circle cy="-6" r="5" fill="${dark}"/><circle cx="22" cy="-6" r="5" fill="${dark}"/>`,
    cup: `<path d="M-30-13h52v22q0 27-26 27T-30 9Z" fill="${c}" stroke="${light}" stroke-width="3"/><path d="M23-9q29-3 21 18-7 12-24 7" fill="none" stroke="${c}" stroke-width="7"/><path d="M-22 43h46M-20-25q-9-10 0-20M0-25q-9-10 0-20" stroke="${light}" stroke-width="3" fill="none"/>`,
    clock: `<circle r="35" fill="${dark}" stroke="${c}" stroke-width="6"/><circle r="29" fill="none" stroke="${light}" stroke-width="2"/><path d="M0-24V1l18 10M-5-43H5" stroke="${light}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    'two-heads': `<path d="M-42 27V-9a21 21 0 0 1 42 0v36l-10-8-11 8-11-8Z" fill="#ddd8ce" stroke="${c}" stroke-width="2"/><path d="M2 27V-9a21 21 0 0 1 42 0v36l-10-8-11 8-11-8Z" fill="${c}"/><path d="M-31-6v9m18-9v9M13-6v9m18-9v9" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`,
    target: `<circle r="36" fill="none" stroke="${c}" stroke-width="7"/><circle r="23" fill="none" stroke="${light}" stroke-width="5"/><circle r="9" fill="${c}"/><path d="M0 0 40-40m-12 0H40v12" stroke="${c}" stroke-width="5" fill="none"/>`,
    heart: `<path d="M0 35Q-54 4-31-25-14-43 0-20 14-43 31-25 54 4 0 35Z" fill="${c}" stroke="${light}" stroke-width="3"/><path d="m-15-12-7 9" stroke="${light}" stroke-width="4"/>`,
    lock: `<path d="M-23-6v-17a23 23 0 0 1 46 0v17" stroke="${c}" stroke-width="7" fill="none"/><rect x="-35" y="-9" width="70" height="47" rx="7" fill="${c}"/><circle cy="10" r="7" fill="${dark}"/><path d="M0 13v13" stroke="${dark}" stroke-width="5"/>`,
    tortoise: `<ellipse cy="4" rx="32" ry="24" fill="#8b9b68" stroke="${c}" stroke-width="4"/><circle cx="39" cy="9" r="11" fill="${c}"/><path d="M-23 23v10M18 24v9M-31 6l-13 7M-10-16 2 6-14 25M2 6l26-7" stroke="${c}" stroke-width="5" fill="none"/><circle cx="42" cy="6" r="2" fill="${dark}"/>`,
    umbrella: `<path d="M-44 1Q0-61 44 1 30-12 15 1 0-12-15 1-30-12-44 1Z" fill="${c}" stroke="${light}" stroke-width="2"/><path d="M0-37v65q0 20 17 10" stroke="${light}" stroke-width="5" fill="none"/>`,
    mouse: `<circle cx="-20" cy="-23" r="17" fill="${c}"/><circle cx="20" cy="-23" r="17" fill="${c}"/><path d="M-26-17q26-18 52 0L0 33Z" fill="${light}"/><circle cx="-10" cy="-6" r="3" fill="${dark}"/><circle cx="10" cy="-6" r="3" fill="${dark}"/><circle cy="27" r="5" fill="${c}"/><path d="M-7 15l-30-3m44 3 30-3" stroke="${c}" stroke-width="3"/>`,
    cloud: `<path d="M-30 22q-28-8-14-30 7-11 19-8 0-32 28-27 19 3 22 23 34-1 29 23-2 18-25 19Z" fill="#9395a6" stroke="${c}" stroke-width="4"/><path d="M-35 23H28" stroke="${light}" stroke-width="7" stroke-linecap="round"/>`,
    'closed-book': `<path d="M-31-38h62v74h-62q-12-1-10-11v-53q0-10 10-10Z" fill="${c}" stroke="${light}" stroke-width="3"/><path d="M-30-37v63h58M-29 29h57M-17-11h32M-17-1H8" stroke="${dark}" stroke-width="4" fill="none"/>`,
    megaphone: `<path d="m-38-13 63-24v69l-63-23Z" fill="${c}" stroke="${light}" stroke-width="3"/><path d="m-15 19 6 25h14L-1 13M35-21l14-8M36 0h17M35 20l14 8" stroke="${c}" stroke-width="5" fill="none"/>`,
    feather: `<path d="M-29 36Q-50-22 31-43 47 18-29 36Z" fill="${c}" stroke="${light}" stroke-width="2"/><path d="M-36 44 28-35M-18 23l-14-21m25 9-14-21m25 9L-8-22M-18 23l25-1M-7 11l24-2M4-1l23-4" stroke="${dark}" stroke-width="3" fill="none"/>`,
    skull: `<path d="M-26 12q-20-32 0-45 26-17 52 0 20 13 0 45l-5 23h-42Z" fill="${light}" stroke="${c}" stroke-width="3"/><circle cx="-13" cy="-5" r="9" fill="${dark}"/><circle cx="13" cy="-5" r="9" fill="${dark}"/><path d="m0 6-5 9h10ZM-13 23v12M0 23v12M13 23v12" stroke="${dark}" stroke-width="3"/>`,
    bell: `<path d="M-28 17v-25a28 28 0 0 1 56 0v25l10 11h-76Z" fill="${c}" stroke="${light}" stroke-width="3"/><circle cy="32" r="7" fill="${light}"/><path d="M-43-16q-12 14 0 27M43-16q12 14 0 27M-7-41H7" fill="none" stroke="${c}" stroke-width="4"/>`,
    shield: `<path d="m0-42 36 12-5 42Q20 34 0 46-20 34-31 12l-5-42Z" fill="${c}" stroke="${light}" stroke-width="3"/><path d="m0-30 24 8-3 29Q13 22 0 31-13 22-21 7l-3-29Z" fill="url(#ruby)"/><path d="m0-15 5 11 13 2-10 8 3 13L0 12-11 19l3-13-10-8 13-2Z" fill="${light}"/>`,
    'orb-book': `<path d="M0 15q-17-12-39-6v30q22-6 39 7 17-13 39-7V9Q17 3 0 15Z" fill="${c}" stroke="${light}" stroke-width="2"/><circle cy="-20" r="23" fill="url(#ruby)" stroke="${light}" stroke-width="3"/><path d="M-38-22h-9m85 0h9M0-49v-8M0 17v26" stroke="${light}" stroke-width="3"/>`,
  };
  return icons[name] || icons.book;
}
function textbookIcon(figure,c){
  const dark='#302b38',gold='#ecc47c',costumes={sofia:'#8253a8',bella:'#973c58',mason:'#709dbb',ryan:'#a56a47',selena:'#4faaa5',liberty:'#6daf9c',gamer:'#c56c5b'};
  if(figure==='dogs')return `<ellipse cx="-12" cy="-9" rx="28" ry="11" fill="#bb8353"/><ellipse cx="21" cy="-14" rx="13" ry="15" fill="#bb8353"/><path d="m12-22-8 4 4 17 8-4M-29 0v14m28-14v14" stroke="#694d3c" stroke-width="7"/><ellipse cx="7" cy="25" rx="20" ry="12" fill="#99968e"/><circle cx="26" cy="20" r="13" fill="#aaa69b"/><path d="m19 8-9 5 3 14m20-16 10 11" stroke="#625e5c" stroke-width="6"/><circle cx="25" cy="-17" r="2" fill="${dark}"/><circle cx="31" cy="18" r="2" fill="${dark}"/><path d="m-3-8 7 8-7 8-7-8Z" fill="#df9b4a"/>`;
  const skin={sofia:'#b97d52',bella:'#d3a17f',mason:'#edbd95',ryan:'#d6a781',selena:'#9c6344',liberty:'#82b5a3',gamer:'#edbc91'}[figure],coat=costumes[figure];
  let extra='';
  if(figure==='sofia')extra=`<path d="m-34-20 28-43 14 7 13 34Z" fill="${coat}"/><ellipse cy="-20" rx="39" ry="7" fill="${coat}"/><path d="m9-45-7 6 4 8-9-5" fill="${gold}"/>`;
  if(figure==='bella')extra=`<path d="m-31 8-8-20 21 12m49 8 8-20-21 12" fill="${coat}"/><rect x="-23" y="21" width="44" height="24" rx="3" fill="${gold}"/><rect x="-19" y="24" width="36" height="18" fill="${coat}"/><path d="M-8 0H8" stroke="#faf0d9" stroke-width="5"/><path d="M-6-2v4m6-4v4m6-4v4" stroke="${gold}" stroke-width="2"/>`;
  if(figure==='mason')extra=`<path d="M-25 4Q-40-40 0-42 40-40 25 4" fill="none" stroke="${coat}" stroke-width="9"/><path d="m-26 5 7 20m45-20-7 20" stroke="${gold}" stroke-width="5"/><rect x="17" y="23" width="18" height="21" rx="5" fill="#bde3e3"/><circle cx="23" cy="31" r="2" fill="${dark}"/><circle cx="29" cy="31" r="2" fill="${dark}"/>`;
  if(figure==='ryan')extra=`<path d="m-23-16-10-22 20 8m36 14 10-22-20 8" fill="#755238"/><path d="M-28 25h56M-28 36h56M-13 12v36M12 12v36" stroke="${dark}" opacity=".7" stroke-width="4"/><path d="m21 20 5-9 4 9 8-4-4 11 5 4-11 3v7h-3v-7l-11-3 5-4-4-11Z" fill="${gold}"/>`;
  if(figure==='selena')extra=`<circle cx="24" cy="29" r="17" fill="none" stroke="${gold}" stroke-width="5"/>${Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return `<circle cx="${24+17*Math.cos(a)}" cy="${29+17*Math.sin(a)}" r="3" fill="#f7db99"/>`;}).join('')}<path d="m-25 0 4 7-4 7-4-7Z" fill="${gold}"/>`;
  if(figure==='liberty')extra=`<path d="m-22-20-7-17 15 6-1-20 12 16 8-20 5 21 17-12-4 23 19-4-12 14" fill="none" stroke="${coat}" stroke-width="5"/><path d="m-25 23-15-40-7-7" stroke="${coat}" stroke-width="10"/><path d="M-46-22v-13" stroke="${gold}" stroke-width="5"/><ellipse cx="-46" cy="-41" rx="12" ry="10" fill="#efae55"/><path d="m-52-44 4-2 1 4m6-2 3-2 1 4m-10 5h8" stroke="${dark}" stroke-width="2"/><rect x="16" y="20" width="17" height="23" fill="${coat}" stroke="${gold}" stroke-width="2"/>`;
  if(figure==='gamer')extra=`<path d="M-23-19q-3-25 24-25 25 0 24 25Z" fill="${coat}"/><path d="M13-23h23v8H13" fill="#4c9281"/><path d="M-25 27q0-15 16-10h18q16-5 16 10l-5 15-10-7h-20l-10 7Z" fill="#d9e7e0"/><circle cx="-5" cy="25" r="3" fill="${dark}"/><circle cx="6" cy="25" r="3" fill="${dark}"/>`;
  const curls=['sofia','selena'].includes(figure)?Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<circle cx="${Math.sin(a)*25}" cy="${-12+Math.cos(a)*22}" r="8" fill="${dark}"/>`;}).join(''):`<path d="M-24 2v-21q2-24 27-18 24 2 22 30L5-21-24-1Z" fill="${figure==='mason'?'#9b714e':dark}"/>`;
  return `<path d="m-22 10-10 37h64L22 10Z" fill="${coat}"/>${curls}<ellipse cy="-9" rx="21" ry="25" fill="${skin}"/><path d="M-22-18q12-25 39-8L-8-12Z" fill="${figure==='mason'?'#9b714e':dark}"/><ellipse cx="-7" cy="-10" rx="3" ry="4" fill="${dark}"/><ellipse cx="8" cy="-10" rx="3" ry="4" fill="${dark}"/><path d="M-7 1q7 7 14 0" fill="none" stroke="${dark}" stroke-width="2"/>${extra}`;
}
function wrap(text, length = 34) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) { if ((line + ' ' + word).trim().length > length && line) { lines.push(line); line = word; } else line = (line + ' ' + word).trim(); }
  if (line) lines.push(line); return lines;
}
function textLines(lines, x, y, size, color, spacing = size * 1.4, weight = 'normal') {
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-family="Verdana,sans-serif" font-size="${size}" font-weight="${weight}">${lines.map((t, i) => `<tspan x="${x}" dy="${i ? spacing : 0}">${esc(t)}</tspan>`).join('')}</text>`;
}
function svg(w, h, color, body) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" color="${color}">${defs}${body}</svg>`; }
function front(card) {
  const title = wrap(card.name, 23), key = wrap(card.key, 27);
  return svg(512, 768, card.color, `<rect width="512" height="768" fill="#342f3d"/><rect x="13" y="13" width="486" height="742" rx="18" fill="url(#night)" stroke="url(#metal)" stroke-width="7"/><rect x="26" y="26" width="460" height="716" rx="12" fill="none" stroke="${card.color}" opacity=".5"/>
  ${textLines(['SEASON I  /  HALLOWEEN'],256,57,11,card.color)}
  ${textLines(title,256,106,27,'#f0e2c5',34,'bold')}
  <path d="M70 172h372M70 465h372" stroke="${card.color}" opacity=".45"/>
  <circle cx="256" cy="317" r="113" fill="#2e2c37" stroke="url(#metal)" stroke-width="6"/><circle cx="256" cy="317" r="100" fill="none" stroke="${card.color}" opacity=".45"/>
  <g transform="translate(256 317) scale(2.35)">${icon(card.icon,card.color)}</g>
  ${Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return `<path d="m${256+Math.sin(a)*133} ${317+Math.cos(a)*133} 4-8 4 8-4 8Z" fill="${card.color}" opacity=".6"/>`;}).join('')}
  ${textLines([card.topic.toUpperCase()],256,499,11,card.color)}${textLines(key,256,542,20,'#f0e2c5',30,'bold')}
  ${textLines(wrap(card.example,32),256,615,18,'#d8cdbd',27)}
  ${card.source?textLines([card.source.author+' · original excerpt'],256,677,10,card.color):card.figure?textLines(['TEXTBOOK AFTER DARK · ADAPTATION'],256,677,9,card.color):''}
  <path d="M70 692h372" stroke="${card.color}" opacity=".45"/>
  ${textLines([`${String(card.number).padStart(2,'0')} / ${String(catalog.cards.length).padStart(2,'0')}    ·    ${card.rarity.toUpperCase()}`],256,722,11,card.color)}`);
}
function back(card) {
  if(card.source){
    const source=card.source,quote=source.excerptLines.flatMap(line=>wrap(line,39));
    return svg(512,768,card.color,`<rect width="512" height="768" fill="#342f3d"/><rect x="14" y="14" width="484" height="740" rx="18" fill="url(#paper)" stroke="url(#metal)" stroke-width="7"/>
    ${textLines(['THE MIDNIGHT COLLECTION'],256,62,11,'#7c5c4c')}${textLines(['Original verse'],256,121,30,'#493946',42,'bold')}${textLines(wrap(source.work,31),256,163,16,'#785a50',22)}
    <path d="M61 205h390" stroke="#a17c58"/>${textLines(quote,256,245,18,'#493946',26)}
    ${textLines([source.author],256,413,19,'#493946',25,'bold')}${textLines(wrap(source.location,45),256,444,12,'#785a50',19)}
    ${textLines(wrap(card.notes.at(-1),41),256,508,16,'#4b3f46',23)}<path d="M61 584h390" stroke="#a17c58"/>
    ${textLines(wrap(card.tip,39),256,616,15,'#785a50',23)}${textLines(wrap(source.publisher,46),256,698,10,'#785a50',16)}${textLines(['Source link in the almanac · original text public domain'],256,736,9,'#7c5c4c')}`);
  }
  let y = 252;
  const notes = card.notes.map(note => { const lines = wrap(note,36), result = textLines(lines,256,y,18,'#4b3f46',28); y += lines.length * 28 + 32; return result; }).join('');
  return svg(512,768,card.color,`<rect width="512" height="768" fill="#342f3d"/><rect x="14" y="14" width="484" height="740" rx="18" fill="url(#paper)" stroke="url(#metal)" stroke-width="7"/>
  ${textLines(['THE MIDNIGHT COLLECTION'],256,62,11,'#7c5c4c')}${textLines(['Field notes'],256,121,30,'#493946',42,'bold')}${textLines([card.name],256,164,16,'#785a50')}
  <path d="M61 194h390" stroke="#a17c58"/>${notes}
  <path d="M61 574h390" stroke="#a17c58"/>${textLines(wrap(card.tip,37),256,616,16,'#785a50',25)}
  <g transform="translate(256 698) scale(.45)">${icon(card.icon,'#97774f')}</g>
  ${textLines(['L E R N D O R F   ·   E N G L I S H'],256,738,9,'#7c5c4c')}`);
}
for (const card of catalog.cards) {
  if(card.format==='printed-surface')continue;
  card.front = `cards/${card.id}-front.svg`; card.back = `cards/${card.id}-back.svg`; card.atlas = `cards/${card.id}-atlas.png`;
  fs.writeFileSync(path.join(directory,card.front),front(card)); fs.writeFileSync(path.join(directory,card.back),back(card));
}
for (const frame of catalog.frames) {
  let extras = '';
  if (frame.motif === 'lantern') extras = `<path d="M82 295v44m348-44v44" stroke="#b79562" stroke-width="5"/><g transform="translate(82 371) scale(.85)">${icon('lantern',frame.color)}</g><g transform="translate(430 371) scale(.85)">${icon('lantern',frame.color)}</g>`;
  if (frame.motif === 'book') extras = `<path d="M65 373V238a191 191 0 0 1 382 0v135" fill="none" stroke="url(#metal)" stroke-width="14"/><path d="m256 32 17 24-17 24-17-24Z" fill="#9e87b0" stroke="#e2d4ca" stroke-width="3"/><g transform="translate(256 453) scale(.9)">${icon('book',frame.color)}</g>`;
  if (frame.motif === 'pumpkin') extras = `<path d="M78 356Q23 281 80 228T102 132M434 356q55-75-2-128t-22-96" fill="none" stroke="#8e9b65" stroke-width="10"/><g transform="translate(256 58) scale(1.2)">${icon('pumpkin',frame.color)}</g><g transform="translate(256 453) scale(.6)">${icon('pumpkin',frame.color)}</g>`;
  if (frame.motif === 'moon') extras = `<path d="M81 180 10 141l18 52-18 24 39-1 24 36m358-72 71-39-18 52 18 24-39-1-24 36" fill="url(#metal)" stroke="#6b4c5b" stroke-width="4"/><g transform="translate(256 56) scale(.95)">${icon('moon',frame.color)}</g><path d="m256 425 18 24-18 32-18-32Z" fill="url(#ruby)" stroke="#e3bba5" stroke-width="3"/>`;
  const body = `<circle cx="256" cy="256" r="191" fill="none" stroke="#39313e" stroke-width="34"/><circle cx="256" cy="256" r="190" fill="none" stroke="url(#metal)" stroke-width="23"/><circle cx="256" cy="256" r="172" fill="none" stroke="${frame.color}" stroke-width="4"/><path d="M87 203a176 176 0 0 1 254-105" fill="none" stroke="#f1ddbd" opacity=".7" stroke-width="4"/>
  ${Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return `<g transform="translate(${256+Math.sin(a)*191} ${256+Math.cos(a)*191}) rotate(${-i*45})"><path d="m0-9 7 9-7 9-7-9Z" fill="${frame.color}" stroke="#f0dab8" stroke-width="1.5"/></g>`;}).join('')}${extras}`;
  fs.writeFileSync(path.join(directory,frame.file),svg(512,512,frame.color,body));
}
for (const title of catalog.titles) {
  fs.writeFileSync(path.join(directory,title.file),svg(720,160,title.color,`<path d="M43 23 85 14h550l42 9 26 57-26 57-42 9H85l-42-9L17 80Z" fill="url(#metal)" stroke="#3d3542" stroke-width="5"/><path d="M70 35h580l24 45-24 45H70L46 80Z" fill="url(#night)" stroke="${title.color}" stroke-width="2"/><path d="M134 43h470M134 117h470" stroke="${title.color}" opacity=".45"/><g transform="translate(89 80) scale(.64)">${icon(title.motif,title.color)}</g>${textLines([title.name],393,92,title.name.length>16?27:31,'#f2e3c9',36,'bold')}`));
}
fs.writeFileSync(path.join(directory,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(`Created ${catalog.cards.filter(c=>c.format!=='printed-surface').length*2} relief card faces, ${catalog.frames.length} frames and ${catalog.titles.length} title plaques.`);
