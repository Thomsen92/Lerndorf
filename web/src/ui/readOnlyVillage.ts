import type { SupabaseClient } from '@supabase/supabase-js';
import { loadMembersAsTeacher, loadClass } from '../api/village';
import { loadClassSlots } from '../api/build';
import { loadClassNotice } from '../api/notice';
import { createReadOnlyScene } from './readOnlyScene';
import { openReadOnlyQuests } from './readOnlyQuests';
import type { AreaHandle } from './areas';
import { esc } from './esc';
export interface ReadOnlyView {
  pupilId: string;
  nickname: string;
  classId: string;
  plotIndex: number | null;
  onExit: () => void;
}
export async function mountReadOnlyVillage(
  root: HTMLElement,
  s: SupabaseClient,
  view: ReadOnlyView,
): Promise<{ dispose(): void }> {
  root.innerHTML = `<div class="read-only-band"><strong>Ansicht von ${esc(view.nickname)} – nur ansehen</strong><button type="button">Zurück zum Lehrerbereich</button></div><button type="button" class="read-only-tasks">Aufgaben</button><div class="stage"></div><p class="read-only-error" role="status"></p>`;
  root.querySelector<HTMLButtonElement>('.read-only-band button')!.onclick = view.onExit;
  let area: AreaHandle | null = null,
    scene: ReturnType<typeof createReadOnlyScene> | null = null,
    disposed = false;
  const showQuests = () => {
    area?.close();
    scene?.setPaused(true);
    area = openReadOnlyQuests(s, view.pupilId, view.nickname, () => {
      area = null;
      scene?.setPaused(false);
    });
  };
  root.querySelector<HTMLButtonElement>('.read-only-tasks')!.onclick = showQuests;
  try {
    // The server role check runs first. No pupil RPC, progress flow, sound unlock or tutorial is mounted.
    const members = await loadMembersAsTeacher(s, view.classId);
    if (!members.some((m) => m.id === view.pupilId))
      throw new Error('Schüler in dieser Klasse nicht gefunden.');
    const [cls, slots, note] = await Promise.all([
      loadClass(s, view.classId),
      loadClassSlots(s),
      loadClassNotice(s, view.classId),
    ]);
    if (!disposed)
      scene = createReadOnlyScene(
        root.querySelector('.stage')!,
        members,
        cls,
        slots,
        view,
        showQuests,
        note?.text ?? null,
      );
  } catch (err) {
    if (!disposed)
      root.querySelector('.read-only-error')!.textContent =
        err instanceof Error ? err.message : 'Die Ansicht konnte nicht geladen werden.';
  }
  return {
    dispose() {
      disposed = true;
      area?.close();
      scene?.dispose();
      root.replaceChildren();
    },
  };
}
