// Development-only synthetic account. Never imported by the production entry points.
import source from '../../content/quests/ollie-roadtrip.json';
import audio from '../../content/quests/ollie-story-audio.json';
import type { OllieStoryApi, StoryState } from '../src/api/ollieStory';

export function ollieStoryFixture(wallet: {
  get(): number;
  set(coins: number): void;
  owned: Record<string, number>;
}) {
  let step = 0,
    grants = 0;
  const clip = (key: string) => audio.clips.find((c) => c.key === key)!.file.replace(/\.mp3$/, '');
  const state = (): StoryState => ({
    id: source.id,
    step,
    total: source.questions.length,
    completed: step === source.questions.length,
    coins: wallet.get(),
    reward: source.reward,
    question:
      step === source.questions.length
        ? null
        : {
            id: `gap-${step + 1}`,
            position: step + 1,
            narrative: source.questions[step].narrative,
            options: source.questions[step].options,
            clip: clip(`${source.questions[step].id}:question`),
          },
  });
  const api: OllieStoryApi = {
    state: async () => ({ ok: true, value: state() }),
    answer: async (id, answer) => {
      const position = Number(id.replace('gap-', ''));
      if (
        !Number.isInteger(position) ||
        position < 1 ||
        position > source.questions.length ||
        position > step + 1
      )
        return { ok: false, message: 'Question not current.' };
      const old = position <= step,
        q = source.questions[position - 1],
        correct = old || answer === q.solution;
      if (correct && !old) step++;
      const awarded = { coins: 0, xp: 0, itemId: null as string | null };
      if (correct && !old && step === source.questions.length) {
        grants++;
        wallet.set(wallet.get() + 50);
        wallet.owned[source.reward.itemId] = (wallet.owned[source.reward.itemId] ?? 0) + 1;
        Object.assign(awarded, { coins: 50, xp: 80, itemId: source.reward.itemId });
      }
      return {
        ok: true,
        value: {
          correct,
          alreadySolved: old,
          hint: correct ? null : q.hint,
          feedback: correct && !old ? { text: q.reply, clip: clip(`${q.id}:reply`) } : null,
          state: state(),
          awarded,
          progress: awarded.xp
            ? { gained: [{ reason: 'quest', xp: 80 }], xp: 80, level: 1, levelBefore: 0, newChests: 0 }
            : null,
        },
      };
    },
  };
  return {
    api,
    get step() {
      return step;
    },
    get grants() {
      return grants;
    },
    get awardedXp() {
      return grants ? 80 : 0;
    },
  };
}
