import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPublicProfile } from '../../src/api/publicProfile';
it('reads the dedicated public RPC and preserves identifiers and the current look', async () => {
  const rpc = vi.fn(async () => ({
    error: null,
    data: {
      id: 'a',
      nickname: 'Haus',
      level: 7,
      title_label: 'Busy Bee',
      frame_id: 'frame_silver',
      current_streak: 6,
      character: 'girl',
      look: { items: ['avatar_boy_halberd'], colors: {} },
    },
  }));
  const result = await loadPublicProfile({ rpc } as unknown as SupabaseClient, 'a');
  expect(rpc).toHaveBeenCalledWith('public_profile', { p_player_id: 'a' });
  expect(result).toMatchObject({
    ok: true,
    value: { nickname: 'Haus', streak: 6, look: { items: ['avatar_boy_halberd'] } },
  });
});
it('reports missing and failed profiles without throwing backend details', async () => {
  const rpc = vi.fn(async () => {
    throw Error('private database detail');
  });
  const result = await loadPublicProfile({ rpc } as unknown as SupabaseClient, 'x');
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain('private database detail');
});
