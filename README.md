# Alphamed Operations Hub

**Current application version:** `2.4.3`

Alphamed Operations Hub is a React and Supabase application for clinical support operations, Customer sites, installed Assets, Training, Linearity, Unity Real Time, EQAS Online, and BioPlex inventory and matching workflows.

The application emphasizes role-based access, explicit database operations, auditability, strict date handling, request safety, optimistic concurrency, server-side operational lists, actionable Dashboard summaries, and historical inventory protection.

## Contents

- [Completed improvement phases](#completed-improvement-phases)
- [Dashboard](#dashboard)
- [Main capabilities](#main-capabilities)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Roles and security](#roles-and-security)
- [Reliability and data safeguards](#reliability-and-data-safeguards)
- [Local setup](#local-setup)
- [Development commands](#development-commands)
- [Database migrations](#database-migrations)
- [Testing and deployment](#testing-and-deployment)
- [Versioning policy](#versioning-policy)
- [Known boundaries](#known-boundaries)

## Completed improvement phases

### Phase 1: Integrity and safety

Established authorization, optimistic concurrency, transactional mutations, strict dates, request cancellation, first-invalid-field focus, and protected BioPlex operations.

### Phase 2: Scalability and performance

Moved major operational lists and Dashboard summaries server-side, added request cancellation and route preloading, and intentionally retained the complete grouped Assets view without pagination.

### Phase 3: Customer and Case workflows

Strengthened Customer duplicate detection and audited override, improved Case Customer selection, and preserved Case and Customer list state through view and edit workflows.

### Phase 4: BioPlex hardening and attention

Hardened import and expiry workflows, retained expired inventory history, added actionable Dashboard warnings, improved Stock Count grouping, and added relationship-aware PDF output.

## Dashboard

The Dashboard is the operational attention and navigation layer. It does not duplicate operational records into a separate Dashboard table and does not download complete datasets to calculate its normal summary cards.

### Data flow

- Loads lightweight Case, Linearity, and BioPlex summaries concurrently through server-side functions.
- Uses request cancellation so obsolete responses do not replace newer state.
- Keeps existing RLS and function permissions authoritative.

### Case cards and quick view

- **Active Cases** opens the Active Case list.
- **Overdue** opens Active Cases past their follow-up date.
- **Unresolved** opens Cases with Unresolved status.
- **Escalated** opens Cases with Escalated status.
- The overdue quick view shows the most overdue Cases first.
- Quick-view rows show Customer, follow-up urgency, status, and priority and link to Case Details.
- Status and priority badges preserve standard application color coding.

### Linearity attention

- Shows the overall Linearity attention count.
- Displays up to 10 overdue, due-today, or due-soon records.
- Orders urgent records from most overdue through due soon.
- Links each item to the applicable Linearity record.

### BioPlex attention

The Dashboard shows actionable cards for:

- Expired lots
- Lots expiring within 30 days
- Missing expiry
- Draft stock counts
- Matching-import blockers

Each card opens the underlying records rather than only opening generic BioPlex Management:

- Expired, expiring, and missing-expiry cards open filtered BioPlex Attention views.
- Draft counts open BioPlex Management with the Draft filter selected.
- Matching warnings show affected imports, blocking-row counts, and blocking reasons.
- Admin users can open import review or Lot Expiry maintenance where appropriate.

Expired lots displayed by the Dashboard remain stored and remain visible in historical counts and reports. Dashboard attention does not delete or rewrite inventory history.

## Main capabilities

### Cases

- Create, view, edit, resolve, and delete support Cases.
- Assign one primary Customer and additional Customers.
- Keep selected Customers visible with Primary, Additional, Set as primary, and Remove controls.
- Normalize `customerIds` and `primaryCustomerId` to prevent invalid combinations.
- Derive progress from authoritative status rules.
- Preserve list filters, sorting, page, and focus through Details, Edit, Resolve, Delete, and Back navigation.
- Prevent stale edits from overwriting newer changes.
- Use server-side search, filters, sorting, pagination, and counts.

### Customers

- Store Emirate, active state, Contacts, ISO/EIAC accreditation, CAP accreditation, and ISO/EIAC number.
- Support staged Contact Add, Edit, and Remove before final Customer save.
- Detect possible duplicate Customers and show similarity reasons.
- Require intentional audited override when creating a possible duplicate.
- Block stale duplicate overrides after the Customer name or Emirate changes.
- Provide Customer Site Overview using Assets, Unity Real Time, and EQAS Online as the source systems.
- Preserve Customer list filters, pagination, and card focus through Overview and Edit.
- Explain clearly when linked records prevent deletion.
- Use server-side search, filters, sorting, pagination, and counts.

### Assets

- Manage installed and unassigned instruments.
- Store Customer assignment, instrument type, serial number, installation date, active state, and notes.
- Keep all instrument-type groups together on one page. Pagination is intentionally not used because splitting the small set of collapsed groups was not operationally useful.
- Prevent stale Asset edits from overwriting newer changes.

### Training

- Manage Customer and instrument-linked Training records.
- Store title, date, attendees, instrument snapshots, and notes.
- Use request-safe Customer instrument loading.
- Use server-side search, sorting, pagination, and counts.
- Prevent stale edits from overwriting newer changes.

### Linearity

- Manage instrument-linked Linearity records with six-month, annual, and Not Required behavior.
- Store instrument snapshots, lot number, performed date, applicability, and notes.
- Use server-side due-date calculation, due-state filtering, pagination, and counts.
- Preserve deterministic month-end and leap-year scheduling behavior.
- Prevent stale edits from overwriting newer changes.

### EQAS Online

- Manage Customer EQAS records with QCnet ID, Lab Number, and Lab Name.
- Group records by Customer while retaining separate underlying record IDs.
- Use server-side search and Customer-group pagination.
- Prevent stale edits from overwriting newer changes.

### Unity Real Time

- Manage Unity Real Time installations and Customer assignments.
- Store Primary ID, expiry, connectivity, service-pack information, credential references, and notes.
- Use server-side search, filters, pagination, and summary metrics.
- Prevent stale edits from overwriting newer changes.

### BioPlex Inventory

- Create, save, reopen, complete, correct, soft-delete, and restore stock counts.
- Preserve blank quantity as unspecified and explicit zero as zero.
- Support reagent kits, calibrators, QC, and fixed consumables.
- Support many-to-many reagent and calibrator relationships.
- Relate QC by assay and type rather than forcing lot-to-lot matching.
- Retain expired master lots and all historical count items and links.
- Exclude expired and missing-expiry lots from normal active matching for new counts.
- Preserve completed-count historical snapshots after master-lot corrections.
- Provide Quick Excel, Detailed Excel, PDF, and Customer History exports.
- Display prominent reagent groups with separate matching-calibrator and related-QC panels.
- Identify shared calibrators and all reagent lots they match.
- Generate relationship-aware PDFs from historical count-specific links.

### BioPlex matching and imports

- Use a unified reagent, calibrator, or QC lot lookup.
- Review workbooks before staging data.
- Support Merge and Replace impact review.
- Detect duplicates, conflicts, warnings, exclusions, invalid rows, and missing relationships.
- Support row-level and bulk review decisions.
- Require an explicit Final Import action.
- Block missing expiry, invalid date, expired lot, missing calibrator, missing reagent, and missing compatible kit.
- Revalidate commit eligibility inside protected database operations.
- Preserve snapshot-based rollback and import audit history.
- Restrict import administration and expiry maintenance to Admin users.

## Technology stack

- React 19
- React Router
- Vite 8
- Supabase JavaScript client
- PostgreSQL through Supabase
- Tailwind CSS
- Lucide React
- Recharts
- jsPDF
- read-excel-file and write-excel-file
- Vite PWA plugin and Workbox
- ESLint
- Node.js built-in test runner

For exact dependency versions, see `package.json` and `package-lock.json`.

## Project structure

```text
alphamed-dashboard/
├── public/                   # Static PWA assets
├── src/
│   ├── components/           # Shared UI and domain components
│   ├── constants/            # Shared options and display rules
│   ├── hooks/                # Request and form hooks
│   ├── lib/                  # Supabase client setup
│   ├── pages/                # Routed pages
│   ├── services/             # Supabase queries and RPC calls
│   ├── utils/                # Validation, dates, concurrency, grouping, exports
│   ├── App.jsx               # Routes, navigation, authorization boundaries
│   └── main.jsx              # React entry and ErrorBoundary wrapper
├── tests/                    # Automated regression tests
├── supabase/
│   ├── migrations/           # Forward migrations
│   └── rollback/             # Rollback scripts where supplied
├── .env.example
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## Roles and security

### Viewer or active authenticated user

- Can access authorized read-only pages and records.
- Cannot access Editor or Admin mutation routes.

### Editor

- Can create and edit normal operational records where allowed.
- Can manage permitted Case, Customer, Asset, Training, Linearity, EQAS, Unity, and BioPlex count workflows.

### Admin

- Includes Editor capabilities.
- Can access BioPlex matching imports and Lot Expiry maintenance.

Frontend route protection improves the user experience, but database RLS, grants, and protected function authorization remain the security boundary.

Security requirements:

- Never expose the Supabase `service_role` key in browser code.
- Never commit database passwords, connection strings, Auth exports, access tokens, or `.env` files.
- Preserve explicit authorization and restricted `search_path` behavior in `SECURITY DEFINER` functions.
- Treat uploaded workbooks as untrusted input.
- Review new dependencies for maintenance and known security issues.
- Avoid `SELECT *` and unnecessary wildcard queries.

## Reliability and data safeguards

### Optimistic concurrency

Sensitive edits send the loaded version timestamp. PostgreSQL validates the current record before accepting the mutation. A stale edit returns the application's concurrency condition and is translated into a clear user-facing message.

Protection applies across Customers, Cases, Assets, Training, Linearity, EQAS Online, Unity Real Time, BioPlex counts, BioPlex import review, and BioPlex expiry corrections where applicable.

### Request-safe loading

Shared hooks cancel or suppress obsolete requests so older responses do not replace newer page state.

### Server-side operational lists

Cases, Customers, Training, Linearity, EQAS Online, and Unity Real Time use server-side search, filtering or sorting, pagination where appropriate, and server-derived counts. Assets intentionally remains a single grouped page.

### Navigation performance

Common lazy route chunks preload during browser idle time and on hover, keyboard focus, and touch. Preloading downloads JavaScript only. It does not mount pages or start Supabase data requests. Less-used New, Edit, and detail routes remain lazy-loaded.

### Date handling

- User-facing dates use `DD/MM/YYYY` where applicable.
- PostgreSQL stores native `date` and `timestamptz` values.
- Native date inputs use `YYYY-MM-DD` as required by the browser.
- Strict parsers reject impossible dates.
- Matching-sheet text dates are interpreted as `MM/DD/YYYY`.

### BioPlex historical safety

- Expiry affects future operational availability, not historical retention.
- Completed count items and relationships are historical snapshots.
- Lot expiry maintenance does not rewrite completed counts.
- Corrections require reasons and create audit events.
- Expiry correction does not reactivate intentionally inactive relationships.
- Historical PDFs use stored count links, not current master matching data.

## Local setup

### Prerequisites

- Supported Node.js release
- npm
- Git
- Access to the required Supabase project

### Install dependencies

```bash
npm install
```

### Environment variables

Create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Only browser-safe public configuration may use the `VITE_` prefix. Never expose administrative secrets through Vite environment variables.

## Development commands

```bash
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

The test script runs the tracked files under `tests/*.test.js`.

## Database migrations

- Store forward migrations under `supabase/migrations/`.
- Store rollback scripts under `supabase/rollback/` when supplied.
- Do not commit database row dumps, Auth exports, backups, or Base64 function exports.
- Review function signatures, grants, RLS behavior, triggers, and table size before deployment.
- Run migrations before frontend code that depends on new RPC signatures.
- Run the supplied verification SQL after each migration.
- Do not rerun an already verified migration blindly.
- The Supabase Free plan has a 500 MB database limit. Avoid unnecessary indexes, materialized views, cache tables, duplicated data, and oversized audit payloads.

## Testing and deployment

Before an important push or deployment:

```bash
npm test
npm run lint
npm run build
```

Then:

1. Review `git status` and the staged diff.
2. Confirm no `.env` files, credentials, backups, ZIP deliveries, database exports, `dist/`, coverage, or local verification files are staged.
3. Apply required database migrations before the dependent frontend deployment.
4. Run database verification SQL.
5. Test affected workflows with Viewer, Editor, and Admin roles as applicable.
6. For concurrency changes, test the same record in two sessions.
7. Verify the PWA receives the new service worker and frontend assets.

The PWA build generates `dist/`, service-worker files, and Workbox assets. Under the current policy, `dist/` is generated by deployment and is not committed.

## Git and repository hygiene

Normally track:

```text
src/
tests/
public/
supabase/migrations/
supabase/rollback/
.env.example
.gitignore
README.md
package.json
package-lock.json
vite.config.js
```

Normally ignore:

```text
node_modules/
dist/
coverage/
.env files
logs
local caches
backup files
ZIP delivery packages
database row exports
Auth exports
Base64 function exports
local audit output
```

Recommended cumulative commit message for the completed work:

```text
Complete Phases 1-4 integrity, scalability, workflows, and BioPlex enhancements
```

## Versioning policy

- Current version: `2.4.3`.
- Keep `package.json`, `package-lock.json`, and the root lock-file package entry synchronized.
- Do not increase the version for bug fixes, lint fixes, test corrections, or verification-only work.
- Increase the version only when adding a genuine feature.
- Select the size of the increase according to the scope and significance of the feature.

## Known boundaries

- Direct delete workflows are not universally versioned.
- BioPlex rollback remains an Admin-only operation with advisory locking, latest-import restriction, snapshots, and atomic restoration.
- Workbook staging uses multiple bounded requests. A partially staged import cannot commit until preparation and blocker validation succeed.
- Assets intentionally does not use pagination.
- Development mode can feel slower than production preview because of React and Vite development checks.
- Supabase platform features such as Storage, Auth provider settings, Edge Functions, webhooks, and cron jobs require separate verification when used.

## Current status

**Phases 1 through 4 are complete and validated.**
