-- Remove politicas antigas que ainda dependem da coluna users.is_admin.
-- A aplicacao atual permite que cada usuario autenticado acesse apenas os proprios dados.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'time_records', 'justifications')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

DROP FUNCTION IF EXISTS public.is_admin_user();

CREATE OR REPLACE FUNCTION public.is_active_user() RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_active
  ) INTO result;
  RETURN result;
END;
$$;

CREATE POLICY "authenticated_select_users" ON public.users FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "authenticated_insert_users" ON public.users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "authenticated_update_users" ON public.users FOR UPDATE
  TO authenticated USING (auth.uid() = id AND public.is_active_user())
  WITH CHECK (auth.uid() = id AND public.is_active_user());
CREATE POLICY "authenticated_delete_users" ON public.users FOR DELETE
  TO authenticated USING (auth.uid() = id AND public.is_active_user());

CREATE POLICY "authenticated_select_time_records" ON public.time_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_insert_time_records" ON public.time_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_update_time_records" ON public.time_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_delete_time_records" ON public.time_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY "authenticated_select_justifications" ON public.justifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_insert_justifications" ON public.justifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_update_justifications" ON public.justifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_delete_justifications" ON public.justifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());
