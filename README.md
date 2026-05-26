# Day Checker

Daily check-in app with durable database-backed storage and no login.

## Stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS 4

## Run locally

1. Copy `.env.example` to `.env.local` and set `DAYCHECK_DB_URL`.
2. Install dependencies with `npm install`.
3. Run `npm run prisma:generate`.
4. Run `npm run dev`.

## Database model

The app stores an `anonymousId` in an HTTP-only cookie and uses it to save progress in the database.

## Local PostgreSQL setup with pgAdmin4

1. Start your local PostgreSQL server.
2. Open pgAdmin4 and create a database named `daychecker`.
3. Create or reuse a PostgreSQL user with access to that database.
4. Update `.env.local` with your connection string, for example:

```env
DAYCHECK_DB_URL="postgresql://postgres:your_password@localhost:5432/daychecker?schema=public"
```

5. Run `npm run prisma:generate`.
6. Run `npm run prisma:push` to create the `Progress` table locally.

Also set `ANONYMOUS_ID_SECRET` in `.env.local` or in your system environment. This secret is used to sign the anonymous cookie so it cannot be tampered with.

The Prisma datasource reads `DAYCHECK_DB_URL` directly. In practice, keep the raw password out of the repository by using your local environment or `.env.local`.

If you prefer, you can use Prisma migrations later instead of `db push`.
