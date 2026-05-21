-- Migration: Add 'pending-approval' to tasks status constraint
-- This drops ALL check constraints on the status column and recreates the correct one.
-- Run this in your Supabase SQL editor.

-- Step 1: Drop every possible name the constraint might have
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check1;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_fkey;

-- Step 2: Remove the constraint by column using a DO block (handles any auto-generated name)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END;
$$;

-- Step 3: Add the correct constraint with all allowed values
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in-progress', 'completed', 'pending-approval'));
