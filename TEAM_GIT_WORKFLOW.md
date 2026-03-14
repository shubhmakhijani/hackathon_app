# Team Git Workflow (Mandatory)

## Goal
This workflow ensures the project demonstrates true team collaboration, not single-person repository handling.

## Rules
1. Every team member must contribute commits in their own branch.
2. No direct pushes to `main`.
3. Every feature/fix must go through Pull Request review.
4. At least one reviewer from another teammate is required.
5. Merge only after build checks pass.

## Branch Naming
- `feature/<name>-<scope>`
- `fix/<name>-<scope>`
- `docs/<name>-<scope>`

Examples:
- `feature/alex-dashboard-realtime`
- `fix/riya-operation-validation`

## Commit Message Standard
Use concise conventional messages:
- `feat: add realtime dashboard stream`
- `fix: validate operation source destination rules`
- `docs: add hackathon alignment notes`

## Pull Request Checklist
- [ ] Problem statement and approach described
- [ ] Data model / API impact documented
- [ ] Screenshots or API examples attached
- [ ] Build passes locally
- [ ] Validation and error handling covered
- [ ] Reviewer assigned

## Team Contribution Evidence (for Odoo demo)
During final presentation, show:
- commit history by all members
- merged PR list with reviewers
- branch list with owner names

PowerShell commands:
- `git shortlog -s -n --all`
- `git log --oneline --graph --decorate --all`
- `git branch -a`
