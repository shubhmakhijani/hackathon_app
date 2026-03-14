# Team Presentation Plan (Shared Ownership)

## Objective
Ensure all members participate and can explain architecture, implementation, and tradeoffs.

## Suggested Speaking Split
1. Member A: Problem framing, architecture, database model
2. Member B: Backend API design, validation, security, scalability
3. Member C: Frontend UX flow, consistency, realtime behavior
4. Member D: Testing strategy, known limitations, roadmap

## Demo Flow (8-10 minutes)
1. Business problem and requirements (1 min)
2. Data model and relational design (2 min)
3. Core workflows: products, operations, ledger (2 min)
4. Validation and error feedback examples (1 min)
5. Realtime update demo on dashboard (1 min)
6. Security and scalability practices (1 min)
7. Team Git collaboration proof (1 min)

## Live Demo Scenarios
- Invalid email on auth endpoint returns field-level validation
- Create product with initial stock and verify ledger impact
- Create operation, validate operation, watch dashboard auto-refresh (realtime)
- Show low-stock/out-of-stock KPI updates

## Judge-Facing Key Points
- Built from scratch with local relational DB
- Strong modular backend API and clear validation
- No BaaS dependency
- Realtime dynamic update support
- Team-owned development workflow
