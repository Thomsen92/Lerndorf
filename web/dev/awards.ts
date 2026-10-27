import { frameStyle, avatarPortrait } from '../src/ui/frames';
import { crestSvg } from '../src/ui/crest';
import { titlePlaque } from '../src/ui/titlePlaque';
import { openVisitorProfile } from '../src/ui/visitorProfile';
const ranks = ['wood', 'bronze', 'silver', 'gold', 'emerald', 'sapphire', 'rainbow'];
for (const [index, rank] of ranks.entries()) {
  const level = index * 5 + 2,
    frameId = `frame_${rank}`,
    b = document.createElement('button');
  b.type = 'button';
  b.className = 'award-sample';
  b.dataset.level = String(level);
  b.append(avatarPortrait({ character: 'girl', frameId, size: 'large' }), crestSvg(level, 80));
  const title = document.createElement('strong');
  title.textContent = frameStyle(frameId).label;
  const label = [
    'Newcomer',
    'Quest Rookie',
    'Grammar Explorer',
    'Vocab Hero',
    'Village Star',
    'Quest Master',
    'Lerndorf Champion',
  ][index];
  b.append(title, titlePlaque(label, level, true));
  const plate = document.createElement('div'),
    caption = document.createElement('small');
  plate.className = 'title-sample';
  caption.textContent = `Level ${index === 0 ? 1 : index * 5}${index === 6 ? '+' : `–${index * 5 + 4}`}`;
  plate.append(titlePlaque(label, level), caption);
  document.querySelector('#titles')!.append(plate);
  b.onclick = () =>
    openVisitorProfile({
      id: 'sample-lea',
      opener: b,
      load: async () => ({
        ok: true,
        value: {
          id: 'sample-lea',
          nickname: 'Lea',
          level,
          frameId,
          titleLabel: level >= 10 ? 'Grammar Explorer' : level >= 7 ? 'Busy Bee' : 'Newcomer',
          streak: 6,
          character: 'girl',
          look: { items: [], colors: {} },
        },
      }),
    });
  document.querySelector('#awards')!.append(b);
}
