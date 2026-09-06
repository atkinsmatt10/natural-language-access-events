# Security remediation report

Assessed 2026-09-06 against `main` commit `0064ead`. The original GitHub inventory contained 112 open Dependabot alerts: 54 high, 47 medium, 11 low. The updated lockfile no longer matches any of those 112 vulnerable ranges. A fresh full dependency audit reports zero known vulnerabilities. Application changes below address additional findings from source review; this is not a guarantee that the application has no undiscovered vulnerabilities.

## High severity

### 1. Vulnerable framework, AI SDK and dependency tree — fixed in this branch

Evidence: original `package.json` and `pnpm-lock.yaml` pinned Next.js 15.3.8, React 19.1.0, AI SDK 4, PostCSS 8.4.49 and numerous affected transitive packages. GitHub reported advisories for 23 package names.

Fix: Next.js / eslint-config-next 15.5.25, React / React DOM 19.1.9, AI SDK 6.0.277 with Google provider 3.0.121, PostCSS 8.5.28, and refreshed compatible dependency resolutions. Removed the unused OpenAI provider. A targeted pnpm override also patches Next.js's nested PostCSS. AI SDK 6 removes the vulnerable provider-utils 2.x/3.x dependency; the older major has no advertised patch for GHSA-866g-f22w-33x8. No advisory was ignored or dismissed.

The Next.js update also includes the fixes in the [August 2026 security release](https://nextjs.org/blog/august-2026-security-release), beyond the original alert snapshot. CI and Dependabot configuration are in `.github/workflows/security.yml` and `.github/dependabot.yml`; workflow actions are pinned to immutable commits.

### 2. Unrestricted SQL execution reachable through a server action — fixed in this branch

Evidence: original `app/actions.ts:215` accepted client-supplied SQL and checked its prefix and forbidden words. Queries such as `SELECT pg_sleep(30)` or reads from unrelated tables passed those checks. The implementation also executed the query twice and logged results.

Fix: `lib/query-security.ts:23` parses a single SELECT, allows only `public.access_events`, a restricted expression/function/type set, and reserializes the validated AST. It rejects stacked statements, unrelated tables, arbitrary functions, schema-qualified custom operators/casts, joins, unions, CTEs and locking queries. Built-in functions resolve through `pg_catalog`. `lib/query-security.ts:76` executes once on one checked-out connection inside a read-only transaction, with statement/lock timeouts and a 1,000-row cap. Errors are generic and the connection is rolled back/released on failure. `app/actions.ts:133` authenticates before calling it.

Deployment requirement: configure `POSTGRES_URL` with a dedicated role that has only SELECT on `public.access_events`; keep table ownership, write privileges and seeding credentials separate. Application restrictions complement database privileges. Queries outside the supported SQL subset now fail closed.

### 3. No application authentication for access records or paid AI actions — fixed in this branch; deployment configuration required

Evidence: all five original exported server actions were callable without authentication. External deployment protection was not verified.

Fix: `middleware.ts:4` challenges unauthenticated requests. `lib/auth.ts:5` independently checks configured credentials in the layout and every server action, so middleware is not the sole boundary. Missing or short credentials deny access. Credentials are compared via constant-length SHA-256 digests. Authenticated responses are not shared-cacheable.

Deployment requirement: set `ACCESS_AUTH_USERNAME` and a random ASCII `ACCESS_AUTH_PASSWORD` of at least 32 characters in each environment before deploying; otherwise the app returns 503. Use HTTPS. This shared login grants access to all records and is for a single trusted analyst group. Multi-tenant or per-user record authorization would require an identity provider and a data-access policy.

### 4. Secret explicitly included in Next.js public environment configuration — configuration fixed; rotation remains external

Evidence: original `next.config.js:4` set `env.GOOGLE_GENERATIVE_AI_API_KEY`. Next.js's `env` option makes values eligible for substitution into client bundles; it is unsuitable for a secret. Actual historical exposure was not established.

Fix: `next.config.js:4` now contains only the existing timezone value. The Google credential is read server-side, server actions import `server-only`, and the unused client-side AI import was removed. A production build with a fake canary API key contained neither that value nor its environment-variable name in `.next/static`.

Deployment requirement: rotate any Google key used with an older deployment that may have bundled it, then retire affected older deployments. No real credentials were read, printed, changed or rotated during this task.

### 5. Model-generated chart keys interpolated into raw style HTML — fixed in this branch

Evidence: original `components/ui/chart.tsx:81` used `dangerouslySetInnerHTML` to interpolate configuration keys/colors into a style block. Chart keys originate in model output; TypeScript did not validate them. An injected closing style tag or CSS syntax could cross this boundary.

Fix: `components/ui/chart.tsx:71` renders CSS as a text child. `lib/chart-styles.ts:4` validates identifiers and colors before interpolation, retaining the application's palette. Malicious keys, styles, URLs and HTML are covered by regression tests.

## Medium severity

### 6. Unbounded action inputs and sensitive diagnostics — fixed in this branch

Evidence: original AI actions accepted unchecked strings/result objects; the query action logged full SQL and database rows, and several handlers logged entire provider errors.

Fix: `lib/action-validation.ts` bounds question/query lengths, row counts, column counts and result payload sizes. AI calls have output-token limits, a 30-second timeout and at most one retry. Raw query/row/provider-error logging was removed from request handlers. Database and AI errors returned to callers do not include internal diagnostics. Security response headers are set in `next.config.js:7`.

## Validation and limits

- Full pnpm audit: zero known advisories, including development dependencies.
- Compared every one of the 112 original GitHub alert ranges against the regenerated lockfile: zero remaining matches.
- All 38 security/PostgreSQL regression tests pass. The suite covers injection, SQL allow/deny cases, authentication, input limits, rollback and connection disposal.
- Embedded PostgreSQL integration runs all five application prompt examples, verifies the 1,000-row cap, read-only enforcement and unchanged underlying data.
- Lint, TypeScript and production build pass.
- Production HTTP tests cover missing configuration (503), missing/wrong credentials (401), middleware-bypass headers (401), unauthenticated server-action POST (401), authorized page rendering (200), no-store responses and security headers.
- A limited scan of current tracked files for common credential formats found no matches. GitHub code scanning has no analysis; secret scanning is disabled. This is not a complete historical secret audit.
- Live Google AI calls, production database privileges, deployment settings, key rotation and deployed behavior require environment access and were not verified. Existing Gemini model selection is preserved.
- Existing react-day-picker peer-range warnings and deprecated packages remain; these are not current audit vulnerabilities. The build and type checks pass.
- The repository includes `access_events.csv`. Whether this dataset is synthetic or approved for public distribution was not established; application authentication does not make a public Git repository private.

GitHub alerts on the default branch will remain open until the changes are merged and GitHub reprocesses its dependency graph. Production protection requires deployment and the environment steps above.
