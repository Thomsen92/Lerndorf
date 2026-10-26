/**
 * Figure choice (boy or girl): shown once on the first login, and again from the settings
 * ("Figur wechseln"). On the first login it cannot be closed without a choice.
 */
import { CHARACTER_KINDS, CHARACTER_LABEL, characterAssetUrl, type CharacterKind } from '../render/character';
import { openModal, type ModalHandle } from './dialog';

export function openCharacterPicker(opts: {
  /** true on the first login: no way out without a choice */
  required: boolean;
  current: CharacterKind | null;
  opener?: HTMLElement | null;
  /** saves the choice; resolves an error message or null on success */
  onPick: (kind: CharacterKind) => Promise<string | null>;
}): ModalHandle {
  let busy = false;
  let chosen = false;
  const modal = openModal({
    title: opts.required ? 'Wähle deine Figur' : 'Figur wechseln',
    opener: opts.opener ?? null,
    canClose: () => !busy && (chosen || !opts.required),
  });
  const text = document.createElement('p');
  text.textContent = opts.required
    ? 'Mit dieser Figur läufst du durchs Dorf. Du kannst sie später in den Einstellungen wechseln.'
    : 'Tippe auf die Figur, die du haben möchtest.';
  const row = document.createElement('div');
  row.className = 'character-choices';
  const status = document.createElement('p');
  status.className = 'status';
  status.setAttribute('role', 'status');
  const buttons: HTMLButtonElement[] = [];
  for (const kind of CHARACTER_KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'character-choice';
    b.dataset.character = kind;
    b.setAttribute('aria-pressed', String(opts.current === kind));
    const img = document.createElement('img');
    img.src = characterAssetUrl(kind, 'png');
    img.alt = '';
    const label = document.createElement('span');
    label.textContent = CHARACTER_LABEL[kind];
    b.append(img, label);
    b.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      buttons.forEach((x) => (x.disabled = true));
      status.textContent = 'Wird gespeichert …';
      const error = await opts.onPick(kind);
      busy = false;
      buttons.forEach((x) => (x.disabled = false));
      if (error) {
        status.textContent = error;
        return;
      }
      chosen = true;
      modal.close();
    });
    buttons.push(b);
    row.appendChild(b);
  }
  modal.body.append(text, row, status);
  // first login: no close button, the choice is the only way on
  if (opts.required) {
    const close = modal.body.previousElementSibling?.querySelector<HTMLButtonElement>('button');
    if (close) close.hidden = true;
  }
  return modal;
}
