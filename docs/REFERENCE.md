# Daily — Project Reference

Technical reference for the **Daily** app: a minimal daily check-in tracker with server-side persistence and no login.

---

## Dependencies

### Runtime

| Package | Version | Role |
|---------|---------|------|
| [Next.js](https://nextjs.org/) | `^16.2.6` | App framework, routing, and API routes |
| [React](https://react.dev/) | `^19.1.0` | UI rendering |
| [React DOM](https://react.dev/) | `^19.1.0` | Browser DOM bindings |
| [@prisma/client](https://www.prisma.io/) | `^6.10.0` | PostgreSQL access and typed queries |
| [Zod](https://zod.dev/) | `^4.0.0` | Request body validation for API actions |
| [clsx](https://github.com/lukeed/clsx) | `^2.1.1` | Conditional CSS class names |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | `^3.3.1` | Merge Tailwind classes without conflicts |

### Development

| Package | Version | Role |
|---------|---------|------|
| [TypeScript](https://www.typescriptlang.org/) | `^5.8.0` | Static typing |
| [Prisma CLI](https://www.prisma.io/) | `^6.10.0` | Schema management and client generation |
| [Tailwind CSS](https://tailwindcss.com/) | `^4.1.0` | Utility-first styling |
| [@tailwindcss/postcss](https://tailwindcss.com/) | `^4.1.0` | PostCSS integration for Tailwind v4 |
| [PostCSS](https://postcss.org/) | `^8.5.3` | CSS processing |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | `^10.4.21` | Vendor prefixes for CSS |
| [Vitest](https://vitest.dev/) | `^3.1.0` | Unit tests |
| [ESLint](https://eslint.org/) | `^9.0.0` | Linting |
| [eslint-config-next](https://nextjs.org/) | `^16.2.6` | Next.js ESLint rules |
| [@types/node](https://www.npmjs.com/package/@types/node) | `^22.0.0` | Node.js type definitions |
| [@types/react](https://www.npmjs.com/package/@types/react) | `^19.1.0` | React type definitions |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | `^19.1.0` | React DOM type definitions |

### External services

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Stores progress and rate-limit state |
| **Neon** (recommended) | Serverless PostgreSQL hosting for production |
| **Vercel** (recommended) | Next.js hosting for production |

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DAYCHECK_DB_URL` | Yes | PostgreSQL connection string used by Prisma |
| `ANONYMOUS_ID_SECRET` | Yes (production) | HMAC secret used to sign the anonymous identity cookie |

Example (local):

```env
DAYCHECK_DB_URL="postgresql://postgres:postgres@localhost:5432/daychecker?schema=public"
ANONYMOUS_ID_SECRET="replace-this-with-a-long-random-secret"
```

### NPM scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server locally |
| `lint` | `eslint .` | Lint the codebase |
| `test` | `vitest` | Run tests in watch mode |
| `test:run` | `vitest run` | Run tests once |
| `prisma:generate` | `prisma generate` | Generate Prisma client |
| `prisma:push` | `prisma db push` | Sync Prisma schema to the database |

### Database models

**Progress**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key |
| `anonymousId` | `String` | Unique anonymous user identifier |
| `targetCount` | `Int` | Target number of days (default: `30`) |
| `currentCount` | `Int` | Completed days (default: `0`) |
| `lastCheckedDateKey` | `String?` | Last check-in date (`YYYY-MM-DD`) |
| `completedAt` | `DateTime?` | Set when target is reached |

**RequestThrottle**

| Field | Type | Description |
|-------|------|-------------|
| `key` | `String` | Unique rate-limit key |
| `hitCount` | `Int` | Requests in the current window |
| `windowEndsAt` | `DateTime` | Window expiration timestamp |

---

## API

Base path: `/api/progress`

All responses are JSON. The API uses an **anonymous HTTP-only cookie** instead of login.

### Identity

- Cookie name: `daychecker_anonymous_id`
- Format: `{anonymousId}.{hmacSignature}`
- Created on first request when no valid cookie exists
- Signed with `ANONYMOUS_ID_SECRET` (HMAC SHA-256)
- Attributes: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, `Max-Age=365 days`

Clients should send cookies automatically on same-origin requests (`fetch` with default credentials).

### Shared response shape

```ts
type ProgressPayload = {
  targetCount: number;
  currentCount: number;
  lastCheckedDateKey: string | null;
  completedAt: string | null;   // ISO 8601 or null
  todayKey: string;             // YYYY-MM-DD (UTC)
  canCheckToday: boolean;
};

type ProgressResponseBody = {
  progress?: ProgressPayload;
  message?: string;
  error?: string;
};
```

### Rate limiting

Rate limits are stored in PostgreSQL (`RequestThrottle`).

| Action | Limit | Window |
|--------|-------|--------|
| `load-progress` (GET) | 20 requests | 60 seconds |
| `check` (POST) | 10 requests | 60 seconds |
| `update-target` (POST) | 20 requests | 60 seconds |

When limited, the API returns `429` with header `Retry-After` (seconds).

---

### `GET /api/progress`

Load the current user's progress. Creates a progress record if one does not exist.

**Request**

- Method: `GET`
- Body: none

**Success — `200 OK`**

```json
{
  "progress": {
    "targetCount": 30,
    "currentCount": 1,
    "lastCheckedDateKey": "2026-08-08",
    "completedAt": null,
    "todayKey": "2026-08-08",
    "canCheckToday": false
  },
  "message": "Your progress has been loaded."
}
```

**Errors**

| Status | Body | When |
|--------|------|------|
| `429` | `{ "error": "Too many requests. Please try again in a moment." }` | Rate limit exceeded |
| `503` | `{ "error": "Server is not ready (database unavailable). Start PostgreSQL and run prisma db push." }` | Database unavailable |

---

### `POST /api/progress`

Perform an action on the current user's progress.

**Request**

- Method: `POST`
- Headers: `Content-Type: application/json`
- Body: one of the actions below

#### Action: `check`

Record today's check-in. Allowed once per calendar day (UTC).

```json
{
  "action": "check"
}
```

**Success — `200 OK`**

```json
{
  "progress": {
    "targetCount": 30,
    "currentCount": 2,
    "lastCheckedDateKey": "2026-08-08",
    "completedAt": null,
    "todayKey": "2026-08-08",
    "canCheckToday": false
  },
  "message": "Daily check recorded."
}
```

When the target is reached:

```json
{
  "message": "Target completed. Progress saved successfully."
}
```

**Errors**

| Status | Body | When |
|--------|------|------|
| `400` | `{ "error": "Invalid request." }` | Invalid JSON or schema |
| `409` | `{ "error": "You already checked in today.", "progress": { ... } }` | Duplicate check same day |
| `409` | `{ "error": "That target has already been completed.", "progress": { ... } }` | Target already completed |
| `429` | `{ "error": "Too many requests. Please try again in a moment." }` | Rate limit exceeded |
| `503` | `{ "error": "Server is not ready (database unavailable). ..." }` | Database unavailable |

#### Action: `update-target`

Change the target number of days.

```json
{
  "action": "update-target",
  "targetCount": 180
}
```

Constraints: integer from `1` to `365`.

**Success — `200 OK`**

```json
{
  "progress": {
    "targetCount": 180,
    "currentCount": 1,
    "lastCheckedDateKey": "2026-08-08",
    "completedAt": null,
    "todayKey": "2026-08-08",
    "canCheckToday": false
  },
  "message": "Target updated successfully."
}
```

**Errors**

Same as `check`, except no `409` for duplicate daily checks.

---

### Business rules

1. One check-in per day per user (`todayKey` is UTC `YYYY-MM-DD`).
2. Default target is `30` days for new users.
3. `currentCount` cannot exceed `targetCount`.
4. When `currentCount >= targetCount`, `completedAt` is set and further checks are blocked.
5. Updating the target can clear `completedAt` if the new target is above the current count.
6. Progress is keyed by `anonymousId` from the signed cookie — no account required.

### Example client usage

```ts
// Load progress
const load = await fetch("/api/progress", { cache: "no-store" });
const { progress } = await load.json();

// Check today
await fetch("/api/progress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "check" }),
});

// Update target
await fetch("/api/progress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "update-target", targetCount: 180 }),
});
```

---

## Project structure (API-related)

```
src/
├── app/api/progress/route.ts      # Route handlers (GET, POST)
├── server/progress/
│   ├── progress.service.ts        # Request handling and business flow
│   ├── progress.repository.ts     # Database operations
│   ├── progress.formatter.ts      # Response payload builder
│   ├── progress.validators.ts     # Zod schemas
│   └── progress.types.ts          # Shared types
└── server/security/
    ├── anonymous-identity.ts      # Cookie signing and verification
    └── rate-limit.ts              # Rate limit enforcement
```
