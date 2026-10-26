import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { packageToRows, validatePackage, type WeekPackage } from '../../scripts/quests';

export function weekWith(count: number): Extract<WeekPackage, { days: unknown }> {
  const pkg = JSON.parse(
    readFileSync(new URL('../fixtures/quests/2026-11-09.json', import.meta.url), 'utf8'),
  );
  for (const [index, day] of pkg.days.entries()) {
    while (day.quests.length < count)
      day.quests.push({ ...day.quests[0], id: `extra-${index}-${day.quests.length}` });
    day.quests.length = count;
  }
  return pkg;
}
it('accepts legacy three and new four quest days, but rejects two and five', () => {
  expect(validatePackage(weekWith(3))).toEqual([]);
  expect(validatePackage(weekWith(4))).toEqual([]);
  expect(validatePackage(weekWith(2))).not.toEqual([]);
  expect(validatePackage(weekWith(5))).not.toEqual([]);
  const rows = packageToRows(weekWith(4));
  expect(rows.quests).toHaveLength(28);
  expect(rows.quests.filter((q) => q.slot === 4)).toHaveLength(7);
});
