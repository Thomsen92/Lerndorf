// Entry point. Without a session: login. With a session: the village.
import { tr } from './i18n';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabase } from './api/client';
import { renderLogin } from './ui/loginView';
import { mountVillage, type VillageHandle } from './ui/villageView';
import { takeLoginFragment } from './auth/qrLogin';
import { isTeacherSession } from './teacher/api';
import { applyUiScale } from './ui/uiScale';

// Clear credentials before client setup, session loading or any rendering/network call.
let qrLogin = takeLoginFragment();
applyUiScale();

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  let supabase: SupabaseClient;
  try {
    supabase = createSupabase();
  } catch (err) {
    root.textContent = tr('Die Verbindung zum Server ist nicht eingerichtet. Bitte die Lehrkraft fragen.');
    console.error(err);
    return;
  }

  let village: VillageHandle | null = null;
  const show = async (): Promise<void> => {
    village?.dispose();
    village = null;
    if (qrLogin) {
      const credentials = qrLogin;
      qrLogin = null;
      renderLogin(root, supabase, () => void show(), credentials);
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const id = new URLSearchParams(location.search).get('ansehen');
      if (id && (await isTeacherSession(supabase))) {
        const { data: p, error } = await supabase
          .from('profiles')
          .select('id,nickname,class_id,plot_index')
          .eq('id', id)
          .eq('role', 'student')
          .maybeSingle();
        if (error || !p) {
          root.textContent = 'Dieser Schüler wurde nicht gefunden.';
          return;
        }
        village = await mountVillage(root, supabase, () => void show(), {
          readOnly: {
            pupilId: p.id,
            nickname: p.nickname,
            classId: p.class_id,
            plotIndex: p.plot_index,
            onExit: () => location.assign(`/lehrer/#${p.class_id}/schueler/${encodeURIComponent(p.id)}`),
          },
        });
      } else {
        village = await mountVillage(root, supabase, () => void show());
      }
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
