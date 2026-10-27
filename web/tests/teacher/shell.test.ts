// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mountShell } from '../../src/teacher/shell';
import { PAGE_LABELS, type PageId } from '../../src/teacher/router';
import type { TeacherPage } from '../../src/teacher/context';
it('routes pages, preserves class selection, unmounts and isolates board mode', async () => {
  location.hash = '#8a/uebersicht';
  const root = document.createElement('div');
  document.body.append(root);
  const unmount = vi.fn();
  const mount = vi.fn((h: HTMLElement) => {
    h.textContent = 'page';
  });
  const pages = Object.fromEntries(
    Object.keys(PAGE_LABELS).map((k) => [k, async () => ({ title: k, mount, unmount })]),
  ) as unknown as Record<PageId, () => Promise<TeacherPage>>;
  const shell = mountShell(root, { auth: { signOut: vi.fn() } } as unknown as SupabaseClient, pages);
  await new Promise((r) => setTimeout(r, 0));
  expect(root.querySelectorAll('.teacher-nav a')).toHaveLength(7);
  expect(root.querySelector('[aria-current=page]')?.textContent).toBe('Übersicht');
  expect(root.querySelector('[role=status]')).not.toBeNull();
  (root.querySelector('[data-class="8b"]') as HTMLButtonElement).click();
  await new Promise((r) => setTimeout(r, 0));
  expect(location.hash).toBe('#8b/uebersicht');
  location.hash = '#8b/tafel';
  window.dispatchEvent(new Event('hashchange'));
  await new Promise((r) => setTimeout(r, 0));
  expect(root.classList.contains('board-mode')).toBe(true);
  expect(unmount).toHaveBeenCalled();
  shell.dispose();
  root.remove();
});
