-- Per-user visit tracking (one row per auth user).
-- Apply in Supabase SQL editor or via `supabase db push`.

CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_visit timestamptz NOT NULL DEFAULT now(),
  last_visit timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1 CHECK (visit_count >= 1),
  is_returning boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS user_sessions_last_visit_idx ON public.user_sessions (last_visit DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;

CREATE POLICY "user_sessions_select_own"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_insert_own"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sessions_update_own"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Atomic first visit vs return visit (uses JWT uid; call from authenticated Supabase client only).
CREATE OR REPLACE FUNCTION public.record_user_session_visit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_sessions (user_id, first_visit, last_visit, visit_count, is_returning)
  VALUES (uid, now(), now(), 1, false)
  ON CONFLICT (user_id) DO UPDATE SET
    last_visit = now(),
    visit_count = public.user_sessions.visit_count + 1,
    is_returning = true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_session_visit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_session_visit() TO authenticated;
