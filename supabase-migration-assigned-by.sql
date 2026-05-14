-- Migration: Add assigned_by column to tasks table
-- Run this in your Supabase SQL editor

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Index for fast lookups of tasks assigned by a specific person
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
