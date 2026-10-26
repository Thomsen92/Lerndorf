import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadClassPupils, loadClassBoard, adjustCoinsMany } from '../../src/teacher/api';
it('maps teacher fields without leaking auth records and reports failed requests', async () => {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({
      data: [
        {
          id: 'a',
          nickname: 'anna',
          coins: 10,
          plot_index: null,
          tutorial_step: 'quiz',
          last_sign_in_at: null,
          last_answer_at: '2026-10-26T12:00Z',
          quests_solved_week: 2,
          quests_offered_week: 9,
          holiday_week: false,
          level: 2,
          xp: 50,
          streak: 1,
        },
      ],
      error: null,
    });
  const s = { rpc } as unknown as SupabaseClient,
    r = await loadClassPupils(s, '8a', '2026-10-26');
  expect(r).toMatchObject({
    ok: true,
    value: [{ plotIndex: null, tutorialStep: 'quiz', questsSolvedWeek: 2, level: 2 }],
  });
  expect(rpc).toHaveBeenCalledWith('teacher_class_pupils', { p_class_id: '8a', p_week: '2026-10-26' });
  rpc.mockResolvedValueOnce({ error: { message: 'insufficient coins: anna' } });
  expect(await adjustCoinsMany(s, ['a'], -10, 'undo')).toMatchObject({
    ok: false,
    message: 'Nicht genug Münzen. Es wurde nichts gebucht.',
  });
  rpc.mockRejectedValueOnce(Error('offline'));
  expect(await loadClassBoard(s, '8a')).toMatchObject({ ok: false });
});
