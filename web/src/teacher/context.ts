import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassId, PageId, Route } from './router';
export interface TeacherContext {
  supabase: SupabaseClient;
  classId: ClassId;
  route: Route;
  alive(): boolean;
  status(text: string, kind?: 'ok' | 'error'): void;
  go(page: PageId, pupil?: string, filter?: string): void;
  refresh(): void;
}
export interface TeacherPage {
  title: string;
  mount(host: HTMLElement, ctx: TeacherContext): Promise<void> | void;
  unmount?(): void;
}
