-- Balance deferred constraint triggers
-- These run at commit time (DEFERRABLE INITIALLY DEFERRED), so a transaction
-- can insert the expense and its participants in any order, and an edit can
-- replace every participant row, as long as the totals balance at commit.

CREATE OR REPLACE FUNCTION check_expense_balanced_by_id(p_expense_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_paid  BIGINT;
  v_owed  BIGINT;
  v_amount BIGINT;
  v_deleted TIMESTAMPTZ;
BEGIN
  SELECT amount, deleted_at
    INTO v_amount, v_deleted
    FROM expenses
   WHERE id = p_expense_id;

  -- Expense does not exist or is soft-deleted: skip check.
  IF NOT FOUND OR v_deleted IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(paid::BIGINT), 0),
         COALESCE(SUM(owed::BIGINT), 0)
    INTO v_paid, v_owed
    FROM expense_participants
   WHERE expense_id = p_expense_id;

  IF v_paid <> v_amount::BIGINT OR v_owed <> v_amount::BIGINT THEN
    RAISE EXCEPTION
      'Expense % unbalanced: amount=%, paid=%, owed=%',
      p_expense_id, v_amount, v_paid, v_owed
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Trigger function for expense_participants
-- Handles INSERT, UPDATE (including cross-expense moves) and DELETE.
CREATE OR REPLACE FUNCTION trg_fn_participant_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM check_expense_balanced_by_id(OLD.expense_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.expense_id <> NEW.expense_id THEN
    -- Row moved to a different expense: check both.
    PERFORM check_expense_balanced_by_id(OLD.expense_id);
    PERFORM check_expense_balanced_by_id(NEW.expense_id);
    RETURN NEW;
  ELSE
    PERFORM check_expense_balanced_by_id(NEW.expense_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_participants_balance_check ON expense_participants;
CREATE CONSTRAINT TRIGGER trg_participants_balance_check
  AFTER INSERT OR UPDATE OR DELETE ON expense_participants
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_fn_participant_balance();


-- Trigger function for expenses
-- Fires on INSERT (catches expense with zero participants committed immediately)
-- and on UPDATE of amount or deleted_at (catches restores and amount changes).
CREATE OR REPLACE FUNCTION trg_fn_expense_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM check_expense_balanced_by_id(NEW.id);
  ELSIF NEW.amount <> OLD.amount
     OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    -- Amount changed, or expense was restored: re-check balance.
    PERFORM check_expense_balanced_by_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_balance_check ON expenses;
CREATE CONSTRAINT TRIGGER trg_expenses_balance_check
  AFTER INSERT OR UPDATE OF amount, deleted_at ON expenses
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_fn_expense_balance();