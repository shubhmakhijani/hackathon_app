# Odoo Hackathon Judge Demo Script (8 Minutes)

This script is designed for live presentation with shared team ownership.

## Team Speaker Split
1. Speaker A (Architecture + DB): 0:00 to 2:00
2. Speaker B (Backend + Validation + Security): 2:00 to 4:00
3. Speaker C (Frontend + UX + Realtime): 4:00 to 6:30
4. Speaker D (Scalability + Git Process + Wrap): 6:30 to 8:00

---

## 0:00 - 0:30 (Speaker A) | Problem + Stack
Say:
- "We built CoreInventory from scratch as a local relational system."
- "No BaaS dependency."
- "Backend is Express + PostgreSQL, with a local schema we own end-to-end."

Show files:
- `backend/src/db.js`
- `backend/sql/postgres_schema.sql`
- `POSTGRESQL_MIGRATION.md`

---

## 0:30 - 2:00 (Speaker A) | Data Model
Say:
- "We modeled users, warehouses, locations, categories, products, operations, stock balances, operation items, and immutable stock ledger."
- "Inventory movements are audited in ledger for traceability."

Open and point to:
- `backend/sql/postgres_schema.sql`
- `backend/src/db.js`

Call out:
- foreign keys
- unique constraints
- indexes for frequent queries

---

## 2:00 - 3:00 (Speaker B) | API + Validation
Say:
- "All write endpoints enforce schema validation and return structured feedback."
- "Operation business rules are validated by operation type."

Show files:
- `backend/src/server.js`

Demonstrate invalid payload in terminal (PowerShell):
```powershell
$body = @{ email = 'invalid-email'; password = '123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
```
Expected:
- Validation error with clear feedback.

---

## 3:00 - 4:00 (Speaker B) | Security + Reliability
Say:
- "JWT-protected routes, auth rate limiting, request-size limits, secure headers, and centralized 404/500 handlers are implemented."

Quick health check:
```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health | Select-Object -ExpandProperty Content
```

Optional quick mention in code:
- security headers middleware
- authRateLimit middleware

---

## 4:00 - 5:00 (Speaker C) | UI Walkthrough
Login with seeded user:
- Email: `shubhmak1333@gmail.com`
- Password: `123456`

Navigate:
1. Dashboard
2. Products
3. Operations
4. Ledger
5. Warehouses

Say:
- "The UI is consistent, interactive, mobile-aware, and supports clear feedback on errors and actions."

---

## 5:00 - 6:30 (Speaker C) | Realtime Demo (Key Part)
Goal: prove live dynamic data updates.

Steps:
1. Open Dashboard in Browser Tab A.
2. Open Operations page in Browser Tab B.
3. In Tab B, create a new operation and validate it.
4. Show Tab A auto-updating KPIs/recent operations via live stream.

Say:
- "Dashboard subscribes to server events (SSE), so updates are pushed from backend to frontend in near realtime."

Code references:
- `backend/src/server.js` (`/api/stream` + broadcast events)
- `frontend/src/pages/DashboardPage.jsx` (EventSource subscription)

---

## 6:30 - 7:20 (Speaker D) | Scalability + DB Preference
Say:
- "Current runtime uses local PostgreSQL, and all inventory writes are transactional."
- "We added query limits and indexes to improve scalability."

Show:
- `backend/sql/postgres_schema.sql`
- `POSTGRESQL_MIGRATION.md`

---

## 7:20 - 8:00 (Speaker D) | Team Process Proof + Wrap
Say:
- "We followed team-owned workflow: branch-per-feature, PR template, review checklist, and shared presentation ownership."

Show files:
- `TEAM_GIT_WORKFLOW.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `TEAM_PRESENTATION_PLAN.md`
- `VALIDATION_CHECKLIST.md`

If using Git live, run:
```powershell
git shortlog -s -n --all
git log --oneline --graph --decorate --all
git branch -a
```

Final line:
- "This solution emphasizes clean architecture, correctness, usability, and extensibility over quick hacks."

---

## Backup Plan (If Live Realtime Glitches)
1. Refresh dashboard manually and show operation appears immediately from DB.
2. Show SSE endpoint exists in code (`/api/stream`).
3. Continue with validation and ledger consistency demo.

---

## Pre-Demo Checklist (Do 10 Minutes Before)
1. Start backend and frontend.
2. Ensure login works.
3. Open two browser tabs (Dashboard + Operations).
4. Keep terminal ready for API validation command.
5. Assign each teammate their speaking segment.
