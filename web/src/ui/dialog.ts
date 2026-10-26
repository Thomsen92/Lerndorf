import { tr } from '../i18n';
/**
 * Accessible modal dialog shared by the item detail and the settings menu.
 * role="dialog" + aria-modal, everything behind it is made inert, Escape and the close button close it
 * (unless canClose says no), focus moves in on open and returns to the opener on close. Modals can be stacked.
 * Contract: close the topmost modal first; closing a lower modal while another is open is unsupported.
 */
export interface ModalOptions {
  title: string;
  /** focus returns here on close */
  opener?: HTMLElement | null;
  /** false while a transaction runs */
  canClose?: () => boolean;
  onClose?: () => void;
  wide?: boolean;
}

export interface ModalHandle {
  body: HTMLElement;
  close(): void;
  readonly isOpen: boolean;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// open modals, topmost last; only the topmost reacts to Escape
const stack: HTMLElement[] = [];
let counter = 0;

export function openModal(opts: ModalOptions): ModalHandle {
  const id = `modal-title-${++counter}`;
  const overlay = document.createElement('div');
  overlay.className = 'overlay modal';

  const panel = document.createElement('section');
  panel.className = opts.wide ? 'panel wide' : 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', id);
  panel.setAttribute('tabindex', '-1');

  const head = document.createElement('div');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.id = id;
  h2.textContent = opts.title;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = tr('Schließen');
  head.append(h2, closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  panel.append(head, body);
  overlay.appendChild(panel);

  // make everything else inert; remember only what this modal changed
  const madeInert: Element[] = [];
  for (const el of Array.from(document.body.children)) {
    if (!el.hasAttribute('inert')) {
      el.setAttribute('inert', '');
      madeInert.push(el);
    }
  }
  document.body.appendChild(overlay);
  stack.push(overlay);

  let isOpen = true;
  const tryClose = (): void => {
    if (!isOpen) return;
    if (opts.canClose && !opts.canClose()) return;
    close();
  };
  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('keydown', onKey, true);
    const i = stack.indexOf(overlay);
    if (i >= 0) stack.splice(i, 1);
    overlay.remove();
    for (const el of madeInert) el.removeAttribute('inert');
    if (opts.opener && opts.opener.isConnected) opts.opener.focus();
    opts.onClose?.();
  }

  function onKey(e: KeyboardEvent): void {
    if (stack[stack.length - 1] !== overlay) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      tryClose();
    } else if (e.key === 'Tab') {
      // keep Tab inside the dialog
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  document.addEventListener('keydown', onKey, true);

  closeBtn.addEventListener('click', tryClose);
  // tap on the dimmed backdrop (not on the panel) closes, same guard as Escape
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) tryClose();
  });

  (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();

  return {
    body,
    close,
    get isOpen() {
      return isOpen;
    },
  };
}
