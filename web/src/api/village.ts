/** Data the village needs: own profile, class settings and classmates. Read-only (SPEC §6). */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Plots per class: 32 pupils + 2 reserve (SPEC §10, §19). Fixed, not per pupil count,
 * so that the layout of a class does not change when a pupil is added.
 */
export const PLOT_COUNT = 34;

export interface MyProfile {
  id: string;
  nickname: string;
  classId: string;
  plotIndex: number | null;
  coins: number;
}

export interface ClassSettings {
  id: string;
  layoutSeed: number;
  mapId: string;
  shopOpen: boolean;
  buildOpen: boolean;
}

export interface Member {
  id: string;
  nickname: string;
  plotIndex: number | null;
}

export class VillageLoadError extends Error {}

/** The pupil chooses a free plot as building site (RPC claim_plot). The choice is final. */
export async function claimPlot(
  supabase: SupabaseClient,
  index: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('claim_plot', { p_index: index });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function loadMyProfile(supabase: SupabaseClient): Promise<MyProfile> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new VillageLoadError('not logged in');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, class_id, plot_index, coins')
    .eq('id', uid)
    .single();
  if (error || !data || !data.class_id) throw new VillageLoadError('profile not found');
  return {
    id: data.id,
    nickname: data.nickname,
    classId: data.class_id,
    plotIndex: data.plot_index,
    coins: data.coins,
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
  return (data ?? []).map((r: { id: string; nickname: string; plot_index: number | null }) => ({
    id: r.id,
    nickname: r.nickname,
    plotIndex: r.plot_index,
  }));
}
