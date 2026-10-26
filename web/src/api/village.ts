import { tr } from '../i18n';
/** Data the village needs: own profile, class settings and classmates. Read-only (SPEC §6). */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isCharacterKind, type CharacterKind } from '../render/character';
import { readWardrobe, type WardrobeState } from '../avatars/look';

/**
 * Plots per class: 32 pupils + 2 reserve (SPEC §10, §19). Fixed, not per pupil count,
 * so that the layout of a class does not change when a pupil is added.
 */
export const PLOT_COUNT = 34;

export interface MyProfile {
  wardrobe?: WardrobeState;
  id: string;
  nickname: string;
  classId: string;
  plotIndex: number | null;
  coins: number;
  /** Boy or girl; null until the pupil has picked a figure. */
  character: CharacterKind | null;
}

export interface ClassSettings {
  id: string;
  layoutSeed: number;
  mapId: string;
  shopOpen: boolean;
  buildOpen: boolean;
}

export interface Member {
  wardrobe?: WardrobeState;
  level?: number;
  titleLabel?: string | null;
  frameId?: string;
  id: string;
  nickname: string;
  plotIndex: number | null;
  character: CharacterKind | null;
}

/** The figure stored in the avatar recipe (avatar.character), or null. */
export function characterOf(avatar: unknown): CharacterKind | null {
  const c = (avatar as { character?: unknown } | null)?.character;
  return isCharacterKind(c) ? c : null;
}

/** Saves the pupil's figure (RPC set_character). */
export async function saveCharacter(
  supabase: SupabaseClient,
  character: CharacterKind,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('set_character', { p_character: character });
  if (error)
    return {
      ok: false,
      message: tr('Die Figur konnte nicht gespeichert werden. Bitte noch einmal versuchen.'),
    };
  return { ok: true };
}

export class VillageLoadError extends Error {}

export async function loadMyProfile(supabase: SupabaseClient): Promise<MyProfile> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new VillageLoadError('not logged in');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, class_id, plot_index, coins, avatar')
    .eq('id', uid)
    .single();
  if (error || !data || !data.class_id) throw new VillageLoadError('profile not found');
  return {
    id: data.id,
    nickname: data.nickname,
    classId: data.class_id,
    plotIndex: data.plot_index,
    coins: data.coins,
    character: characterOf(data.avatar),
    wardrobe: readWardrobe(data.avatar),
  };
}

export async function loadClass(supabase: SupabaseClient, classId: string): Promise<ClassSettings> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, layout_seed, map_id, shop_open, build_open')
    .eq('id', classId)
    .single();
  if (error || !data) throw new VillageLoadError('class not found');
  return {
    id: data.id,
    layoutSeed: data.layout_seed,
    mapId: data.map_id,
    shopOpen: data.shop_open,
    buildOpen: data.build_open,
  };
}

/** Classmates via the RPC village_members(), which never returns coins. */
export async function loadMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data, error } = await supabase.rpc('village_members');
  if (error) throw new VillageLoadError('members not available');
  return (data ?? []).map(
    (r: {
      id: string;
      nickname: string;
      plot_index: number | null;
      avatar?: unknown;
      level?: number;
      title_label?: string | null;
      frame_id?: string;
    }) => ({
      id: r.id,
      nickname: r.nickname,
      plotIndex: r.plot_index,
      character: characterOf(r.avatar),
      wardrobe: readWardrobe(r.avatar),
      level: r.level,
      titleLabel: r.title_label ?? null,
      frameId: r.frame_id ?? 'frame_wood',
    }),
  );
}

export async function loadMembersAsTeacher(s: SupabaseClient, classId: string): Promise<Member[]> {
  const { data, error } = await s.rpc('teacher_village_members', { p_class_id: classId });
  if (error) throw new VillageLoadError('Diese Ansicht ist nur für Lehrkräfte verfügbar.');
  return (data ?? []).map(
    (r: {
      id: string;
      nickname: string;
      plot_index: number | null;
      avatar: unknown;
      level: number;
      title_label: string | null;
      frame_id: string;
    }) => ({
      id: r.id,
      nickname: r.nickname,
      plotIndex: r.plot_index,
      character: characterOf(r.avatar),
      wardrobe: readWardrobe(r.avatar),
      level: r.level,
      titleLabel: r.title_label,
      frameId: r.frame_id,
    }),
  );
}
