-- Migration to add extension request fields to tasks table
-- Run this if you already have the tasks table created

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS extension_reason TEXT,
ADD COLUMN IF NOT EXISTS extension_proposed_deadline DATE,
ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS extension_status TEXT CHECK (extension_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS extension_admin_response TEXT,
ADD COLUMN IF NOT EXISTS extension_blocked_by_employee UUID REFERENCES employees(id) ON DELETE SET NULL;
