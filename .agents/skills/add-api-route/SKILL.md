---
name: add-api-route
description: How to write or modify a Next.js route handler under src/app/api in Spending Diary - request parsing, Zod validation, auth, calling a domain function or query, response envelope, status codes and idempotency. Use this skill whenever a task adds, edits or reviews an API endpoint, route.ts file, webhook, or the server side of a mutation, even if the user only says "add an endpoint" or "expose this to the client".
---

# Add an API route

Route handlers are thin. The sequence is always: authenticate, parse with Zod, call one domain function or one query, return. AGENTS.md wins on any conflict.

## Rules

- **No database access in route files.** No `db`, `drizzle-orm` or `pg` imports, no business logic, no money math, no authorization decisions beyond calling the guard. Reads go through `src/lib/db/queries/` and writes through `src/lib/domain/`.
- **Do not add logic to `api/auth/[...all]`.** That is the Better Auth handler.
- **Do not use Server Actions** for data or money writes. Use route handlers.
- **Validate with the shared Zod schema** from `src/lib/validation/<entity>.ts`, the same one the client form uses. Never redefine a shape in the route.
- **Authenticate first.** No session returns 401 before anything else runs. Use `requireSession(req)` from `src/lib/auth/guards.ts`.
- **Pass `viewerId` first** into every query and guard call.

## Response contract

- Success: `{ data: ... }`
- Error: `{ error: { code, message, fields? } }`

| Status | Use for |
|---|---|
| 400 | Zod validation failure (put per-field messages in `fields`) |
| 401 | Not authenticated |
| 403 | Authenticated but not allowed |
| 404 | Not found or not visible to the viewer. Never reveal which. |
| 409 | Version conflict, or an idempotency key reused with a different body |
| 422 | Domain invariant violated (for example the expense does not balance) |

Money is always an integer in minor units. Convert `bigint` values with `toSafeNumber()`. Expense dates are `YYYY-MM-DD` strings.

## Create endpoints

- Require the `Idempotency-Key` header. A missing key returns 400.
- Pass it to the domain function. Do not implement idempotency in the route.

## Edit endpoints

- The payload includes the `version` the client last saw. The domain function returns the conflict, and the route maps it to 409.

## Shape to follow

```ts
export async function POST(req: Request) {
  const session = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const input = createExpenseSchema.parse(await req.json());
  const result = await createExpense(session.userId, input, key);
  return Response.json({ data: result }, { status: 201 });
}
```

Use the project's existing error-mapping helper so thrown domain, guard and Zod errors become the envelope above. If one does not exist, add it once in `src/lib/api/` or `src/lib/utils/` instead of try/catch in every route. Never log request bodies on auth routes.

## Done checklist

- [ ] No `db`, `drizzle-orm` or `pg` import in the route file
- [ ] Shared Zod schema used
- [ ] 401 handled first, 404 used for not-visible rows
- [ ] Idempotency key required on creates, version required on edits
- [ ] Envelope and status codes match the table
- [ ] A matching function exists in `lib/api/<entity>.ts` and a hook in `hooks/use-<entity>.ts`
- [ ] Typecheck, lint and tests pass