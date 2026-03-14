-- Add reschedule request columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reschedule_status TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reschedule_admin_response TEXT;
