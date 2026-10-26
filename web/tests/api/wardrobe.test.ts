import { it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseWardrobeApi } from '../../src/api/wardrobe';
import { emptyLook, CLOTH_COLORS, SKIN_COLORS } from '../../src/avatars/look';
it('keeps an acknowledged write successful when the following refresh fails', async () => {
  let fail = false;
  const wardrobe = { v: 1, revision: 1, boy: emptyLook(), girl: emptyLook() };
  const s = {
    from(table: string) {
      const c = {
        select: () => c,
        eq: () => c,
        async single() {
          return fail
            ? { data: null, error: { message: 'offline' } }
            : {
                data:
                  table === 'profiles'
                    ? { avatar: { character: 'boy' } }
                    : { avatar_palette: CLOTH_COLORS, avatar_skin_palette: SKIN_COLORS },
                error: null,
              };
        },
        async gt() {
          return { data: [], error: null };
        },
      };
      return c;
    },
    async rpc() {
      fail = true;
      return { data: { character: 'boy', wardrobe }, error: null };
    },
  } as unknown as SupabaseClient;
  const api = supabaseWardrobeApi(s, 'u');
  expect((await api.load()).ok).toBe(true);
  const saved = await api.save('boy', emptyLook(), 0);
  expect(saved.ok).toBe(true);
  if (saved.ok) expect(saved.value.wardrobe.revision).toBe(1);
});
