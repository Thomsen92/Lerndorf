import { describe, it, expect } from 'vitest';
import { shownItem } from '../../src/api/build';
import { RUIN_ID } from '../../src/render/ruin';

describe('shownItem', () => {
  it('shows the ruin in an empty house slot', () => {
    expect(shownItem({}, 'house', 'house')).toEqual({ itemId: RUIN_ID, rot: 0 });
  });

  it('shows the placed house', () => {
    const slots = { house: { itemId: 'house_fachwerk', rot: 0 } };
    expect(shownItem(slots, 'house', 'house')).toEqual({ itemId: 'house_fachwerk', rot: 0 });
  });

  it('keeps the starter garage', () => {
    expect(shownItem({}, 'garage', 'garage')).toEqual({ itemId: 'garage_holz', rot: 0 });
  });

  it('shows nothing in an empty car slot', () => {
    expect(shownItem({}, 'car1' as never, 'car')).toBeUndefined();
  });
});
