import { readdirSync, readFileSync, statSync } from 'node:fs';
import { listeningPath } from '../src/quests/listening.ts';
import type { QuestRow } from './quests.ts';
export const QUEST_DIR = new URL('../../content/daily-quests/', import.meta.url);
export const PUBLIC_DIR = new URL('../public/', import.meta.url);
// The tutorial also switches to recorded listening in part 2 (migration 0021, question 3).
export const TUTORIAL_LISTENING = 'Hello! I am your new neighbour. Welcome to the village!';
export function hasAudio(file: URL): boolean {
  try {
    const stat = statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}
export function missingListening(quests: QuestRow[], publicDir = PUBLIC_DIR): string[] {
  return [
    ...new Set(quests.filter((q) => q.type === 'listening').map((q) => listeningPath(String(q.data.speak)))),
  ].filter((path) => !hasAudio(new URL(path, publicDir)));
}
export function listeningTexts(dir = QUEST_DIR): string[] {
  const texts = new Set<string>();
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const pkg = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    for (const day of pkg.days ?? [])
      for (const quest of day.quests ?? [])
        if (quest.type === 'listening') {
          if (typeof quest.speak !== 'string' || !quest.speak.trim())
            throw Error(`${file}: listening.speak fehlt oder ist leer.`);
          texts.add(quest.speak);
        }
  }
  return [...texts];
}
