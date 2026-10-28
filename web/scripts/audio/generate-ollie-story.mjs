// Offline, explicitly approved generation only. Private manifests never enter the client.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const story = JSON.parse(
  readFileSync(new URL('../../../content/quests/ollie-roadtrip.json', import.meta.url), 'utf8'),
);
const voice = JSON.parse(
  readFileSync(new URL('../../../content/shop/ollie-voice.json', import.meta.url), 'utf8'),
);
const folder = new URL('../../public/assets/shopkeeper/story-voice/', import.meta.url);
const audit = new URL('../../../content/quests/ollie-story-audio.json', import.meta.url);
const fingerprint = sha(
  JSON.stringify({ voice: voice.voiceId, model: voice.modelId, settings: voice.settings }),
);
const jobs = [
  { key: 'intro', text: story.intro },
  { key: 'wrong', text: story.wrong },
  ...story.questions.flatMap((q) => [
    { key: `${q.id}:question`, text: q.narrative },
    { key: `${q.id}:reply`, text: q.reply },
  ]),
].map((job) => ({
  ...job,
  language: 'en',
  file: `${sha(`ollie-roadtrip-${job.key === 'intro' ? 'v2' : 'v1'}:${job.key}`).slice(0, 24)}.mp3`,
}));
if (jobs.length !== 20 || jobs.reduce((n, job) => n + job.text.length, 0) > 4000)
  throw Error('The approved nine-gap story is exactly twenty active clips, capped at 4000 characters.');
const manifest = existsSync(audit)
  ? JSON.parse(readFileSync(audit, 'utf8'))
  : {
      provider: 'ElevenLabs',
      voiceId: voice.voiceId,
      voiceName: voice.voiceName,
      modelId: voice.modelId,
      settings: voice.settings,
      fingerprint,
      charactersGenerated: 0,
      clips: [],
      attempts: [],
    };
if (manifest.fingerprint !== fingerprint) throw Error('Voice configuration changed; refusing regeneration.');
const pending = jobs.filter((job) => {
  const clip = manifest.clips.find((c) => c.file === job.file);
  if (clip) {
    if (
      clip.text !== job.text ||
      !existsSync(new URL(job.file, folder)) ||
      sha(readFileSync(new URL(job.file, folder))) !== clip.sha256
    )
      throw Error('Existing delivery differs from its private audit; refusing regeneration.');
    return false;
  }
  if (manifest.attempts.some((attempt) => attempt.file === job.file) || existsSync(new URL(job.file, folder)))
    throw Error('A previous attempt needs manual review; no automatic retry or extra charge.');
  return true;
});
const characters = pending.reduce((n, job) => n + job.text.length, 0);
console.log(JSON.stringify({ pending: pending.length, characters, voice: voice.voiceName }));
if (!process.argv.includes('--generate') || !pending.length) process.exit(0);
const extensionFiles = new Set(
  jobs
    .filter((job) => job.key === 'intro' || /^(central-park|brooklyn-bridge|times-square):/.test(job.key))
    .map((job) => job.file),
);
if (extensionFiles.size !== 7 || pending.some((job) => !extensionFiles.has(job.file)))
  throw Error('Only the seven explicitly approved extension clips may be generated.');
const priorExtensionCharacters = manifest.attempts
  .filter((attempt) => extensionFiles.has(attempt.file))
  .reduce((sum, attempt) => sum + attempt.characters, 0);
if (
  characters + priorExtensionCharacters > 1500 ||
  characters + manifest.attempts.reduce((sum, attempt) => sum + attempt.characters, 0) > 4000
)
  throw Error('Approved extension (1500) or cumulative (4000) character cap exceeded.');
const local = new URL('../../../.env.local', import.meta.url);
const key =
  process.env.ELEVENLABS_API_KEY ??
  (existsSync(local)
    ? readFileSync(local, 'utf8')
        .match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)$/m)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, '')
    : null);
if (!key) throw Error('Missing server-only ElevenLabs key.');
const headers = { 'xi-api-key': key };
const account = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers });
if (!account.ok) throw Error(`Quota check failed (${account.status}).`);
const quota = await account.json();
if (
  !Number.isFinite(quota.character_count) ||
  !Number.isFinite(quota.character_limit) ||
  quota.character_count + characters > quota.character_limit
)
  throw Error('Insufficient included quota; no overage or purchase is permitted.');
manifest.quotaBefore = {
  used: quota.character_count,
  limit: quota.character_limit,
  checkedAt: new Date().toISOString(),
};
const save = () => {
  const temporary = new URL(`${audit.pathname.split('/').pop()}.tmp`, audit);
  writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n');
  renameSync(temporary, audit);
};
mkdirSync(folder, { recursive: true });
writeFileSync(
  new URL('README.md', folder),
  '# Ollie story voice\n\nEnglish narration generated with ElevenLabs Charlie, using the approved voice settings.\nDelivery audit and source text are maintained outside public assets.\n',
);
save();
for (const job of pending) {
  const attempt = {
    file: job.file,
    characters: job.text.length,
    status: 'requested',
    requestedAt: new Date().toISOString(),
  };
  manifest.attempts.push(attempt);
  save(); // Persist before billing: interruption must never cause an automatic second request.
  let response;
  try {
    response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: job.text,
          model_id: voice.modelId,
          voice_settings: voice.settings,
          seed: 2801026,
        }),
      },
    );
  } catch {
    throw Error('Speech request failed; attempt recorded, no automatic retry.');
  }
  if (!response.ok) throw Error(`Speech request failed (${response.status}); no automatic retry.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1500 || !(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff))
    throw Error('Invalid audio response; no automatic retry.');
  writeFileSync(new URL(job.file, folder), bytes, { flag: 'wx' });
  manifest.clips.push({ ...job, bytes: bytes.length, sha256: sha(bytes) });
  manifest.charactersGenerated += job.text.length;
  attempt.status = 'delivered';
  save();
  console.log(JSON.stringify({ file: job.file, bytes: bytes.length }));
}
const after = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers });
if (after.ok) {
  const finalQuota = await after.json();
  manifest.quotaAfter = {
    used: finalQuota.character_count,
    limit: finalQuota.character_limit,
    checkedAt: new Date().toISOString(),
  };
  save();
}
