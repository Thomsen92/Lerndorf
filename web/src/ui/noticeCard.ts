import { tr } from '../i18n';
import type { ClassNotice } from '../api/notice';
import { openModal, type ModalHandle } from './dialog';
export function noticeSeenKey(n: ClassNotice): string {
  return 'lerndorf.notice.' + n.createdAt;
}
export function openNoticeCard(
  n: ClassNotice,
  opts: { store?: Pick<Storage, 'getItem' | 'setItem'> | null; onDone: () => void },
): ModalHandle | null {
  let store = opts.store;
  if (store === undefined) {
    try {
      store = globalThis.localStorage;
    } catch {
      store = null;
    }
  }
  try {
    if (store?.getItem(noticeSeenKey(n))) return null;
  } catch {
    /* Shared devices can disable storage. */
  }
  const card = openModal({
    title: tr('Nachricht von deiner Lehrkraft'),
    onClose: () => {
      try {
        store?.setItem(noticeSeenKey(n), '1');
      } catch {
        /* Acknowledgement still works. */
      }
      opts.onDone();
    },
  });
  const text = document.createElement('p');
  text.className = 'class-notice-text';
  text.textContent = n.text;
  const ok = document.createElement('button');
  ok.className = 'primary';
  ok.textContent = 'OK';
  ok.onclick = () => card.close();
  card.body.append(text, ok);
  ok.focus();
  return card;
}
