# Simple Threads Monorepo

Monorepo scaffold for:
- `apps/frontend`: Next.js + TailwindCSS (ShadCN-ready)
- `apps/backend`: Express.js API

## Requirements
- Node.js 20+
- npm 10+

## Install
```bash
npm install
```

## Run in development (frontend + backend)
```bash
npm run dev
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:4000`  
Health check: `http://localhost:4000/health`

## Useful commands
```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run lint
npm run test
```

## Environment setup
Copy example env files:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

## Notes
- `apps/frontend/components.json` is included so ShadCN components can be added later.
- Backend currently has a single `/health` endpoint as a starter.
