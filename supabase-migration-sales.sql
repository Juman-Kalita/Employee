-- Sales projects table (global projects visible to all employees)
CREATE TABLE IF NOT EXISTS sales_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_projects_name ON sales_projects(name);

ALTER TABLE sales_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on sales_projects" ON sales_projects;
CREATE POLICY "Allow all operations on sales_projects" ON sales_projects FOR ALL USING (true) WITH CHECK (true);
