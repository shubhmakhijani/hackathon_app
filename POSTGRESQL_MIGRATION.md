# PostgreSQL Migration and Run Guide

This project now runs on local PostgreSQL for the active backend runtime.

## What is Provided
- PostgreSQL-compatible schema: `backend/sql/postgres_schema.sql`
- Existing backend API contracts remain the same.
- Relational model, seed flow, and indexes run directly on PostgreSQL.

## Quick Setup (Local PostgreSQL)
1. Install PostgreSQL locally.
2. Create database:
   - `createdb coreinventory`
3. Apply schema:
   - `psql -d coreinventory -f backend/sql/postgres_schema.sql`
4. Set backend env values:
   - Copy `backend/.env.postgres.example` to `backend/.env`
   - Update credentials in `DATABASE_URL`
5. Validate readiness:
   - `npm run check:postgres --prefix backend`
6. Seed demo data:
   - `npm run seed --prefix backend`
7. Start backend:
   - `npm run start --prefix backend`

## Runtime Notes
- Backend DB access now uses async PostgreSQL queries and transaction helpers from `backend/src/db.js`.
- Seeded demo credentials are normalized on each seed run:
  - Email: `shubhmak1333@gmail.com`
  - Password: `123456`
- Health endpoint confirms runtime database:
  - `GET /api/health` -> `{ "ok": true, "database": "postgres" }`

## Why this satisfies hackathon expectations
- Uses local relational database model.
- No BaaS dependency.
- Explicit schema ownership and transparent data design.
- Active runtime already moved to PostgreSQL with minimal API-level behavioral change.
