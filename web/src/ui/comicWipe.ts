import './comicWipe.css';

/**
 * A short comic-band wipe between two camera stations. `onCovered` runs once, while the screen is
 * hidden, so the camera can jump without the pupil seeing it. With reduced motion it is a soft fade.
 */
export function runComicWipe(onCovered: () => void, reduced: boolean): Promise<void> {
  const el = document.createElement('div');
  el.className = `comic-wipe${reduced ? ' comic-wipe--soft' : ''}`;
  document.body.append(el);
  const done = (): void => el.remove();
  if (typeof el.animate !== 'function') {
    onCovered();
    done();
    return Promise.resolve();
  }
  if (reduced) {
    onCovered();
    const anim = el.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
      duration: 320,
      easing: 'ease-in-out',
    });
    return Promise.resolve(anim.finished)
      .catch(() => undefined)
      .then(done);
  }
  const anim = el.animate(
    [
      { transform: 'translateX(-130%) skewX(-12deg)' },
      { transform: 'translateX(0%) skewX(-12deg)' },
      { transform: 'translateX(130%) skewX(-12deg)' },
    ],
    { duration: 700, easing: 'cubic-bezier(.7,0,.3,1)' },
  );
  return new Promise<void>((resolve) => {
    // Cover the screen at the midpoint, then wait for the band to leave (with a safety timeout).
    window.setTimeout(() => {
      onCovered();
      const finished = Promise.resolve(anim.finished).catch(() => undefined);
      const fallback = new Promise<void>((r) => window.setTimeout(r, 1200));
      void Promise.race([finished, fallback]).then(() => {
        done();
        resolve();
      });
    }, 320);
  });
}
