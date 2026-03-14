# Odoo Hackathon Alignment Notes

This project has been updated to align with Odoo's evaluation focus on code quality, modularity, security, scalability, and usability.

## What Was Improved

## 1) Validation and Usability
- Added strict backend validation with field-level error details using Zod.
- Normalized input values (trimmed strings, lowercased emails).
- Enforced stronger password policy (`min 8` characters).
- Added business-rule checks for operations:
  - Receipt requires destination location.
  - Delivery requires source location.
  - Internal transfer requires distinct source and destination locations.
  - Adjustment requires source location.
  - Product IDs must exist before operation creation.
- Added clear, consistent error responses for invalid payloads.

## 2) Security
- Added security response headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
- Added body size limit for JSON payloads.
- Added lightweight auth endpoint rate limiting for signup/login/reset flows.
- Added global `404` and `500` handlers for safer API behavior.

## 3) Performance and Scalability
- Added query limits:
  - `GET /api/operations?limit=` (capped)
  - `GET /api/ledger?limit=` (capped)
- Added relational indexes for frequent joins and filters:
  - users, OTP lookup, products, operation items, operations, stock balances, stock ledger.

## 4) Frontend Stability and Consistency
- Cleaned UI implementation for dashboard/products/operations to remove encoding artifacts and ensure consistent rendering.
- Added mobile top navigation when desktop sidebar is hidden.
- Removed duplicated legacy CSS block to reduce style conflicts.

## 5) Dynamic and Realtime Data
- Added Server-Sent Events endpoint: `GET /api/stream` (JWT-protected via query token or Bearer token).
- Added backend broadcast events for changes in stock, operations, products, locations, warehouses, and categories.
- Dashboard now subscribes to realtime events and refreshes KPIs/operations automatically.

## 6) Teamwork and Process Compliance Artifacts
- Added team Git workflow standard: `TEAM_GIT_WORKFLOW.md`
- Added shared presentation plan with role split: `TEAM_PRESENTATION_PLAN.md`
- Added quality checklist for judging prep: `VALIDATION_CHECKLIST.md`
- Added PR template for collaboration hygiene: `.github/PULL_REQUEST_TEMPLATE.md`

## 7) PostgreSQL Preference Compliance Pack
- Added PostgreSQL schema equivalent: `backend/sql/postgres_schema.sql`
- Added migration/run guide: `POSTGRESQL_MIGRATION.md`
- Moved the active backend runtime to PostgreSQL using `pg` connection pooling and async transactions.

## Database Note
Odoo guidance prefers local relational databases such as PostgreSQL/MySQL.
- Current implementation uses local PostgreSQL for the active backend runtime.
- Schema, seed flow, and API reads/writes now run directly against PostgreSQL.
- Health check and authenticated API smoke tests were verified against local PostgreSQL.

## Team and Git Workflow Recommendation
- Use branch-per-feature (`feature/...`) and require PR review before merge.
- Ensure each team member contributes commits and participates in final demo.
- Keep this file updated with architecture and tradeoff decisions.

## Strict Compliance Status (Final)
Code/runtime compliance is complete for the database requirement. The remaining judging proof items are process-oriented:

1. Show PostgreSQL readiness script output:
  - `npm run check:postgres --prefix backend`
2. Show team contribution evidence from real Git history:
  - `git shortlog -s -n --all`
  - `git log --oneline --graph --decorate --all`
3. Run frontend build check:
  - `npm run build --prefix frontend`

Runtime verification completed locally:
- `GET /api/health` returns `{ "ok": true, "database": "postgres" }`
- Demo login succeeds for `shubhmak1333@gmail.com`
- Authenticated dashboard reads return seeded KPI and operations data from PostgreSQL
