// Pure validation for the admin-accounts function. No Deno or Supabase imports here,
// so the rules can be unit-tested with Vitest (web/tests/admin/).

/** Nickname rule from SPEC §5 and §4: 3 to 16 letters, digits or underscore, no umlauts or spaces. */
export const NICKNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth
export const CLASS_IDS = ['8a', '8b'] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export interface AccountRow {
  nickname: string;
  password: string;
  classId: ClassId;
}

export interface ParseResult {
  rows: AccountRow[];
  /** One message per bad line, with its line number (1-based). */
  errors: string[];
}

/** Login address for a nickname. Lower-cased so that login is not case-sensitive. */
export function loginEmail(nickname: string): string {
  return `${nickname.toLowerCase()}@lerndorf.local`;
}

/** Returns an error message in German, or null if the nickname is fine. */
export function nicknameError(nickname: string): string | null {
  if (!NICKNAME_RE.test(nickname)) {
    return 'Spitzname: 3 bis 16 Zeichen, nur Buchstaben a–z, Ziffern und _ (keine Umlaute, keine Leerzeichen)';
  }
  return null;
}

/** Returns an error message in German, or null if the password is fine. */
export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Passwort: mindestens ${PASSWORD_MIN} Zeichen`;
  if (password.length > PASSWORD_MAX) return `Passwort: höchstens ${PASSWORD_MAX} Zeichen`;
  return null;
}

export function isClassId(value: string): value is ClassId {
  return (CLASS_IDS as readonly string[]).includes(value);
}

/**
 * Parses the bulk list: one pupil per line, `Spitzname;Passwort;Klasse`.
 * Empty lines are skipped. A line with an error is reported and not returned.
 */
export function parseBulkLines(text: string): ParseResult {
  const rows: AccountRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  // Line numbers in `rowLines` match the rows array, so duplicates can name both lines.
  const rowLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const where = `Zeile ${i + 1}`;
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length !== 3) {
      errors.push(`${where}: erwartet „Spitzname;Passwort;Klasse“`);
      continue;
    }
    const [nickname, password, classId] = parts;
    const nErr = nicknameError(nickname);
    const pErr = nErr ? null : passwordError(password);
    if (nErr || pErr) {
      errors.push(`${where}: ${nErr ?? pErr}`);
      continue;
    }
    if (!isClassId(classId)) {
      errors.push(`${where}: Klasse muss 8a oder 8b sein`);
      continue;
    }
    rows.push({ nickname, password, classId });
    rowLines.push(i + 1);
  }

  // the same nickname twice in one list would clash on the login address
  const seen = new Map<string, number>();
  rows.forEach((r, idx) => {
    const key = r.nickname.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push(`Spitzname „${r.nickname}“ kommt doppelt vor (Zeile ${first} und ${rowLines[idx]})`);
    } else {
      seen.set(key, rowLines[idx]);
    }
  });

  return { rows, errors };
}

/** Smallest free plot index in a class, starting at 0. */
export function nextFreePlot(usedIndexes: number[]): number {
  const used = new Set(usedIndexes);
  let i = 0;
  while (used.has(i)) i++;
  return i;
}
