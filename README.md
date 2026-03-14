# CoreInventory

CoreInventory is our hackathon inventory management app.

We built it as a full-stack project with React on the frontend, Express on the backend, and PostgreSQL as the database. The goal was to make day-to-day inventory operations simple while keeping stock changes traceable.

## Screenshots

### Dashboard
![Inventory Dashboard - Latest](screenshots/dashboard-latest.png)

### Operations
![All Operations - Latest](screenshots/operations-latest.png)

### Warehouse Settings
![Warehouse Settings - Latest](screenshots/warehouse-settings-latest.png)

You can replace these files anytime with new screenshots while keeping the same filenames.

## PostgreSQL Proof (psql)

To make it explicit that the app is using PostgreSQL, we run these commands on the local database.

### Command 1

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d coreinventory -P pager=off -c "SELECT current_database() AS db, COUNT(*)::int AS product_count FROM products;"
```

### Output

```text
	db       | product_count
---------------+---------------
 coreinventory |            10
(1 row)
```

### Command 2

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d coreinventory -P pager=off -c "SELECT id, type, status, customer FROM operations ORDER BY id DESC LIMIT 5;"
```

### Output

```text
 id |    type    | status |    customer
----+------------+--------+----------------
 10 | Delivery   | Done   | aayush shah
  9 | Delivery   | Ready  | Metro Build Co
  8 | Adjustment | Done   |
  7 | Adjustment | Done   |
  6 | Internal   | Draft  |
(5 rows)
```

## What the App Covers

- Authentication (signup, login, reset password with OTP)
- Warehouse, location, category, and product management
- Inventory operations: Receipt, Delivery, Internal Transfer, and Adjustment
- Live dashboard refresh using SSE (`/api/stream`)
- Stock ledger for audit history

## Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express
- Database: PostgreSQL
- Validation: Zod
- Auth: JWT + bcrypt

## How It Works

The frontend talks to REST APIs. The backend validates requests, runs transactional updates, and writes stock changes to both current balances and ledger history. Dashboard data is fetched from PostgreSQL and refreshed on live events.

## Quick Start

### 1) Install dependencies

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2) Create backend environment file

Create `backend/.env` with:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coreinventory
JWT_SECRET=dev-secret-change-me
CORS_ORIGIN=http://localhost:5173
```

### 3) Create DB and apply schema

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d postgres -c "CREATE DATABASE coreinventory;"
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d coreinventory -f backend\sql\postgres_schema.sql
```

### 4) Seed demo data

```powershell
npm --prefix backend run seed
```

### 5) Run the app

```powershell
npm start
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Demo Login

- Select the role on the login page before signing in.
- Inventory Manager:
  - Email: `shubhmak1333@gmail.com`
  - Password: `123456`
- Warehouse Staff:
  - Email: `staff@coreinventory.local`
  - Password: `123456`

## Health Check

```text
GET /api/health
```

Expected response:

```json
{ "ok": true, "database": "postgres" }
```

## Showing That UI Changes Persist in DB

1. Create or validate an operation in the UI.
2. Open PostgreSQL terminal:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -h localhost -w -d coreinventory
```

3. Run:

```sql
SELECT id, name, sku, reorder_level FROM products ORDER BY id DESC LIMIT 10;
SELECT id, type, status, customer, notes FROM operations ORDER BY id DESC LIMIT 10;
SELECT id, product_id, location_id, qty FROM stock_balances ORDER BY id DESC LIMIT 10;
SELECT id, product_id, location_id, change_qty, reason, reference_type, reference_id
FROM stock_ledger
ORDER BY id DESC
LIMIT 10;
```

You will see the same records created from the UI reflected in PostgreSQL.
