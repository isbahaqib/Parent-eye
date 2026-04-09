# Parent Eye Backend

Node.js + Express API with **Prisma** + **SQLite** for persistent storage.

## Database

- Schema: `prisma/schema.prisma`
- Default DB file: `dev.db` (created after `db:push`)

### First-time setup

```bash
cd backend
npm install
copy .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

### Useful commands

- `npm run db:studio` — open Prisma Studio to browse tables
- `npm run db:push` — apply schema changes to the database

## Endpoints

Auth, parent/child pairing, telemetry, screen time, app blocking, activity reports, and alerts — see `src/server.js`.

## Notes

- Default parent account is created on first start if missing: `parent@example.com` / `Parent@123`
- Password reset tokens are still logged to the console in development
