# Parent Eye – Next.js Auth Screens

Next.js frontend with login, sign up, forgot password, and reset password. Uses MUI and custom auth that talks to your **separate Node.js backend**.

## Features

- **Custom auth** – No NextAuth; calls your Node backend API
- **MUI** – Material UI for layout and components
- **Centered card layout** – All auth screens share a consistent layout
- **Auth flow** – Login, signup, forgot password, reset password

## Backend API

Set `NEXT_PUBLIC_API_URL` to your Node backend URL. The frontend expects these endpoints:

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user: { id, email, name } }` |
| POST | `/api/auth/register` | `{ email, password, name }` | `{ message }` |
| POST | `/api/auth/forgot-password` | `{ email }` | `{ message }` |
| POST | `/api/auth/reset-password` | `{ token, password }` | `{ message }` |
| GET  | `/api/auth/me` | - (Bearer token) | `{ id, email, name }` |

Auth token is stored in `localStorage` and sent as `Authorization: Bearer <token>`.

## Database (backend)

The API server in `backend/` uses **Prisma** with **SQLite** (`dev.db`). All users, children, usage logs, blocked apps, and alerts are stored there.

From the `backend` folder:

```bash
npm install
copy .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Browse data with `npm run db:studio` inside `backend/`.

The Next.js app does not connect to the database directly; it only calls the backend over HTTP (`NEXT_PUBLIC_API_URL`).

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home (redirects to dashboard if logged in) |
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Request reset link |
| `/reset-password?token=...` | Set new password |
| `/dashboard` | Protected (requires auth) |
