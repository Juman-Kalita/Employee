# Supabase Setup Instructions

## Step 1: Create Database Tables

1. Go to your Supabase project: https://splmsbopncyjznioqyom.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script to create all tables and indexes

## Step 2: Verify Tables Created

Check that these tables exist in your database:
- `employees`
- `tasks`
- `notifications`

## Step 3: Switch to Supabase Store

The application is ready to use Supabase! The following files need to be updated to use the new Supabase store:

### Files to Update:

1. **src/pages/EmployeeManagement.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
2. **src/pages/TaskManagement.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
3. **src/pages/AdminDashboard.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
4. **src/pages/EmployeeDashboard.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
5. **src/pages/EmployeePerformance.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
6. **src/pages/AnalyticsPage.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
7. **src/components/NotificationBell.tsx** - Change imports from `./lib/store` to `./lib/supabaseStore`
8. **src/lib/auth.tsx** - Replace with `./lib/supabaseAuth.tsx`
9. **src/App.tsx** - Update AuthProvider import to use supabaseAuth

## Step 4: Update Components to Handle Async

Since Supabase operations are async, components need to be updated to use `useEffect` and state management for loading data.

## Default Admin Credentials

After running the SQL script, you can log in with:
- Email: admin@worktrack.com
- Password: admin123

## Environment Variables

Already configured in `.env`:
```
VITE_SUPABASE_URL=https://splmsbopncyjznioqyom.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vUliUX2uLf0KLFP3fpGLiA_qivFV6om
```
