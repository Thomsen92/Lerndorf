import type { CharacterKind } from '../render/character';
import { partById } from './catalog';
export type AvatarSlot = 'headwear' | 'hair' | 'face' | 'necklace' | 'back' | 'bag' | 'wrist' | 'bottoms';
export type ColorChannel = 'hair' | 'skin' | 'shoes' | 'bottoms' | 'top';
export interface AvatarLook {
  items: string[];
  colors: Partial<Record<ColorChannel, string>>;
}
export interface WardrobeState {
  v: 1;
  revision: number;
  boy: AvatarLook;
  girl: AvatarLook;
}
export type ColorPalette = Partial<Record<ColorChannel, readonly string[]>>;
export const CLOTH_COLORS = [
  '#c0502f',
  '#4b7bec',
  '#20bf6b',
  '#f7b731',
  '#8854d0',
  '#fd9644',
  '#2d98da',
  '#eb3b5a',
  '#2b2118',
  '#e2b24a',
  '#5b3a29',
  '#d9d9e6',
];
export const SKIN_COLORS = ['#f2c9a5', '#d9a477', '#ba8055', '#8a5738', '#5c3826'];
export const DEFAULT_COLORS: ColorPalette = {
  hair: CLOTH_COLORS,
  skin: SKIN_COLORS,
  shoes: CLOTH_COLORS,
  bottoms: CLOTH_COLORS,
  top: CLOTH_COLORS,
};
export const emptyLook = (): AvatarLook => ({ items: [], colors: {} });
export function normalizeLook(raw: unknown): AvatarLook {
  const o = raw as Partial<AvatarLook> | null;
  return {
    items: Array.isArray(o?.items) ? o.items.filter((v): v is string => typeof v === 'string') : [],
    colors: o?.colors && typeof o.colors === 'object' && !Array.isArray(o.colors) ? { ...o.colors } : {},
  };
}
export function readWardrobe(avatar: unknown): WardrobeState {
  const w = (avatar as { wardrobe?: Partial<WardrobeState> } | null)?.wardrobe;
  return {
    v: 1,
    revision: w?.v === 1 && Number.isInteger(w.revision) ? w.revision! : 0,
    boy: normalizeLook(w?.boy),
    girl: normalizeLook(w?.girl),
  };
}
export function lookKey(look: AvatarLook): string {
  return JSON.stringify({
    items: [...look.items].sort(),
    colors: Object.fromEntries(Object.entries(look.colors).sort(([a], [b]) => a.localeCompare(b))),
  });
}
export function conflicts(a: string, b: string): boolean {
  const x = partById(a),
    y = partById(b);
  return !!x && !!y && (x.slot === y.slot || x.conflicts.includes(b) || y.conflicts.includes(a));
}
export function equipInLook(look: AvatarLook, id: string): AvatarLook {
  if (!partById(id)) throw Error('Unknown part');
  return { items: [...look.items.filter((other) => !conflicts(id, other)), id], colors: { ...look.colors } };
}
export function validateLook(
  look: AvatarLook,
  kind: CharacterKind,
  owned: readonly string[],
  palette = DEFAULT_COLORS,
): void {
  if (!Array.isArray(look.items) || look.items.length > 8 || new Set(look.items).size !== look.items.length)
    throw Error('Invalid parts');
  for (const id of look.items) {
    const p = partById(id);
    if (!p || p.character !== kind || !owned.includes(id)) throw Error('Part unavailable');
    if (look.items.some((other) => other !== id && conflicts(id, other))) throw Error('Conflicting parts');
  }
  for (const [c, value] of Object.entries(look.colors)) {
    if ((kind === 'boy' && c === 'top') || !palette[c as ColorChannel]?.includes(value))
      throw Error('Invalid color');
  }
}
