-- Lerndorf: tighten function grants after the Supabase security advisor run.
-- The default grant to PUBLIC lets anon call security definer functions; revoke that first.

-- Policy helpers: anon may call current_class() and is_teacher() (they answer null/false for
-- guests and expose nothing), so RLS on profiles still returns an empty list instead of an error.
revoke execute on function public.current_class() from public;
revoke execute on function public.is_teacher() from public;
grant execute on function public.current_class() to anon, authenticated;
grant execute on function public.is_teacher() to anon, authenticated;

-- Functions that return data about pupils: logged-in users only.
revoke execute on function public.class_member_ids() from public, anon;
revoke execute on function public.village_members() from public, anon;
grant execute on function public.class_member_ids() to authenticated;
grant execute on function public.village_members() to authenticated;

-- require_teacher is only called from other security definer functions (owned by postgres),
-- so no client role needs to execute it.
revoke execute on function public.require_teacher() from public, anon, authenticated;
