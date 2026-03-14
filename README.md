# CoreInventory - Hackathon Inventory Management System

CoreInventory is a full-stack inventory management application built for hackathon evaluation.

It helps teams manage products, warehouses, stock movement, and inventory traceability with a clean UI and a PostgreSQL-backed API.

## Screenshots

### Dashboard

![Inventory Dashboard](screenshots/dashboard.png)

### Operations

![All Operations](screenshots/operations.png)

### Warehouse Settings

![Warehouse Settings](screenshots/warehouse-settings.png)

Note: Place your uploaded images in the root `screenshots/` folder with these exact names:

- `dashboard.png`
- `operations.png`
- `warehouse-settings.png`

## What We Built

CoreInventory supports the core warehouse/inventory workflow:

- User authentication (signup, login, reset password with OTP flow)
- Master data management:
  - Warehouses
  - Locations
  - Categories
  - Products
- Stock operations:
  - Receipt
  - Delivery
  - Internal Transfer
  - Adjustment
- Real-time dashboard updates (SSE)
- Inventory audit trail through a stock ledger

## Key Features

- Relational PostgreSQL database with normalized tables
- Business-rule validation for all operation types
- Transaction-safe stock updates
- JWT-protected APIs
- Rate-limited auth endpoints
- Responsive React frontend

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express
- Database: PostgreSQL
- Validation: Zod
- Auth: JWT + bcrypt

## Architecture

- Frontend calls REST APIs on the backend
- Backend validates payloads and executes transactional DB changes
- Dashboard receives live refresh events via Server-Sent Events (`/api/stream`)
- PostgreSQL stores all operational and audit data

## Project Structure

```text
hackathon/
  backend/
    src/
      server.js
      db.js
      seed.js
      postgres-healthcheck.js
    sql/
      postgres_schema.sql
    .env.postgres.example
  frontend/
    src/
      pages/
      components/
```

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL 17+ (or compatible local PostgreSQL)

## Local Setup

1. Install dependencies

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

2. Configure backend environment

- Create `backend/.env` and set values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coreinventory
JWT_SECRET=dev-secret-change-me
CORS_ORIGIN=http://localhost:5173
```

3. Create database and apply schema (example)

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d postgres -c "CREATE DATABASE coreinventory;"
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d coreinventory -f backend\sql\postgres_schema.sql
```

4. Seed demo data

```powershell
npm --prefix backend run seed
```

5. Run app

```powershell
npm start
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Demo Credentials

- Email: `shubhmak1333@gmail.com`
- Password: `123456`

## Database Readiness Check

```powershell
npm --prefix backend run check:postgres
```

Expected result includes:

- `PostgreSQL readiness check passed`
- database name and table count

## How to Prove UI Changes Are Saved in Database

1. In the app, create a product or operation.
2. Open PostgreSQL terminal:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d coreinventory
```

3. Run verification queries:

```sql
SELECT id, name, sku, reorder_level FROM products ORDER BY id DESC LIMIT 10;
SELECT id, type, status, customer, notes FROM operations ORDER BY id DESC LIMIT 10;
SELECT id, product_id, location_id, qty FROM stock_balances ORDER BY id DESC LIMIT 10;
SELECT id, product_id, location_id, change_qty, reason, reference_type, reference_id
FROM stock_ledger
ORDER BY id DESC
LIMIT 10;
```

These tables show:

- New business records
- Updated stock balances
- Ledger/audit entries for traceability

## API Health Endpoint

```text
GET /api/health
```

Expected sample response:

```json
{ "ok": true, "database": "postgres" }
```

## Notes for Judges

- This is a fully local, self-hosted full-stack project
- No external BaaS dependency
- Uses relational schema + transactional stock logic + audit ledger
- Includes real-time dashboard updates on data changes
