import type { SupabaseClient } from '@supabase/supabase-js';
import type { Outcome } from './economy';
import { isCharacterKind, type CharacterKind } from '../render/character';
import { normalizeLook, type AvatarLook } from '../avatars/look';
import { tr } from '../i18n';
export interface PublicProfile {
  id: string;
  nickname: string;
  level: number;
  titleLabel: string | null;
  frameId: string;
  streak: number;
  character: CharacterKind | null;
  look: AvatarLook;
}
export async function loadPublicProfile(s: SupabaseClient, id: string): Promise<Outcome<PublicProfile>> {
  try {
    const { data, error } = await s.rpc('public_profile', { p_player_id: id });
    if (error || !data || typeof data.nickname !== 'string' || typeof data.id !== 'string')
      throw Error('unavailable');
    return {
      ok: true,
      value: {
        id: data.id,
        nickname: data.nickname,
        level: Math.max(1, Number(data.level) || 1),
        titleLabel: typeof data.title_label === 'string' ? data.title_label : null,
        frameId: data.frame_id ?? 'frame_wood',
        streak: Math.max(0, Number(data.current_streak) || 0),
        character: isCharacterKind(data.character) ? data.character : null,
        look: normalizeLook(data.look),
      },
    };
  } catch {
    return { ok: false, message: tr('Das Profil konnte nicht geladen werden.') };
  }
}
