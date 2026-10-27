import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collectionApi } from '../../src/api/collection';

const state = {
  seasonId: '2026-11-halloween',
  cards: [{ cardId: 'night-light', quantity: 1, firstAcquiredAt: '2026-10-28T10:00:00Z' }],
};

it('reads the own cards without a player id and lets teachers read another pupil', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: state, error: null });
  const api = collectionApi({ rpc } as unknown as SupabaseClient);
  expect(await api.my('2026-11-halloween')).toEqual(state);
  expect(rpc).toHaveBeenLastCalledWith('my_season_cards', { p_season: '2026-11-halloween' });
  await api.teacherRead('00000000-0000-0000-0000-000000000021', '2026-11-halloween');
  expect(rpc).toHaveBeenLastCalledWith('teacher_player_cards', {
    p_player: '00000000-0000-0000-0000-000000000021',
    p_season: '2026-11-halloween',
  });
});

it('rejects duplicates, wrong quantities and malformed payloads', async () => {
  const rpc = vi.fn().mockResolvedValue({
    data: { ...state, cards: [state.cards[0], state.cards[0]] },
    error: null,
  });
  await expect(
    collectionApi({ rpc } as unknown as SupabaseClient).my('2026-11-halloween'),
  ).rejects.toThrow(/collection state/i);
  rpc.mockResolvedValue({ data: { ...state, cards: [{ ...state.cards[0], quantity: 2 }] }, error: null });
  await expect(
    collectionApi({ rpc } as unknown as SupabaseClient).my('2026-11-halloween'),
  ).rejects.toThrow(/collection state/i);
  rpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
  await expect(
    collectionApi({ rpc } as unknown as SupabaseClient).my('2026-11-halloween'),
  ).rejects.toThrow('forbidden');
});
