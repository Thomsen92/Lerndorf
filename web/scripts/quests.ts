/**
 * Validation and conversion of a week of daily quests. Pure functions, no network.
 * A week file looks like content/daily-quests/2026-11-09.json (7 days x 3 quests) or is a
 * holiday file {"week": "...", "holiday": true}. The solution never goes to the client:
 * `packageToRows` splits each quest into the public row (`data`) and the private solution row.
 */
import { createRng } from '../src/world/rng.ts';
import { isMonday, parseIsoDate } from '../src/teacher/week.ts';

export const QUEST_TYPES = ['choice', 'gap', 'match', 'order', 'listening'] as const;
export type QuestType = (typeof QUEST_TYPES)[number];
export type AnswerMode = 'choice' | 'gap' | 'match' | 'order';
export const REWARD_MIN = 1;
export const REWARD_MAX = 20;

const ID_RE = /^[a-z0-9][a-z0-9-]{0,30}$/;
const GAP = '___';
const MAX_PROMPT = 200;
const MAX_HINT = 120;
const MAX_SPEAK = 400;

export interface QuestSpec {
  id: string;
  type: QuestType;
  prompt: string;
  hint: string;
  reward: number;
  options?: string[];
  solution?: string | string[];
  pairs?: Array<[string, string]>;
  speak?: string;
  mode?: 'choice' | 'gap';
}

export interface DaySpec {
  date: string;
  quests: QuestSpec[];
}

export type WeekPackage = { week: string; days: DaySpec[] } | { week: string; holiday: true };

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isStrList = (v: unknown, min: number, max: number): v is string[] =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every(isStr);

function addDays(isoDate: string, n: number): string {
  const d = parseIsoDate(isoDate) as Date;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Checks the fields that depend on the quest type. `where` is the path prefix for messages. */
function validateTypeFields(q: Record<string, unknown>, type: QuestType, where: string, errors: string[]) {
  const choiceFields = (options: unknown, solution: unknown) => {
    if (!isStrList(options, 2, 6) || new Set(options).size !== options.length) {
      errors.push(`${where}.options: 2 bis 6 verschiedene Antworten`);
    }
    if (!isStr(solution)) errors.push(`${where}.solution: eine Antwort (Text)`);
    else if (isStrList(options, 2, 6) && !options.includes(solution)) {
      errors.push(`${where}.solution: muss in options stehen`);
    }
  };
  const gapFields = () => {
    if (!isStrList(q.solution, 1, 10)) errors.push(`${where}.solution: Liste mit mindestens einer Lösung`);
    if (typeof q.prompt === 'string' && !q.prompt.includes(GAP)) {
      errors.push(`${where}.prompt: muss ${GAP} enthalten`);
    }
  };

  switch (type) {
    case 'choice':
      choiceFields(q.options, q.solution);
      break;
    case 'gap':
      gapFields();
      break;
    case 'match': {
      const pairs = q.pairs;
      const ok =
        Array.isArray(pairs) &&
        pairs.length >= 2 &&
        pairs.length <= 6 &&
        pairs.every((p) => Array.isArray(p) && p.length === 2 && isStr(p[0]) && isStr(p[1]));
      if (!ok) {
        errors.push(`${where}.pairs: 2 bis 6 Paare [englisch, deutsch]`);
        break;
      }
      const list = pairs as string[][];
      const dup = (i: number) => new Set(list.map((p) => p[i])).size !== list.length;
      if (dup(0) || dup(1)) errors.push(`${where}.pairs: doppeltes Wort`);
      break;
    }
    case 'order':
      if (!isStrList(q.solution, 2, 12)) {
        errors.push(`${where}.solution: 2 bis 12 Wörter in richtiger Reihenfolge`);
      }
      break;
    case 'listening':
      if (!isStr(q.speak) || q.speak.length > MAX_SPEAK) {
        errors.push(`${where}.speak: Text bis ${MAX_SPEAK} Zeichen erwartet`);
      }
      if (q.mode === 'choice') choiceFields(q.options, q.solution);
      else if (q.mode === 'gap') gapFields();
      else errors.push(`${where}.mode: choice oder gap`);
      break;
  }
}

/** Returns a list of German error messages; empty means the package is valid. */
export function validatePackage(input: unknown, fileName?: string): string[] {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return ['Datei ist kein JSON-Objekt'];
  }
  const p = input as Record<string, unknown>;

  let weekOk = false;
  if (typeof p.week !== 'string' || !parseIsoDate(p.week)) {
    errors.push('week: Datum im Format JJJJ-MM-TT erwartet');
  } else if (!isMonday(p.week)) {
    errors.push('week: muss ein Montag sein');
  } else {
    weekOk = true;
  }
  if (weekOk && fileName !== undefined && fileName !== `${p.week}.json`) {
    errors.push(`Dateiname: ${p.week}.json erwartet`);
  }

  if (p.holiday !== undefined) {
    if (p.holiday !== true) errors.push('holiday: nur true erlaubt');
    if (p.days !== undefined) errors.push('days: Feiertagsdatei darf keine Tage enthalten');
    return errors;
  }

  if (!Array.isArray(p.days) || p.days.length !== 7) {
    errors.push('days: genau 7 Tage');
    return errors;
  }

  const seen = new Set<string>();
  p.days.forEach((rawDay, i) => {
    const dayWhere = `days[${i}]`;
    if (typeof rawDay !== 'object' || rawDay === null) {
      errors.push(`${dayWhere}: Objekt erwartet`);
      return;
    }
    const day = rawDay as Record<string, unknown>;
    if (weekOk) {
      const expected = addDays(p.week as string, i);
      if (day.date !== expected) errors.push(`${dayWhere}.date: ${expected} erwartet`);
    }
    if (!Array.isArray(day.quests) || day.quests.length !== 3) {
      errors.push(`${dayWhere}.quests: genau 3 Aufgaben`);
      return;
    }
    day.quests.forEach((raw, j) => {
      const where = `${dayWhere}.quests[${j}]`;
      if (typeof raw !== 'object' || raw === null) {
        errors.push(`${where}: Objekt erwartet`);
        return;
      }
      const q = raw as Record<string, unknown>;
      if (typeof q.id !== 'string' || !ID_RE.test(q.id)) {
        errors.push(`${where}.id: nur Kleinbuchstaben, Ziffern und Bindestrich`);
      } else if (seen.has(q.id)) {
        errors.push(`${where}.id: "${q.id}" kommt doppelt vor`);
      } else {
        seen.add(q.id);
      }
      if (!QUEST_TYPES.includes(q.type as QuestType)) {
        errors.push(`${where}.type: choice, gap, match, order oder listening`);
        return;
      }
      if (!Number.isInteger(q.reward) || (q.reward as number) < REWARD_MIN || (q.reward as number) > REWARD_MAX) {
        errors.push(`${where}.reward: ganze Zahl von ${REWARD_MIN} bis ${REWARD_MAX}`);
      }
      if (!isStr(q.prompt) || q.prompt.length > MAX_PROMPT) {
        errors.push(`${where}.prompt: Text bis ${MAX_PROMPT} Zeichen erwartet`);
      }
      if (!isStr(q.hint) || q.hint.length > MAX_HINT) {
        errors.push(`${where}.hint: Text bis ${MAX_HINT} Zeichen erwartet`);
      }
      validateTypeFields(q, q.type as QuestType, where, errors);
    });
  });
  return errors;
}

