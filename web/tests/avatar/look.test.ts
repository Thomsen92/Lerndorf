import { describe, it, expect } from 'vitest';
import { emptyLook, readWardrobe, equipInLook, validateLook, lookKey } from '../../src/avatars/look';
import { avatarCatalog } from '../../src/avatars/catalog';
describe('wardrobe rules', () => {
  it('keeps separate looks and treats old profiles as clothed defaults', () => {
    expect(readWardrobe({ character: 'boy' }).girl).toEqual(emptyLook());
    expect(
      readWardrobe({ wardrobe: { v: 1, revision: 4, boy: { items: ['x'], colors: {} }, girl: emptyLook() } })
        .revision,
    ).toBe(4);
  });
  it('replaces a slot and resolves head/hair conflicts in both directions', () => {
    const clips = 'avatar_girl_shooting_stars',
      hat = 'avatar_girl_daisy_bucket';
    expect(equipInLook({ items: [clips], colors: {} }, hat).items).toEqual([hat]);
    expect(equipInLook({ items: [hat], colors: {} }, clips).items).toEqual([clips]);
  });
  it('rejects unowned, incompatible, duplicate and conflicting parts', () => {
    const id = 'avatar_boy_gold_chain';
    expect(() => validateLook({ items: [id], colors: {} }, 'boy', [])).toThrow();
    expect(() => validateLook({ items: [id], colors: {} }, 'girl', [id])).toThrow();
    expect(() => validateLook({ items: [id, id], colors: {} }, 'boy', [id])).toThrow();
    expect(() =>
      validateLook(
        { items: ['avatar_girl_daisy_bucket', 'avatar_girl_soft_bow'], colors: {} },
        'girl',
        avatarCatalog.map((i) => i.id),
      ),
    ).toThrow();
  });
  it('accepts legitimate owned parts, but never a fabricated color or boy shirt tint', () => {
    expect(() =>
      validateLook({ items: ['avatar_boy_gold_chain'], colors: { hair: '#5b3a29' } }, 'boy', [
        'avatar_boy_gold_chain',
      ]),
    ).not.toThrow();
    expect(() => validateLook({ items: [], colors: { skin: '#00ff00' } }, 'boy', [])).toThrow();
    expect(() => validateLook({ items: [], colors: { top: '#5b3a29' } }, 'boy', [])).toThrow();
  });
  it('uses a canonical cache key independent of item/property order', () => {
    expect(lookKey({ items: ['b', 'a'], colors: { hair: '#5b3a29', shoes: '#d9d9e6' } })).toBe(
      lookKey({ items: ['a', 'b'], colors: { shoes: '#d9d9e6', hair: '#5b3a29' } }),
    );
  });
});
