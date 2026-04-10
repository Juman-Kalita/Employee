-- Add status and completed_at to sales_projects
ALTER TABLE sales_projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE sales_projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
