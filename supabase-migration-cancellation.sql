-- Migration to add cancellation request fields to tasks table
-- Run this if you already have an existing database

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_status TEXT CHECK (cancellation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS cancellation_admin_response TEXT;
