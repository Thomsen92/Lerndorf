import { expect, it } from 'vitest';
import { decoStyle } from '../../src/render/decoStyles';
import { plinthGeometry } from '../../src/render/plinthGeometry';

it('assigns garden pads and compact display bases independently of rarity', () => {
  expect(decoStyle('shop_pocket_meadow', 1.35, 0.58).kind).toBe('meadow');
  expect(decoStyle('shop_sunday_bench', 1.9, 0.65).kind).toBe('meadow');
  expect(decoStyle('reward_ollie_nyc_postcard', 0.6, 0.6).kind).toBe('display');
  expect(decoStyle('unknown', 1.4, 0.6).kind).toBe('stone');
});

it('sizes the support to a model, stays inside the slot and uses low meadow pads', () => {
  const small = decoStyle('shop_evening_lantern', 0.22, 0.23);
  expect(small.width).toBeLessThan(1.2);
  const wide = decoStyle('unknown', 2.95, 1.8);
  expect(wide.width).toBeGreaterThanOrEqual(2.95);
  expect(wide.width).toBeLessThanOrEqual(3);
  expect(wide.depth).toBeLessThan(wide.width);
  expect(wide.shape).toBe('rect');
  expect(decoStyle('shop_pocket_meadow', 1.35, 0.58).height).toBeLessThanOrEqual(0.06);
});

it('keeps stone joints facing upward so both grooves remain visible', () => {
  const geometry = plinthGeometry('stone', false);
  const positions = geometry.getAttribute('position'),
    normals = geometry.getAttribute('normal');
  let jointVertices = 0;
  for (let i = 0; i < positions.count; i++)
    if (positions.getY(i) > 1.0005) {
      jointVertices++;
      expect(normals.getY(i)).toBeGreaterThan(0.99);
    }
  expect(jointVertices).toBe(12);
  geometry.dispose();
});
