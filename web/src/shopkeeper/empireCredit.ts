import { getLocale } from '../i18n';
/** Attribution shipped with the supplied CC BY model, also visible beside its large preview. */
export function empireModelCredit(): HTMLElement {
  const p = document.createElement('p');
  p.className = 'empire-model-credit';
  const model = document.createElement('a');
  model.href = 'https://sketchfab.com/3d-models/new-york-buildings-e7922fe0f7b14ed786f84529f9217dac';
  model.textContent = 'New York Buildings — sumitmangela';
  const license = document.createElement('a');
  license.href = 'https://creativecommons.org/licenses/by/4.0/';
  license.textContent = 'CC BY 4.0';
  for (const link of [model, license]) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  p.append(
    model,
    ' · ',
    license,
    getLocale() === 'de' ? ' · freigestellt und verkleinert' : ' · isolated and scaled',
  );
  return p;
}
