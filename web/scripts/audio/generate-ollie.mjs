// Offline asset generation only. Never import this file into the browser.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source = new URL('../../../content/shop/ollie-voice.json', import.meta.url);
const folder = new URL('../../public/assets/shopkeeper/voice/', import.meta.url);
const spec = JSON.parse(readFileSync(source, 'utf8'));
const manifestUrl = new URL('manifest.json', folder);
const previous = existsSync(manifestUrl) ? JSON.parse(readFileSync(manifestUrl, 'utf8')) : { clips: [] };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fingerprint = sha(
  JSON.stringify({ voice: spec.voiceId, model: spec.modelId, settings: spec.settings }),
);
const jobs = Object.entries(spec.lines).flatMap(([language, lines]) =>
  Object.entries(lines).map(([id, text]) => ({ id, language, text, file: `${language}-${id}.mp3` })),
);
const missing = jobs.filter((job) => {
  const old = previous.clips.find((clip) => clip.file === job.file);
  return (
    !existsSync(new URL(job.file, folder)) || old?.text !== job.text || previous.fingerprint !== fingerprint
  );
});
const characters = missing.reduce((n, job) => n + job.text.length, 0);
console.log(JSON.stringify({ pending: missing.length, characters, voice: spec.voiceName }));
if (!process.argv.includes('--generate') || !missing.length) process.exit(0);
if (characters > 2500) throw Error('Generation exceeds the approved 2500-character batch cap.');
const local = new URL('../../../.env.local', import.meta.url);
const key =
  process.env.ELEVENLABS_API_KEY ??
  (existsSync(local)
    ? readFileSync(local, 'utf8')
        .match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)$/m)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, '')
    : null);
if (!key) throw Error('Set ELEVENLABS_API_KEY outside the client.');
const auth = { 'xi-api-key': key };
const account = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: auth });
if (!account.ok) throw Error(`Quota check failed (${account.status}).`);
const quota = await account.json();
if (!(quota.character_count + characters <= quota.character_limit))
  throw Error('Not enough included quota; no overage or purchase will be attempted.');
mkdirSync(folder, { recursive: true });
const manifest = {
  provider: 'ElevenLabs',
  voiceId: spec.voiceId,
  voiceName: spec.voiceName,
  modelId: spec.modelId,
  settings: spec.settings,
  fingerprint,
  clips: previous.clips.filter((clip) => !missing.some((job) => job.file === clip.file)),
};
for (const job of missing) {
  if (existsSync(new URL(job.file, folder)))
    throw Error(`Refusing to overwrite ${job.file}; review source drift first.`);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${spec.voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: job.text,
        model_id: spec.modelId,
        voice_settings: spec.settings,
        seed: 2801026,
      }),
    },
  );
  if (!response.ok)
    throw Error(`Speech generation failed for ${job.file} (${response.status}); no automatic retry.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1500 || !(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff))
    throw Error(`Invalid MP3 response for ${job.file}.`);
  const temporary = new URL(`${job.file}.tmp`, folder);
  try {
    writeFileSync(temporary, bytes);
    renameSync(temporary, new URL(job.file, folder));
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  manifest.clips.push({ ...job, bytes: bytes.length, sha256: sha(bytes) });
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ file: job.file, bytes: bytes.length }));
}
