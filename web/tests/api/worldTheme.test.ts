import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { worldThemeApi, type WorldThemeState } from '../../src/api/worldTheme';

const normal: WorldThemeState = {
  classId: '8a',
  requestedTheme: 'normal',
  effectiveTheme: 'normal',
  revision: 0,
  seasonId: '2026-11-halloween',
  seasonLabel: 'Season I – Halloween',
  seasonState: 'running',
  welcomeSeen: false,
};

it('reads the own class without parameters and passes a class only to teacher RPCs', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: normal, error: null });
  const api = worldThemeApi({ rpc } as unknown as SupabaseClient);
  expect(await api.state()).toEqual(normal);
  expect(rpc).toHaveBeenLastCalledWith('world_theme_state');
  await api.teacherState('8b');
  expect(rpc).toHaveBeenLastCalledWith('teacher_world_theme_state', { p_class: '8b' });
  await api.teacherSet('8b', 'halloween', '2026-11-halloween');
  expect(rpc).toHaveBeenLastCalledWith('teacher_set_world_theme', {
    p_class: '8b',
    p_theme: 'halloween',
    p_season: '2026-11-halloween',
  });
});

it('acknowledges the welcome for a season only', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  await worldThemeApi({ rpc } as unknown as SupabaseClient).acknowledgeWelcome('2026-11-halloween');
  expect(rpc).toHaveBeenLastCalledWith('ack_season_welcome', { p_season: '2026-11-halloween' });
});

it('propagates RPC failures for the caller to show a safe message', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'forbidden' } });
  const api = worldThemeApi({ rpc } as unknown as SupabaseClient);
  await expect(api.state()).rejects.toThrow('forbidden');
  await expect(api.teacherState('8a')).rejects.toThrow('forbidden');
  await expect(api.teacherSet('8a', 'normal', null)).rejects.toThrow('forbidden');
  await expect(api.acknowledgeWelcome('2026-11-halloween')).rejects.toThrow('forbidden');
});

it('rejects malformed configuration instead of activating an unsupported world', async () => {
  const broken = { ...normal, requestedTheme: 'winter' };
  const rpc = vi.fn().mockResolvedValue({ data: broken, error: null });
  await expect(worldThemeApi({ rpc } as unknown as SupabaseClient).state()).rejects.toThrow(
    /world theme/i,
  );
  const missing = { ...normal, welcomeSeen: undefined };
  rpc.mockResolvedValue({ data: missing, error: null });
  await expect(worldThemeApi({ rpc } as unknown as SupabaseClient).state()).rejects.toThrow(
    /world theme/i,
  );
});