export interface QuestRow {
  key: string; // "2026-11-10-tue-2"
  week: string;
  day: string;
  slot: 1 | 2 | 3;
  qid: string;
  type: QuestType;
  prompt: string;
  hint: string;
  reward: number;
  data: Record<string, unknown>;
}

export interface QuestSolutionRow {
  quest_key: string;
  solution: unknown;
}

/** FNV-1a 32-bit hash of a string, used to seed the shuffle. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const sameOrder = (a: string[], b: string[]) => a.every((v, i) => v === b[i]);

/** Deterministic Fisher-Yates shuffle that never returns the input order (when that is possible). */
export function shuffleAway(list: string[], seed: string): string[] {
  const rng = createRng(hashString(seed));
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Rotate until the order differs; stops for lists of identical words, which cannot differ.
  for (let r = 1; r < out.length && sameOrder(out, list); r++) {
    out.push(out.shift() as string);
  }
  return out;
}

/** Converts a valid package into table rows. Public data never contains the solution. */
export function packageToRows(pkg: WeekPackage): { quests: QuestRow[]; solutions: QuestSolutionRow[] } {
  const quests: QuestRow[] = [];
  const solutions: QuestSolutionRow[] = [];
  if ('holiday' in pkg) return { quests, solutions };

  for (const day of pkg.days) {
    day.quests.forEach((q, index) => {
      const key = `${day.date}-${q.id}`;
      let data: Record<string, unknown>;
      let solution: unknown;
      switch (q.type) {
        case 'choice':
          data = { options: q.options };
          solution = q.solution;
          break;
        case 'gap':
          data = {};
          solution = q.solution;
          break;
        case 'match': {
          const pairs = q.pairs as Array<[string, string]>;
          data = {
            left: pairs.map((p) => p[0]),
            right: shuffleAway(
              pairs.map((p) => p[1]),
              key,
            ),
          };
          solution = pairs;
          break;
        }
        case 'order':
          data = { words: shuffleAway(q.solution as string[], key) };
          solution = q.solution;
          break;
        case 'listening':
          data = { speak: q.speak, mode: q.mode };
          if (q.mode === 'choice') data.options = q.options;
          solution = q.solution;
          break;
      }
      quests.push({
        key,
        week: pkg.week,
        day: day.date,
        slot: (index + 1) as 1 | 2 | 3,
        qid: q.id,
        type: q.type,
        prompt: q.prompt,
        hint: q.hint,
        reward: q.reward,
        data,
      });
      solutions.push({ quest_key: key, solution });
    });
  }
  return { quests, solutions };
}
