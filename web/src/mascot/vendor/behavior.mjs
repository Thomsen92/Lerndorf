// Source: github.com/Thomsen92/Sir-Byte @ ea10e0c - unchanged except this header.
export const EXPRESSIONS = {
  idle: { label:'Ganz Ohr.', line:'Ready when you are.', duration:Infinity, eyes:[0,0,0,0], tilt:0, lift:0 },
  point: { label:'Genau dort.', line:'Die Aufgabe findest du dort.', duration:Infinity, eyes:[0,0,0,.15], tilt:-.075, lift:0 },
  cheeky: { label:'Ein kleiner Hinweis …', line:'Nearly. Have another go!', duration:3.8, eyes:[0.65,0.04,0,0], tilt:-0.12, lift:0.02 },
  celebrate: { label:'Splendid!', line:'Splendid! Nicely done.', duration:3.6, eyes:[0,0,0.85,0.85], tilt:0.09, lift:0.16 },
  think: { label:'Einen Moment …', line:'Hmm. Let me think.', duration:4.5, eyes:[0.3,0.3,0,0], tilt:0.15, lift:-0.02 },
  support: { label:'Wir schaffen das.', line:"Take your time. You've got this.", duration:5, eyes:[0.05,0.05,0.2,0.2], tilt:-0.09, lift:-0.04 },
  surprise: { label:'Oh! Rather impressive.', line:'Oh! Rather impressive.', duration:2.8, eyes:[0,0,0,0], tilt:-0.04, lift:0.12 },
  dry: { label:'Oh dear, old bean.', line:'Oh dear. Not even close, old bean. Do try again.', duration:7, eyes:[0.58,0.32,0,0], tilt:-0.08, lift:-0.02 },
  smug: { label:'Well, well.', line:'Well, well. Even a broken clock is right twice a day. Congratulations.', duration:9, eyes:[0.6,0.12,0.12,0.05], tilt:0.11, lift:0.035 }
};
export class ByteBehavior {
  constructor() { this.state='idle'; this.elapsed=0; this.mistakes=0; this.gaze={x:0,y:0}; this.revision=0; }
  react(state) { if (!EXPRESSIONS[state]) throw new Error(`Unknown reaction: ${state}`); this.state=state; this.elapsed=0; this.revision++; return EXPRESSIONS[state]; }
  feedback(correct) { if(correct) { this.mistakes=0; return this.react('celebrate'); } this.mistakes++; return this.react(this.mistakes===1?'cheeky':'support'); }
  lookAt(x,y) { this.gaze.x=Math.max(-1,Math.min(1,Number.isFinite(x)?x:0)); this.gaze.y=Math.max(-1,Math.min(1,Number.isFinite(y)?y:0)); }
  update(dt) { this.elapsed+=Math.max(0,dt); if(this.elapsed>EXPRESSIONS[this.state].duration) this.react('idle'); return EXPRESSIONS[this.state]; }
}
