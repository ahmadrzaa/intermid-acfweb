# INTERMID ACF

A full-stack app that digitizes INTERMID’s Action Cycle Framework.

- Workspace: left Process Flow, middle Action Table, right 2×2 Matrix (drag & drop).
- Dashboard: live KPIs + charts from your items.
- Roles: admin, manager, team (team has limited edits).
- Exports: CSV / PDF (current stage).
- Auth: simple session token via headers (dev only).
- DB: SQLite (file), auto-init with schema + a couple of sample items.
  
 ![Screenshot](screenshot.png)


Quick Start (Local)

Backend:
cd backend
npm i
npm run dev        # API → http://localhost:3001

Frontend:
cd frontend
npm i
npm run dev        # Frontend → http://localhost:5173

Tech Stack

Frontend: React + Vite (plain CSS)
Backend: Node (Express), SQLite
Auth: In-memory sessions (dev-only)
Ports: 5173 (frontend), 3001 (API with proxy)
Schema fields: id, number, title, factor, action, scope, time, resources, exec_status, notes, current_step, created_at, updated_at

Features Overview

Workspace:
Left: Process Flow — Item → Factor → Action → Scope / Time / Resources → Status
Middle: Action Table — inline edit of title, factor, action, scope, time, resources, status, notes
Right: 2×2 Matrix — drag cards between quadrants (Scope × Resources)

Dashboard:
Live stats: Total, Completed, In Progress, Delayed
Charts: bar charts by item + quadrant donut

Auth & Roles:
Roles: admin, manager, team
Team can only update status and notes

Export:
Export current stage to CSV or PDF

MIT License

MIT License

Copyright (c) 2025 Ahmad Raza

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND.
