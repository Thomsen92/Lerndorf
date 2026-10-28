import { tr } from '../i18n';
import type { Sound } from './sound';
import { silenceSirByte } from '../mascot/voice';
import { ollieLine, type OllieLineId } from '../shopkeeper/lines';
import { createOllieSpeech } from '../shopkeeper/speech';

/** A static portrait keeps the shop's main renderer available for selected item previews. */
export function createOlliePanel(
  sound?: Sound,
  onStory?: (opener: HTMLElement) => void,
): { element: HTMLElement; close(): void; bought(): void } {
  silenceSirByte();
  const element = document.createElement('aside');
  element.className = 'item-area-keeper';
  element.setAttribute('aria-label', tr('Ollies Marktstand'));
  const sign = document.createElement('span');
  sign.className = 'item-area-open-sign';
  sign.textContent = tr('Zeit zum Stöbern');
  const portrait = document.createElement('img');
  portrait.className = 'item-area-portrait';
  portrait.src = `${import.meta.env.BASE_URL}assets/shopkeeper/ollie-portrait.png`;
  portrait.alt = tr('Ollie an seinem Marktstand');
  const speech = createOllieSpeech({ portrait, sound });
  const card = document.createElement('div');
  card.className = 'item-area-keeper-card';
  const title = document.createElement('h3');
  title.textContent = 'Ollie';
  const subtitle = document.createElement('p');
  subtitle.className = 'item-area-keeper-subtitle';
  subtitle.textContent = tr('Dein freundlicher Dorfladenbesitzer');
  const line = document.createElement('p');
  line.className = 'item-area-keeper-line';
  line.setAttribute('role', 'status');
  line.textContent = ollieLine('welcome');
  const choices = document.createElement('div');
  choices.className = 'item-area-dialogue-choices';
  choices.hidden = true;
  let closed = false;
  const say = (id: OllieLineId): void => {
    if (closed) return;
    silenceSirByte();
    line.textContent = ollieLine(id);
    void speech.say(id);
  };
  for (const [label, text] of [
    ['Hast du einen Tipp?', 'recommend'],
    ['Wie verdiene ich Münzen?', 'coins'],
    ['Was ist deine Geschichte?', 'about'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tr(label);
    button.addEventListener('click', () => {
      if (text === 'about' && onStory) {
        speech.stop();
        onStory(button);
      } else say(text as OllieLineId);
    });
    choices.append(button);
  }
  const talk = document.createElement('button');
  talk.type = 'button';
  talk.className = 'item-area-talk';
  talk.textContent = tr('Sag Hallo');
  talk.setAttribute('aria-expanded', 'false');
  talk.addEventListener('click', () => {
    choices.hidden = !choices.hidden;
    talk.setAttribute('aria-expanded', String(!choices.hidden));
    talk.textContent = choices.hidden ? tr('Sag Hallo') : tr('Danke, Ollie');
    say(choices.hidden ? 'farewell' : 'welcome');
  });
  card.append(title, subtitle, line, talk, choices);
  if (onStory) {
    const quest = document.createElement('button');
    quest.type = 'button';
    quest.className = 'item-area-story-quest';
    quest.textContent = tr('Ollies Reisegeschichte');
    const reward = document.createElement('small');
    reward.textContent = tr('50 Münzen · 80 XP · New-York-Souvenir');
    quest.append(document.createElement('br'), reward);
    quest.addEventListener('click', () => {
      speech.stop();
      onStory(quest);
    });
    card.append(quest);
  }
  element.append(sign, portrait, card);
  // The real shop is opened by a gesture. Direct review URLs remain quiet until a tap.
  if (sound?.enabled && typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive)
    queueMicrotask(() => {
      if (!closed && element.isConnected) say('welcome');
    });
  return {
    element,
    close: () => {
      closed = true;
      speech.dispose();
    },
    bought: () => say('bought'),
  };
}
