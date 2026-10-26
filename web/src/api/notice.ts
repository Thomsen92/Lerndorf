import type { SupabaseClient } from '@supabase/supabase-js';
export interface ClassNotice {
  text: string;
  validUntil: string;
  createdAt: string;
}
export async function loadClassNotice(s: SupabaseClient, classId: string): Promise<ClassNotice | null> {
  try {
    const { data, error } = await s
      .from('class_notices')
      .select('text,valid_until,created_at')
      .eq('class_id', classId)
      .maybeSingle();
    if (error || !data) return null;
    // RLS also enforces expiry for pupils; this check keeps teacher preview/dev fixtures consistent.
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return data.valid_until < today
      ? null
      : { text: data.text, validUntil: data.valid_until, createdAt: data.created_at };
  } catch {
    return null;
  }
}
