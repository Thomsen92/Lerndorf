const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const quiz = JSON.parse(fs.readFileSync(path.join(root, 'sources/season-starter/quiz.private.json')));
assert.equal(quiz.questions.length, 10);
assert.equal(new Set(quiz.questions.map(q=>q.id)).size, 10);
assert.equal(quiz.questions.length * quiz.xpPerSolvedQuestion + quiz.completionBonusXp, 150);
for (const q of quiz.questions) {
  assert.ok(['choice','listening'].includes(q.type));
  assert.ok(q.options.length>=3 && q.options.length<=4);
  assert.equal(new Set(q.options).size, q.options.length);
  assert.ok(q.options.includes(q.solution));
  assert.ok(q.hint.length && q.prompt.length);
  if(q.type==='listening')assert.equal(q.mode,'choice');
}
const listening=quiz.questions.filter(q=>q.type==='listening');
assert.equal(listening.length, 4);
async function main(){
  const contract=await import(pathToFileURL(path.resolve(root,'../../web/src/quests/listening.ts')).href);
  assert.equal(quiz.voice,contract.LISTENING_VOICE);
  assert.equal(quiz.rate,contract.LISTENING_RATE);
  fs.mkdirSync(path.join(root,'assets/listening'),{recursive:true});
  const clips=listening.map(q=>({questionId:q.id,text:q.speak,voice:quiz.voice,rate:quiz.rate,path:contract.listeningPath(q.speak)}));
  for(const clip of clips){
    const target=path.join(root,clip.path);
    if(process.argv.includes('--generate')&&!(fs.existsSync(target)&&fs.statSync(target).size>0)){
      const temporary=target+'.tmp.mp3';
      try{
        const r=spawnSync('edge-tts',['--voice',clip.voice,`--rate=${clip.rate}`,'--text',clip.text,'--write-media',temporary],{stdio:'inherit',timeout:60000,windowsHide:true});
        if(r.error||r.status!==0)throw Error('Edge TTS failed: '+(r.error?.message??r.status));
        assert.ok(fs.statSync(temporary).size>0);
        fs.renameSync(temporary,target);
      }finally{if(fs.existsSync(temporary))fs.rmSync(temporary);}
    }
    clip.bytes=fs.existsSync(target)?fs.statSync(target).size:0;
  }
  const report={seasonId:quiz.seasonId,questions:10,totalXp:150,privateSeed:'sources/season-starter/quiz.private.json',audioSource:'edge-tts',clips};
  fs.writeFileSync(path.join(root,'assets/season-starter/audio-manifest.json'),JSON.stringify(report,null,2)+'\n');
  if(process.argv.includes('--verify-audio'))assert.ok(clips.every(c=>c.bytes>0),'All four MP3s must exist and be nonempty');
  console.log('PASS: ten tap-only questions, 150 XP design, four listening prompts; '+clips.filter(c=>c.bytes>0).length+'/4 Edge TTS clips ready. No live XP awarded.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
