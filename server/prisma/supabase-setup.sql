-- 1. Link profiles to auth.users & set up auto-profile creation trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, updated_at)
  VALUES (NEW.id, NEW.email, 'agent'::public.user_role, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Constraints & Trigram Search Indexes
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS customers_email_trgm_idx      ON customers USING gin (email      extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_first_name_trgm_idx ON customers USING gin (first_name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_last_name_trgm_idx  ON customers USING gin (last_name  extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_phone_trgm_idx      ON customers USING gin (phone      extensions.gin_trgm_ops);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_email_lowercase') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_email_lowercase CHECK (email = lower(email));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_exactly_one_target') THEN
    ALTER TABLE notes ADD CONSTRAINT notes_exactly_one_target CHECK (num_nonnulls(customer_id, order_id) = 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhook_events_attempts_nonneg') THEN
    ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_attempts_nonneg CHECK (attempts >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS webhook_events_claim_idx
  ON webhook_events (next_attempt_at)
  WHERE status = 'pending';

-- 3. Row Level Security & Realtime publication
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings      ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = (SELECT auth.uid())
  );
$$;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_select_staff ON public.orders;
CREATE POLICY orders_select_staff ON public.orders
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS customers_select_staff ON public.customers;
CREATE POLICY customers_select_staff ON public.customers
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS order_events_select_staff ON public.order_events;
CREATE POLICY order_events_select_staff ON public.order_events
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.profiles, public.orders, public.customers, public.order_events TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders', 'customers', 'order_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
