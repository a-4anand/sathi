-- ============================================================
-- 043_saathi_followups_and_locale.sql
--
-- Saathi adds two staff preferences and an account-scoped internal
-- follow-up model. Follow-ups are deliberately separate from WhatsApp
-- messages: completing one never writes to `messages` or calls Meta.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS business_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_language_preference_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_language_preference_check
      CHECK (language_preference IN ('en', 'hi'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  note TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_account_due
  ON follow_ups(account_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_contact
  ON follow_ups(contact_id, due_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assignee
  ON follow_ups(assigned_to_user_id, status, due_at);

CREATE OR REPLACE FUNCTION validate_follow_up_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.account_id IS DISTINCT FROM OLD.account_id
      OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
    THEN
      RAISE EXCEPTION 'follow-up account and creator are immutable';
    END IF;
    NEW.created_at := OLD.created_at;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = NEW.contact_id AND c.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'contact does not belong to follow-up account';
  END IF;

  IF NEW.conversation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = NEW.conversation_id
      AND c.contact_id = NEW.contact_id
      AND c.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'conversation does not belong to follow-up contact';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = NEW.assigned_to_user_id
      AND p.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'assignee does not belong to follow-up account';
  END IF;

  NEW.updated_at := NOW();
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
    NEW.completed_by_user_id := auth.uid();
  ELSIF NEW.status = 'open' THEN
    NEW.completed_at := NULL;
    NEW.completed_by_user_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS follow_ups_validate_scope ON follow_ups;
CREATE TRIGGER follow_ups_validate_scope
  BEFORE INSERT OR UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION validate_follow_up_scope();

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follow_ups_select ON follow_ups;
DROP POLICY IF EXISTS follow_ups_insert ON follow_ups;
DROP POLICY IF EXISTS follow_ups_update ON follow_ups;
DROP POLICY IF EXISTS follow_ups_delete ON follow_ups;
CREATE POLICY follow_ups_select ON follow_ups FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY follow_ups_insert ON follow_ups FOR INSERT
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND created_by_user_id = auth.uid()
  );
CREATE POLICY follow_ups_update ON follow_ups FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY follow_ups_delete ON follow_ups FOR DELETE
  USING (is_account_member(account_id, 'admin'));

COMMENT ON TABLE follow_ups IS
  'Internal account-scoped reminders. They never represent customer messages.';
