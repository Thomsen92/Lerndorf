import { tr, msg } from '../../i18n';
/**
 * Texts of the first-login tutorial (spec docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md).
 * German, simple language, short. The quiz itself is English and comes from the server.
 */

/** The two explanations after the camera flight; each stays until „Weiter“. */
export const MESSAGES: readonly string[] = [
  tr('Jeden Tag gibt es Daily Quests. Das sind kleine Englisch-Aufgaben.'),
  tr('Für richtige Antworten bekommst du Münzen. Mit Münzen kaufst du Sachen für dein Haus.'),
];

/** Bubble of the own figure in front of the ruin. */
export const SAD_TEXT = tr('Oh nein, mein Haus ist eine Ruine!');

/** Final bubble while the figure dances (spec §9.2, exact wording). */
export const FINAL_TEXT = tr('Jetzt wird gelernt und Dailys gemacht!');

/** Reward of the tutorial quiz in coins (server: tutorial_reward()). Only used for the text. */
export const REWARD = 50;
export const QUIZ_DONE = msg`Super, alles richtig! Du bekommst ${REWARD} Münzen.`;

export const BUY_TITLE = tr('Dein erstes Haus');
export const BUY_TEXT = tr('Kauf dir das Fachwerkhaus. Dann stellst du es auf dein Grundstück.');
export const BUY_BUTTON = tr('Haus kaufen');

export const PLACE_HINT = tr('Tippe auf „Fachwerkhaus“ und dann auf „Haus hinstellen“.');
export const PLACE_BUTTON = tr('Haus hinstellen');

export const NEXT = tr('Weiter');
export const RETRY = tr('Noch einmal versuchen');
export const NETWORK_ERROR = tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.');
