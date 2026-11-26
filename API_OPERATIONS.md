# API operations

What runs the API, and what to do by hand.

## Scheduled jobs (Canner)

| Job | Schedule | Request | Notes |
| --- | --- | --- | --- |
| Billing (exists: `6f6496e0-…`, shows as `0 10 * * *`) | daily | `POST /api/cron/bill`, header `x-cron-key` | Runs daily but only charges usage from **before the start of the current month** (America/Toronto), so in practice it charges once, on the 1st, for the month just ended, and retries failures on the days after. First orders are not billed here: they are charged up front inside `POST /api/v1/letters`. |
| Webhook retries (created 2026-11-27: `f218a538`) | `*/5 * * * *` | `POST /api/cron/webhooks`, header `x-cron-key` (reads `CRON_SECRET`) | Moves aged test letters to printed/mailed (firing their webhooks), then retries failed deliveries that are due (backoff 1 min, 5 min, 30 min, 2 h, 6 h, 24 h; seven attempts, about a day and a half). It will 404 until this code is deployed. Created with `MSYS_NO_PATHCONV=1 canner jobs create "Webhook retries" --path /api/cron/webhooks --schedule "*/5 * * * *" --header-env x-cron-key=CRON_SECRET`. |
| Draft purge (exists) | `30 3 * * *` | `POST /api/cron/purge-drafts` | Also removes idempotency keys older than 7 days and webhook events older than 30 days. |

Canner's executor appears to read schedules in America/Toronto, not UTC (see the project notes).

## Environment

Nothing new is required. `FULFIL_SECRET` (optional) signs the "mark printed / mailed" links in the fulfilment email; it falls back to `CRON_SECRET`, then `JWT_SECRET`. `NEXT_PUBLIC_SITE_URL` (optional) sets the origin used in those links (default `https://sendletter.app`).

## Fulfilment

Each live API order emails you the print job as before, now with two signed links at the bottom: **mark printed** and **mark mailed**. Each opens a confirmation page (so mail scanners cannot trigger it); the button marks the letter, moves its status, and fires the `letter.printed` / `letter.mailed` webhooks. A cancelled order says so and cannot be marked. Links expire after 60 days.

If you skip the links, letters stay `queued` forever from the customer's point of view: no status, no webhooks. That is the one manual step the status feature depends on.

## Spending limits

Every account starts with `daily_spend_limit_cents = daily_spend_cap_cents = 50000` ($500). The customer sets the limit anywhere up to the cap on **Developers**. A request to raise the cap arrives as an email ("Limit increase request") and is stored in `sendletter_limit_requests`. To approve:

```sql
update sendletter_accounts set daily_spend_cap_cents = 200000 where id = '<account id>';
```

then reply to the email. The day is America/Toronto.

## Volume pricing and margin

The curve is `src/lib/volume-curve.ts` (list $0.99, floor $0.20 at the 100th mailing in a rolling 30 days). Costs are `src/lib/margin.ts` (Stripe 2.9% + $0.30 per charge, envelope and toner estimates marked CALIBRATE). Before changing either:

```
node --experimental-transform-types --import ./tests/register.mjs scripts/margin-report.mts
pnpm test
```

The tests fail if the cheapest letter nets under $0.25 at any volume. At the floor, with the $0.30 shared across a month's letters, a one-page letter nets about $0.34 (20% of $1.69). It nets about $0.04 if every letter were charged on its own, which only the first order is.

Every "as low as $1.69" in the docs, the pricing post, the guides and the homepage comes from `API_FROM_ALL_IN_CENTS`, so changing the floor updates them (a test checks the static guides).

## Invoices

`sendletter_invoices` (+ `_lines`): one row per charge, numbered `SL-<year>-<sequence>`. Failed charges release their usage, so the next run retries it. Customers see them under **Account → Invoices**, can print one, and can export CSV. Order history, with CSV export, is **Account → Orders**.

## API surface

`/openapi.json`, `/postman.json`, `/llms.txt`, `/docs`, `/docs/changelog`, and `mcp/sendletter-mcp.mjs` (stdio MCP server; a live key refuses to send without `confirm_live: true`). The OpenAPI and Postman files are generated from the same constants as the API.

## Not built

- Address verification (only a province-versus-postal-code check). Canada Post's AddressComplete is the licensed route.
- Delivery tracking: ordinary Lettermail has none; `mailed` is the last status.
- Certified or registered mail.
