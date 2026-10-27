/** Collection ownership API: read-only adapter for migration 0049. No client-side grants. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CardOwnership, CollectionState } from '../collection/types';

export interface CollectionApi {
  my(seasonId: string): Promise<CollectionState>;
  teacherRead(playerId: string, seasonId: string): Promise<CollectionState>;
}

function unwrap(data: unknown, error: { message: string } | null): CollectionState {
  if (error) throw new Error(error.message);
  const row = data as Partial<CollectionState> | null;
  if (!row || typeof row.seasonId !== 'string' || !Array.isArray(row.cards))
    throw new Error('Invalid collection state');
  const seen = new Set<string>();
  const cards: CardOwnership[] = row.cards.map((entry) => {
    const card = entry as Partial<CardOwnership> | null;
    if (
      !card ||
      typeof card.cardId !== 'string' ||
      !card.cardId ||
      card.quantity !== 1 ||
      typeof card.firstAcquiredAt !== 'string' ||
      seen.has(card.cardId)
    )
      throw new Error('Invalid collection state');
    seen.add(card.cardId);
    return { cardId: card.cardId, quantity: 1, firstAcquiredAt: card.firstAcquiredAt };
  });
  return { seasonId: row.seasonId, cards };
}

export function collectionApi(supabase: SupabaseClient): CollectionApi {
  return {
    async my(seasonId) {
      const { data, error } = await supabase.rpc('my_season_cards', { p_season: seasonId });
      return unwrap(data, error);
    },
    async teacherRead(playerId, seasonId) {
      const { data, error } = await supabase.rpc('teacher_player_cards', {
        p_player: playerId,
        p_season: seasonId,
      });
      return unwrap(data, error);
    },
  };
}
