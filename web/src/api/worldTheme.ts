/** Class world theme API: thin adapter around the RPCs of migration 0034. */
import type { SupabaseClient } from '@supabase/supabase-js';

export type WorldTheme = 'normal' | 'halloween';
export type SeasonUiState = 'upcoming' | 'running' | 'ended' | 'closed';

export interface WorldThemeState {
  classId: string;
  requestedTheme: WorldTheme;
  effectiveTheme: WorldTheme;
  revision: number;
  seasonId: string | null;
  seasonLabel: string | null;
  seasonState: SeasonUiState | null;
  welcomeSeen: boolean;
}

export interface WorldThemeApi {
  /** The signed-in pupil's class. No class argument: the server reads it from auth. */
  state(): Promise<WorldThemeState>;
  /** Marks the running season welcome as seen for this pupil. Idempotent. */
  acknowledgeWelcome(seasonId: string): Promise<void>;
  teacherState(classId: string): Promise<WorldThemeState>;
  teacherSet(classId: string, theme: WorldTheme, seasonId: string | null): Promise<WorldThemeState>;
}

function isTheme(value: unknown): value is WorldTheme {
  return value === 'normal' || value === 'halloween';
}

function isSeasonState(value: unknown): value is SeasonUiState | null {
  return (
    value === null || value === 'upcoming' || value === 'running' || value === 'ended' || value === 'closed'
  );
}

function unwrap(data: unknown, error: { message: string } | null): WorldThemeState {
  if (error) throw new Error(error.message);
  const row = data as Partial<WorldThemeState> | null;
  if (
    !row ||
    typeof row.classId !== 'string' ||
    !row.classId ||
    !isTheme(row.requestedTheme) ||
    !isTheme(row.effectiveTheme) ||
    !Number.isSafeInteger(row.revision) ||
    (row.revision ?? -1) < 0 ||
    (row.seasonId !== null && typeof row.seasonId !== 'string') ||
    (row.seasonLabel !== null && typeof row.seasonLabel !== 'string') ||
    !isSeasonState(row.seasonState) ||
    typeof row.welcomeSeen !== 'boolean'
  ) {
    throw new Error('Invalid world theme state');
  }
  return row as WorldThemeState;
}

export function worldThemeApi(supabase: SupabaseClient): WorldThemeApi {
  return {
    async state() {
      const { data, error } = await supabase.rpc('world_theme_state');
      return unwrap(data, error);
    },
    async acknowledgeWelcome(seasonId) {
      const { error } = await supabase.rpc('ack_season_welcome', { p_season: seasonId });
      if (error) throw new Error(error.message);
    },
    async teacherState(classId) {
      const { data, error } = await supabase.rpc('teacher_world_theme_state', { p_class: classId });
      return unwrap(data, error);
    },
    async teacherSet(classId, theme, seasonId) {
      const { data, error } = await supabase.rpc('teacher_set_world_theme', {
        p_class: classId,
        p_theme: theme,
        p_season: seasonId,
      });
      return unwrap(data, error);
    },
  };
}
