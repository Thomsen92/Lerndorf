// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openModal, type ModalHandle } from '../../src/ui/dialog';

const esc = (target: EventTarget = document): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

let open: ModalHandle[] = [];
const modal = (...args: Parameters<typeof openModal>): ModalHandle => {
  const h = openModal(...args);
  open.push(h);
  return h;
};

beforeEach(() => {
  document.body.innerHTML = '<main id="app"><button id="open-btn">Open</button></main><nav id="nav"></nav>';
});
afterEach(() => {
  [...open].reverse().forEach((h) => h.close());
  open = [];
});

describe('openModal', () => {
  it('renders an accessible dialog labelled by its title', () => {
    const h = modal({ title: 'Mein <Haus>' });
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    const h2 = document.getElementById(dlg.getAttribute('aria-labelledby') as string) as HTMLElement;
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe('Mein <Haus>');
    expect(dlg.contains(h.body)).toBe(true);
    expect(dlg.closest('.overlay.modal')).not.toBeNull();
  });

  it('sets inert on all other body children and removes it on close', () => {
    const h = modal({ title: 'T' });
    expect(document.getElementById('app')!.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('nav')!.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('.overlay.modal')!.hasAttribute('inert')).toBe(false);
    h.close();
    expect(document.getElementById('app')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('nav')!.hasAttribute('inert')).toBe(false);
    expect(h.isOpen).toBe(false);
    expect(document.querySelector('.overlay.modal')).toBeNull();
  });

  it('keeps inert that was set by someone else', () => {
    document.getElementById('nav')!.setAttribute('inert', '');
    const h = modal({ title: 'T' });
    h.close();
    expect(document.getElementById('nav')!.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('app')!.hasAttribute('inert')).toBe(false);
  });

  it('moves focus to the first focusable element', () => {
    modal({ title: 'T' });
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(document.activeElement).toBe(dlg.querySelector('button'));
    expect(document.activeElement!.textContent).toBe('Schließen');
  });

  it('makes the panel programmatically focusable (fallback target)', () => {
    modal({ title: 'T' });
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dlg.getAttribute('tabindex')).toBe('-1');
  });

  it('closes on Escape, calls onClose once and returns focus to the opener', () => {
    const opener = document.getElementById('open-btn') as HTMLElement;
    const onClose = vi.fn();
    const h = modal({ title: 'T', opener, onClose });
    esc();
    esc();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(h.isOpen).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes with the Schließen button', () => {
    const onClose = vi.fn();
    modal({ title: 'T', onClose });
    (document.querySelector('.panel-head button') as HTMLElement).click();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.overlay.modal')).toBeNull();
  });

  it('ignores Escape and the close button while canClose is false', () => {
    const onClose = vi.fn();
    const h = modal({ title: 'T', canClose: () => false, onClose });
    esc();
    (document.querySelector('.panel-head button') as HTMLElement).click();
    expect(h.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('.overlay.modal')).not.toBeNull();
  });

  it('keeps inert behind the lower modal when the top one closes', () => {
    const a = modal({ title: 'A' });
    const b = modal({ title: 'B' });
    const overlays = document.querySelectorAll('.overlay.modal');
    expect(overlays[0].hasAttribute('inert')).toBe(true);
    expect(overlays[1].hasAttribute('inert')).toBe(false);
    esc(); // only the top one reacts
    expect(b.isOpen).toBe(false);
    expect(a.isOpen).toBe(true);
    expect(document.getElementById('app')!.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('nav')!.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('.overlay.modal')!.hasAttribute('inert')).toBe(false);
    a.close();
    expect(document.getElementById('app')!.hasAttribute('inert')).toBe(false);
  });

  it('closes on a click on the backdrop', () => {
    const onClose = vi.fn();
    modal({ title: 'T', onClose });
    (document.querySelector('.overlay.modal') as HTMLElement).click();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.overlay.modal')).toBeNull();
  });

  it('ignores a backdrop click while canClose is false', () => {
    const onClose = vi.fn();
    const h = modal({ title: 'T', canClose: () => false, onClose });
    (document.querySelector('.overlay.modal') as HTMLElement).click();
    expect(h.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on a click inside the panel', () => {
    const onClose = vi.fn();
    const h = modal({ title: 'T', onClose });
    (document.querySelector('[role="dialog"]') as HTMLElement).click();
    h.body.click();
    expect(h.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Tab on the last focusable element wraps to the first', () => {
    const h = modal({ title: 'T' });
    const extra = document.createElement('button');
    extra.textContent = 'Extra';
    h.body.appendChild(extra);
    const first = document.querySelector('.panel-head button') as HTMLElement;
    extra.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab on the first focusable element wraps to the last', () => {
    const h = modal({ title: 'T' });
    const extra = document.createElement('button');
    extra.textContent = 'Extra';
    h.body.appendChild(extra);
    const first = document.querySelector('.panel-head button') as HTMLElement;
    first.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(extra);
  });

  it('close() is idempotent', () => {
    const onClose = vi.fn();
    const h = modal({ title: 'T', onClose });
    h.close();
    h.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
