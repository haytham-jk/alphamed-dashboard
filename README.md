# Alphamed Operations Hub

Alphamed Operations Hub is a React and Supabase dashboard for managing clinical-support operations, customer records, installed instruments, training, linearity schedules, Unity Real Time installations, and EQAS Online records.

## Main Features

- Dashboard with active, pending, unresolved, and escalated case metrics
- Support-case creation, editing, resolution, and multi-customer assignment
- Primary-customer handling for single-customer and multi-customer cases
- Customer and installed-asset management
- Training record tracking with historical instrument snapshots
- Linearity scheduling with six-month and annual frequencies
- Unity Real Time installation and service-pack tracking
- EQAS Online account management
- Role-aware editing for administrators and editors
- Supabase authentication and Row Level Security
- Progressive Web App installation and update prompts
- Route-level code splitting with React lazy loading
- Unsaved-change protection and global success notifications

## Technology Stack

- React 19
- Vite
- React Router
- Tailwind CSS 4
- Supabase
- Lucide React
- Vite PWA
- Vercel

## Requirements

Use Node.js 22 LTS or later.

Verify the installed version:

```bash
node --version
npm --version
```

## Local Setup

1. Clone the repository.

```bash
git clone <repository-url>
cd alphamed-dashboard
```

2. Install dependencies.

```bash
npm install
```

3. Create a local environment file named `.env.local` in the project root.

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Never commit `.env`, `.env.local`, service-role keys, passwords, or other secrets.

4. Start the development server.

```bash
npm run dev
```

## Available Commands

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run lint
```

Runs ESLint across the project.

```bash
npm run build
```

Creates a production build in `dist/` and generates the PWA service worker.

```bash
npm run preview
```

Serves the production build locally for testing.

## Project Structure

```text
src/
├── components/
│   ├── auth/
│   ├── cases/
│   └── ui/
├── constants/
├── hooks/
├── lib/
├── pages/
├── services/
├── utils/
├── App.jsx
├── index.css
└── main.jsx
```

### Key Areas

- `src/pages`: routed application pages
- `src/components`: shared interface and case-form components
- `src/services`: Supabase queries and mutations
- `src/constants`: shared statuses and selection options
- `src/hooks`: reusable React hooks
- `src/utils`: normalization and date utilities
- `src/lib/supabase.js`: Supabase client setup

## Authentication and Permissions

Supabase Authentication manages user sessions. Application profiles determine the visible role and editing capability.

The frontend currently treats these roles as editable:

- `admin`
- `editor`

Other authenticated roles are read-only in the interface. Supabase Row Level Security remains the authoritative database security layer.

## Case and Customer Rules

Support cases can be linked to one or more customers through `case_customers`.

The following rules must be preserved in future changes:

1. Form customer IDs are normalized as strings.
2. Duplicate customer IDs are removed.
3. A single selected customer is valid and automatically becomes primary.
4. A multi-customer case must have exactly one primary customer.
5. If the selected primary customer is removed, another selected customer becomes primary.
6. Internal cases clear both customer IDs and the primary customer.
7. Customer IDs are converted to numbers only at the Supabase boundary.

Case creation and update use atomic PostgreSQL functions so the support case and customer relationships succeed or fail together.

## Escalated Cases

The Dashboard considers a case escalated when:

- Its status is active, and
- `escalated_to` contains a destination such as CDG, Customer Service, or another support team.

The Escalated card opens:

```text
/cases?escalated=true
```

This definition allows an `In Progress` or `Unresolved` case to remain operationally active while being escalated to another team.

## Database Changes

Database changes should be maintained as versioned SQL migrations rather than one-off SQL files in the repository root.

Recommended location:

```text
supabase/migrations/
```

Use timestamped migration names, for example:

```text
supabase/migrations/20260728_01_atomic_case_writes.sql
```

Do not commit production row exports or customer-sensitive support-case data.

## PWA Testing

After building:

```bash
npm run build
npm run preview
```

Test the following:

- Installation prompt
- Update prompt
- Direct refresh of nested routes
- Lazy-loaded route chunks
- Offline behavior for previously cached pages

When testing a deployed update, accept the update prompt or clear old site data if a stale service worker is still active.

## Deployment

The project can be deployed to Vercel. `vercel.json` provides the Single Page Application rewrite to `index.html`.

Required production environment variables:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

After deployment, verify:

- Authentication
- Role-based editing
- Nested-route refreshes
- Supabase RLS behavior
- PWA installation and updates
- Create and edit workflows

## Pre-Commit Checklist

Before committing:

```bash
npm run lint
npm run build
```

Also verify:

- No `.env` files are staged
- No database row exports are staged
- No patch scripts or backup files are staged
- No generated `dist/` or `node_modules/` files are staged
- Case customer and primary-customer behavior still works
- Global success messages appear and dismiss correctly

Inspect staged files:

```bash
git status
git diff --cached
```

## Data Privacy

This application may process operational and customer-related support information. Do not commit:

- Production database exports
- Customer names or case descriptions used only for testing
- Credentials or access tokens
- Supabase service-role keys
- User profile exports
- Screenshots containing sensitive information

Use anonymized or synthetic fixtures if test data is added later.

## Maintenance Notes

Keep this README updated when adding:

- New routes or modules
- New Supabase tables, views, or RPC functions
- New environment variables
- New roles or permissions
- New build or deployment requirements
- New migration or testing procedures
