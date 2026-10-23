/**
 * Texts of the first-login tutorial (spec docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md).
 * German, simple language, short. The quiz itself is English and comes from the server.
 */

/** The two explanations after the camera flight; each stays until „Weiter“. */
export const MESSAGES: readonly string[] = [
  'Jeden Tag gibt es Daily Quests. Das sind kleine Englisch-Aufgaben.',
  'Für richtige Antworten bekommst du Münzen. Mit Münzen kaufst du Sachen für dein Haus.',
];

/** Bubble of the own figure in front of the ruin. */
export const SAD_TEXT = 'Oh nein, mein Haus ist eine Ruine!';

/** Final bubble while the figure dances (spec §9.2, exact wording). */
export const FINAL_TEXT = 'Jetzt wird gelernt und Dailys gemacht!';

/** Before the quiz: what happens next. */
export const QUIZ_INTRO = 'Beantworte fünf leichte Fragen. Dann bekommst du Münzen für ein neues Haus.';

/** Reward of the tutorial quiz in coins (server: tutorial_reward()). Only used for the text. */
export const REWARD = 50;
export const QUIZ_DONE = `Super, alles richtig! Du bekommst ${REWARD} Münzen.`;

export const BUY_TITLE = 'Dein erstes Haus';
export const BUY_TEXT = 'Kauf dir das Fachwerkhaus. Dann stellst du es auf dein Grundstück.';
export const BUY_BUTTON = 'Haus kaufen';

export const PLACE_HINT = 'Tippe auf „Fachwerkhaus“ und dann auf „Haus hinstellen“.';
export const PLACE_BUTTON = 'Haus hinstellen';

export const NEXT = 'Weiter';
export const RETRY = 'Noch einmal versuchen';
export const NETWORK_ERROR = 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
