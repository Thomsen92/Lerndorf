// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createAvatarBadge } from '../../src/ui/avatarBadge';
import { toastLines } from '../../src/ui/xpToast';
import { chestResultText } from '../../src/ui/levelUp';
it('shows exact accessible badge and progress', async () => {
  const open = vi.fn(),
    b = createAvatarBadge({ nickname: 'Lea', character: 'girl', onOpen: open, reducedMotion: () => true });
  await b.animateTo({
    level: 6,
    xp: 620,
    levelXp: 500,
    nextLevelXp: 675,
    coins: 330,
    streak: 6,
    chests: 2,
    frameId: 'frame_bronze',
  });
  expect(b.el.getAttribute('aria-label')).toBe('Profil: Lea, Level 6, 120 von 175 XP, 330 Münzen');
  expect(b.el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('120');
  expect(b.el.textContent).toContain('2 Truhen ungeöffnet');
  b.el.click();
  expect(open).toHaveBeenCalled();
});
it('formats ordered XP feedback and chest rolls', () => {
  expect(
    toastLines({
      gained: [
        { reason: 'quest', xp: 15 },
        { reason: 'day_goal', xp: 15 },
        { reason: 'streak', xp: 25 },
      ],
      xp: 100,
      level: 2,
      levelBefore: 1,
      newChests: 1,
      streak: { current: 6, best: 6, shieldLeft: 1 },
    }),
  ).toEqual(['+15 XP', 'Tagesziel geschafft! +15 XP', '🔥 Serie: 6 Tage! +25 XP']);
  expect(chestResultText(30, 'triple')).toBe('+30 Münzen – Jackpot!');
});
