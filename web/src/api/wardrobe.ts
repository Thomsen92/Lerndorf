import { tr } from '../i18n';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CharacterKind } from '../render/character';
import {
  readWardrobe,
  DEFAULT_COLORS,
  type AvatarLook,
  type WardrobeState,
  type ColorPalette,
} from '../avatars/look';
import type { Outcome } from './economy';
import { loadInventory } from './economy';
export interface WardrobeData {
  character: CharacterKind;
  wardrobe: WardrobeState;
  ownedIds: string[];
  allowedColors: ColorPalette;
}
export interface WardrobeApi {
  load(): Promise<Outcome<WardrobeData>>;
  save(character: CharacterKind, look: AvatarLook, expectedRevision: number): Promise<Outcome<WardrobeData>>;
}
export function supabaseWardrobeApi(s: SupabaseClient, uid: string): WardrobeApi {
  let snapshot: WardrobeData | undefined;
  const read = async (): Promise<Outcome<WardrobeData>> => {
    const [profile, inventory, settings] = await Promise.all([
      s.from('profiles').select('avatar').eq('id', uid).single(),
      loadInventory(s),
      s.from('settings').select('avatar_palette,avatar_skin_palette').eq('id', 1).single(),
    ]);
    if (profile.error || !inventory.ok || settings.error)
      return { ok: false, message: tr('Der Kleiderschrank konnte nicht geladen werden.') };
    const kind = profile.data?.avatar?.character;
    if (kind !== 'boy' && kind !== 'girl') return { ok: false, message: tr('Wähle zuerst deine Figur aus.') };
    const cloth = settings.data.avatar_palette as string[],
      skin = settings.data.avatar_skin_palette as string[];
    return {
      ok: true,
      value: {
        character: kind,
        wardrobe: readWardrobe(profile.data.avatar),
        ownedIds: Object.keys(inventory.value),
        allowedColors: { ...DEFAULT_COLORS, hair: cloth, top: cloth, bottoms: cloth, shoes: cloth, skin },
      },
    };
  };
  const load = async (): Promise<Outcome<WardrobeData>> => {
    try {
      const result = await read();
      if (result.ok) snapshot = result.value;
      return result;
    } catch {
      return { ok: false, message: tr('Der Kleiderschrank konnte nicht geladen werden.') };
    }
  };
  return {
    load,
    async save(character, look, expectedRevision) {
      const { data, error } = await s.rpc('save_avatar_look', {
        p_character: character,
        p_look: look,
        p_expected_revision: expectedRevision,
      });
      if (error)
        return {
          ok: false,
          code:
            error.message.includes('revision conflict') || error.message.includes('character changed')
              ? 'revision_conflict'
              : undefined,
          message:
            error.message.includes('revision conflict') || error.message.includes('character changed')
              ? tr('Dein Look wurde inzwischen geändert. Lade den gespeicherten Look neu.')
              : tr('Dein Look konnte nicht gespeichert werden. Bitte noch einmal versuchen.'),
        };
      // Read fresh possession/palettes, but always publish the authoritative write response first.
      const previous = snapshot;
      const fresh = await load();
      const current = fresh.ok ? fresh.value : previous;
      if (!current)
        return { ok: false, message: tr('Der Look ist gespeichert. Bitte lade den Kleiderschrank neu.') };
      return {
        ok: true,
        value: {
          ...current,
          character: data.character,
          wardrobe: readWardrobe({ wardrobe: data.wardrobe }),
        },
      };
    },
  };
}
