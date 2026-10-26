import { expect, it } from 'vitest';
import { parseRoute, routeHash } from '../../src/teacher/router';
it('handles class, page, pupil, filters and invalid routes', () => {
  expect(parseRoute('#8b/muenzen')).toEqual({ classId: '8b', page: 'muenzen' });
  expect(parseRoute('garbage')).toEqual({ classId: '8a', page: 'uebersicht' });
  const r = { classId: '8a' as const, page: 'schueler' as const, pupil: 'id', filter: 'tutorial' };
  expect(parseRoute(routeHash(r))).toEqual(r);
  expect(() => parseRoute('#8a/schueler/%')).not.toThrow();
});
