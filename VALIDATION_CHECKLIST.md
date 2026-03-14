# Validation and Quality Checklist

## API Validation
- [ ] Signup rejects weak password and invalid email
- [ ] Login handles invalid credentials correctly
- [ ] Product creation rejects invalid SKU / missing required fields
- [ ] Operation creation enforces business rules by type
- [ ] Operation validation blocks insufficient stock

## Security
- [ ] JWT required on protected routes
- [ ] Security headers present
- [ ] Auth rate limiting active
- [ ] No sensitive data leaked in responses

## Data Consistency
- [ ] Stock balances update correctly for each operation type
- [ ] Ledger entries are written for stock changes
- [ ] Dashboard KPIs match ledger/stock states
- [ ] PostgreSQL runtime returns seeded data for login and dashboard

## Performance and Scalability
- [ ] DB indexes exist and are applied
- [ ] Operations and ledger endpoints use limits
- [ ] Build succeeds with no frontend/backend errors

## UX and Usability
- [ ] Error feedback is clear and actionable
- [ ] Forms are consistent and intuitive
- [ ] Mobile layout remains usable
- [ ] Navigation stays consistent across pages
