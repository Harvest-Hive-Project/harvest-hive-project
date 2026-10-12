# HIVE partner signup and analytics

The public form writes to shared Cloudflare D1 storage. Analytics, CSV export, partner profiles and follow-up updates require a verified GitHub identity. There is no Google Forms submission path, seed data, browser-local contact storage, password collection or client-side administrator bypass.

- Public form: `/join`, including `?ref=bryce`, `?ref=will`, `?ref=matthew`, or `?ref=qr%20code`.
- Private workspace: `/admin`. Three stable GitHub account IDs are authorized in `lib/service.mjs`.
- Shared views: overview, partner directory, optional-response insights. Refresh every 15 seconds when visible and not editing.
- Follow-up status, owner, date and notes are saved server-side with an audit record.

## Deployment

The marketing site remains in the Harvest-Hive-Project GitHub repository. This application needs a server and database; GitHub Pages alone cannot provide either.

The existing Sites project ID is in `.openai/hosting.json`. Preserve it. Use the Sites workflow helper to build, synchronize source, package and deploy the same source state. D1 migrations live in `drizzle/`; deployments apply them before the worker. Never include `.wrangler/`, `.sites-runtime/`, environment values, credentials, databases or `node_modules` in a source copy.

Production environment settings, stored through Sites:

| Key | Purpose |
| --- | --- |
| `PUBLIC_ORIGIN` | Exact HTTPS site origin used for browser write origin checks. |
| `RATE_LIMIT_SECRET` | Secret salt for hashed per-address rate limits; never in source or assets. |
| `GITHUB_CLIENT_ID` | Public client ID from the organization-owned OAuth app. |

## GitHub sign-in registration

Register the organization-owned **Harvest Hive Analytics** OAuth app with the application URL set to the deployed HTTPS site origin. Enable GitHub's device authorization flow. The dashboard shows a short-lived verification code; the team member enters it on GitHub and authorizes the app. HIVE requests public identity only, with no additional OAuth scopes. The server verifies `/user`, checks the immutable account ID and creates an eight-hour secure HttpOnly session. It never saves the GitHub access token. This flow needs the public client ID, and does not need a client secret.

GitHub handles passwords, passkeys and two-factor authentication. The dashboard must remain locked until the app is registered and `GITHUB_CLIENT_ID` is deployed. Do not create a placeholder login or grant access based on a caller-supplied name/email. An actual GitHub sign-in needs to be verified after registration; unit tests cover the provider exchange with a mock.

## Development and checks

Node 22.13+ is required. Install the pinned dependencies with the Sites installation helper, or `pnpm install --frozen-lockfile` using the package manager version declared in `package.json`.

```
node --test tests/service.test.mjs
node scripts/run-framework.mjs build
```

Tests cover persistence, duplicate protection, profile capabilities, origin checks, rate limiting, authentication/authorization, sign-out, shared follow-up edits and GitHub polling behavior. Local D1 is independent of production. Local fictional QA submissions are never seeded into production or migrations.

Append migrations after schema changes; do not alter applied migration files. Generate new migrations with `node node_modules/drizzle-kit/bin.cjs generate`.
