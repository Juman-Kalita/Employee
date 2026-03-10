# WorkTrack - Employee Performance Tracking System

A modern task management and employee performance tracking system built with React, TypeScript, and Supabase.

## Features

- 🔐 **Role-Based Authentication** - Admin and Employee roles with separate dashboards
- 📊 **Performance Analytics** - Track task completion, efficiency, and productivity metrics
- ✅ **Task Management** - Create, assign, and track tasks with real-time status updates
- 👥 **Employee Management** - Add, edit, and manage employee accounts
- 📈 **Visual Dashboards** - Interactive charts and statistics for performance insights
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom auth with Supabase backend
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Juman-Kalita/Employee.git
cd Employee
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
- Go to your Supabase project SQL Editor
- Run the SQL script from `supabase-schema.sql`

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Default Credentials

**Admin Account:**
- Email: `admin@worktrack.com`
- Password: `admin123`

**Employee Accounts:**
- Created by admin through the Employee Management page
- Each employee gets their own login credentials

## Project Structure

```
worktrack-performance-main/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── ui/           # Shadcn UI components
│   ├── lib/              # Utilities and configurations
│   │   ├── supabase.ts   # Supabase client
│   │   ├── supabaseStore.ts  # Database operations
│   │   ├── supabaseAuth.tsx  # Authentication logic
│   │   └── types.ts      # TypeScript types
│   ├── pages/            # Application pages/routes
│   │   ├── AdminDashboard.tsx
│   │   ├── EmployeeDashboard.tsx
│   │   ├── TaskManagement.tsx
│   │   ├── EmployeeManagement.tsx
│   │   └── ...
│   └── main.tsx          # Application entry point
├── public/               # Static assets
└── supabase-schema.sql   # Database schema
```

## Features Overview

### Admin Features
- View team performance overview
- Create and assign tasks to employees
- Manage employee accounts (add, edit, delete)
- View analytics and reports
- Track task completion rates and efficiency

### Employee Features
- View assigned tasks
- Complete tasks and track time
- View personal performance metrics
- Monitor efficiency and productivity
- Access personal dashboard

## Task Workflow

1. **Admin creates a task** → Task automatically starts with "In Progress" status
2. **Employee views task** → Sees task details, deadline, and priority
3. **Employee completes task** → Clicks "Complete" button
4. **System calculates efficiency** → Based on time taken vs expected time
5. **Task moves to "Completed"** → Visible in analytics and reports

## Efficiency Calculation

Efficiency is calculated as:
```
Efficiency = (Expected Time / Actual Time) × 100
```

- **> 100%**: Task completed faster than expected ✅
- **= 100%**: Task completed on time ✅
- **< 100%**: Task took longer than expected ⚠️

## Database Schema

The application uses three main tables:
- **employees**: User accounts and profiles
- **tasks**: Task information and tracking
- **notifications**: User notifications

See `supabase-schema.sql` for the complete schema.

## Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@worktrack.com or open an issue in the repository.
