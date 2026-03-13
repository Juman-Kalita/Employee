-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES employees(id) ON DELETE CASCADE,
  expected_time INTEGER NOT NULL,
  deadline DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_time INTEGER,
  efficiency INTEGER,
  extension_reason TEXT,
  extension_proposed_deadline DATE,
  extension_requested_at TIMESTAMPTZ,
  extension_status TEXT CHECK (extension_status IN ('pending', 'approved', 'rejected')),
  extension_admin_response TEXT,
  extension_blocked_by_employee UUID REFERENCES employees(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  cancellation_requested_at TIMESTAMPTZ,
  cancellation_status TEXT CHECK (cancellation_status IN ('pending', 'approved', 'rejected')),
  cancellation_admin_response TEXT
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  for_user UUID REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_for_user ON notifications(for_user);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on employees" ON employees;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON notifications;

-- Create policies for employees table (allow all for now, will refine later)
CREATE POLICY "Allow all operations on employees" ON employees FOR ALL USING (true) WITH CHECK (true);

-- Create policies for tasks table
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Create policies for notifications table
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Insert admin user (password: admin123)
INSERT INTO employees (id, name, email, password, role, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@worktrack.com', 'admin123', 'Admin', 'active')
ON CONFLICT (email) DO NOTHING;
