import { tr } from '../i18n';

/** Stable IDs match the local English/German recordings in assets/shopkeeper/voice. */
export const OLLIE_LINE_IDS = ['welcome', 'recommend', 'coins', 'about', 'bought', 'farewell'] as const;
export type OllieLineId = (typeof OLLIE_LINE_IDS)[number];
const SOURCE: Record<OllieLineId, string> = {
  welcome: 'G’day! Ich bin Ollie. Schau dich in Ruhe um — Stöbern kostet nichts.',
  recommend: 'Such dir etwas aus, das zu deinem Dorf passt. Mit dem Herz kannst du es dir für später merken.',
  coins:
    'Übe Englisch im Dorf, um Münzen zu verdienen. Dann komm für etwas Schönes zurück. Echtes Geld brauchst du hier nicht.',
  about:
    'Ich kam zu Besuch. Dann brauchte jemand eine Bank, also blieb ich. Jetzt habe ich einen ganzen Laden.',
  bought: 'Gute Wahl! Dein Dorf wird immer mehr zu deinem Zuhause.',
  farewell: 'Cheers! Viel Spaß beim Stöbern. Ich bin hier und tue so, als würde ich aufräumen.',
};
export function ollieLine(id: OllieLineId): string {
  return tr(SOURCE[id]);
}
