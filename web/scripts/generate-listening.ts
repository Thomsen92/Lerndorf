import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { listeningPath, LISTENING_VOICE, LISTENING_RATE } from '../src/quests/listening.ts';
import { hasAudio, listeningTexts, PUBLIC_DIR, QUEST_DIR, TUTORIAL_LISTENING } from './listening.ts';
export interface GenerateOptions {
  weeksDir?: URL;
  publicDir?: URL;
  extraTexts?: string[];
  run?: (text: string, output: string) => void;
}
function edgeTts(text: string, output: string): void {
  const result = spawnSync(
    'edge-tts',
    ['--voice', LISTENING_VOICE, `--rate=${LISTENING_RATE}`, '--text', text, '--write-media', output],
    { stdio: 'inherit', timeout: 60000, windowsHide: true },
  );
  if (result.error || result.status !== 0)
    throw Error(
      `edge-tts fehlgeschlagen: ${result.error?.message ?? result.status}. Bitte Installation und Verbindung prüfen.`,
    );
}
export function generateListening(options: GenerateOptions = {}): { created: number; skipped: number } {
  const publicDir = options.publicDir ?? PUBLIC_DIR;
  const texts = [
    ...new Set([
      ...listeningTexts(options.weeksDir ?? QUEST_DIR),
      ...(options.extraTexts ?? [TUTORIAL_LISTENING]),
    ]),
  ];
  const paths = new Map<string, string>();
  for (const text of texts) {
    const path = listeningPath(text);
    if (paths.has(path) && paths.get(path) !== text)
      throw Error(`Namenskollision für ${path}; keine Dateien überschrieben.`);
    paths.set(path, text);
  }
  mkdirSync(new URL('assets/listening/', publicDir), { recursive: true });
  let created = 0,
    skipped = 0;
  for (const [path, text] of paths) {
    const target = new URL(path, publicDir);
    if (hasAudio(target)) {
      skipped++;
      continue;
    }
    const temporary = new URL(`${path}.${process.pid}.tmp.mp3`, publicDir);
    try {
      (options.run ?? edgeTts)(text, fileURLToPath(temporary));
      if (!hasAudio(temporary)) throw Error(`Hördatei fehlt oder ist leer: ${path}`);
      renameSync(temporary, target);
      created++;
    } finally {
      rmSync(temporary, { force: true });
    }
  }
  return { created, skipped };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const report = generateListening();
    console.log(`Stimmen: ${report.created} neu, ${report.skipped} vorhanden.`);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}
