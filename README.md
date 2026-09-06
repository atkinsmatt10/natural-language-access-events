# SmartRent Access Control Analytics

This project is a Next.js application that allows users to analyze SmartRent access control events using natural language queries and visualize the results. It's powered by the AI SDK by Vercel and uses Google's Gemini model to translate natural language queries into SQL.

## Features

- Natural Language to SQL: Query access control events using plain English
- Data Visualization: View access patterns in both table and chart formats
- Query Explanation: Get AI-generated explanations of complex access control queries
- Real-time Analytics: Analyze entry logs, access patterns, and security events

## Technology Stack

- Next.js for the frontend and API routes
- AI SDK by Vercel for AI integration
- Google's Gemini for natural language processing
- PostgreSQL for event storage
- Vercel Postgres for database hosting
- Framer Motion for animations
- ShadcnUI for UI components
- Tailwind CSS for styling
- Recharts for data visualization

## How It Works

1. Users enter natural language questions about access control events
2. The application converts these questions into SQL queries using AI
3. Results are retrieved from the access control events database
4. Data is presented in both table and chart formats
5. Users can analyze patterns and trends in access control usage

## Data

The database contains access control event information, including:

- Event timestamp
- Access point location
- Event type (entry, exit, denied access)
- User information
- Access method (key card, mobile app, etc.)
- Property/building information
- Success/failure status

## Getting Started

1. Install Node.js 22 and the package manager specified in `package.json`.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local` and configure:
   - `GOOGLE_GENERATIVE_AI_API_KEY`: a server-side Google AI credential.
   - `POSTGRES_URL`: a dedicated database role with only `SELECT` on `public.access_events`.
   - `ACCESS_AUTH_USERNAME` and `ACCESS_AUTH_PASSWORD`: shared analyst login. Use at least 32 random ASCII characters for the password (`openssl rand -hex 32`).
4. Run `pnpm dev` and sign in using the browser's authentication prompt.
5. Before deploying, run `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm typecheck`, and `pnpm audit`.

## Security and deployment

All pages and server actions require the configured analyst credentials. Missing or short credentials fail closed, including in development. Use HTTPS in deployed environments; the shared login grants access to all records, so it is appropriate only for a single trusted analyst group. Configure these environment variables separately for Preview and Production before deploying this change. For multiple organizations or roles, replace the shared login with an identity provider and enforce record-level authorization.

The runtime database account must not own the table or have write, schema-creation, or administrative privileges. Use a separate administrative connection when running the seed script. Runtime queries allow one `SELECT` against `public.access_events` with a limited set of built-in analytics functions; joins, CTEs, unions, arbitrary functions and row locks are rejected. Queries execute once in a read-only transaction with a five-second statement timeout, a one-second lock timeout and a maximum of 1,000 returned rows. Requests outside this supported SQL subset must be rephrased.

The old Next.js configuration explicitly exposed `GOOGLE_GENERATIVE_AI_API_KEY` through `next.config.js.env`. Rotate any key used with an older deployment and remove old deployments containing that build after verifying the replacement. The key now stays server-side. Never add credentials to `NEXT_PUBLIC_*` variables or the `env` section of `next.config.js`.

AI requests have bounded inputs, output-token limits and a 30-second timeout. Access-event samples are still sent to the configured Google AI service as part of the existing summary/chart functionality. Verify that this is appropriate for your dataset. The model identifier remains the existing deployment's model; live AI/database validation requires working credentials.

CI installs the frozen lockfile, rejects all known dependency advisories, runs the security regression suite, and validates lint, types and the production build. Dependabot checks dependency and GitHub Actions updates weekly. See [the security report](security_best_practices_report.md) for findings and validation limits.
