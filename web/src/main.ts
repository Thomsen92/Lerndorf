// Entry point. Without a session: login. With a session: the village.
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabase } from './api/client';
import { renderLogin } from './ui/loginView';
import { mountVillage, type VillageHandle } from './ui/villageView';

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  let supabase: SupabaseClient;
  try {
    supabase = createSupabase();
  } catch (err) {
    root.textContent = 'Die Verbindung zum Server ist nicht eingerichtet. Bitte die Lehrkraft fragen.';
    console.error(err);
    return;
  }

  let village: VillageHandle | null = null;
  const show = async (): Promise<void> => {
    village?.dispose();
    village = null;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      village = await mountVillage(root, supabase, () => void show());
    } else {
      renderLogin(root, supabase, () => void show());
    }
  };

  // Logout in another tab or an expired session also switches the screen.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') void show();
  });
  await show();
}

void main();
