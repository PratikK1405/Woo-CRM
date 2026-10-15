# Product Requirements Document: WooCommerce CRM

| Field | Value |
|---|---|
| Project | woo-crm |
| Challenge | CRM System Integration (WooCommerce) |
| Stack | React (frontend), Express.js (backend), Supabase (database, auth, realtime) |
| Status | Draft v1 |

---

## 1. Overview

### 1.1 Problem
Small and mid-size online stores run on WooCommerce, but customer and order information lives only inside the WordPress admin. Support and sales staff cannot see a unified customer history, cannot follow an order from payment to delivery in one place, and send follow-up emails manually or not at all. Existing CRM connectors (HubSpot, Zoho, Salesforce, SuiteCRM bridges) solve this but tie the store to a paid third-party CRM.

### 1.2 Solution
A purpose-built CRM that integrates with WooCommerce in both directions. It ingests customers and orders in real time through WooCommerce webhooks, backfills through the REST API so nothing is lost, lets staff work customers and orders in a dedicated dashboard, writes order status and tracking changes back to WooCommerce, and automates customer communication through a rule-based workflow engine.

### 1.3 Goals
1. Give staff a single, always-current view of every customer and order.
2. Keep CRM and WooCommerce consistent with no manual data entry, even when events are duplicated, delayed, or missed.
3. Let staff update order status and tracking from the CRM and have WooCommerce reflect it.
4. Automate routine customer communication (confirmations, shipping notices, review requests, win-back).
5. Deliver a working, demonstrable system with clear analysis and design documentation.

### 1.4 Non-goals (v1)
- Replacing WooCommerce checkout, catalogue management, or payments.
- Full marketing automation suite (A/B tests, drag-and-drop campaign designer, SMS).
- Multi-store support (designed for, not built).
- Native mobile apps.

---

## 2. Users and roles

| Role | Description | Key needs |
|---|---|---|
| Admin | Store owner or manager | Configure integration, manage team, build workflows, view all analytics |
| Agent | Support or sales staff | Look up customers, handle orders, add notes, update status and tracking |
| Customer (indirect) | Store shopper | Receives accurate, timely emails; can opt out of marketing |

Permissions:
- Admin: everything, including Woo credentials, SMTP settings, team management, workflow create/edit/delete.
- Agent: read customers and orders, edit notes and tags, change order status and tracking, view workflow runs (read only).

---

## 3. Scope: functional requirements

Priorities: **P0** must have, **P1** should have, **P2** nice to have.

### 3.1 Integration and sync

| ID | Requirement | Priority |
|---|---|---|
| INT-1 | Receive WooCommerce webhooks for order created/updated/deleted and customer created/updated/deleted | P0 |
| INT-2 | Verify every webhook with HMAC-SHA256 (`X-WC-Webhook-Signature`) against the raw request body using constant-time comparison; reject invalid requests with 401 | P0 |
| INT-3 | Persist each delivery in a queue table keyed by `X-WC-Webhook-Delivery-ID` and acknowledge with 200 before processing | P0 |
| INT-4 | Process queued events asynchronously with retries, exponential backoff, and a dead-letter state after 5 failures | P0 |
| INT-5 | Initial full import of customers and orders through the WooCommerce REST API with pagination and throttling | P0 |
| INT-6 | Scheduled backfill that fetches records modified since the last successful sync to recover missed webhooks | P0 |
| INT-7 | Idempotent processing: duplicate deliveries and out-of-order events never corrupt data (upsert on Woo IDs, compare `date_modified`) | P0 |
| INT-8 | Write back order status, tracking number, and customer-visible notes to WooCommerce via REST | P0 |
| INT-9 | Loop prevention: ignore webhook events that only reflect a change the CRM itself made | P0 |
| INT-10 | Health job that detects and re-enables WooCommerce webhooks disabled after repeated delivery failures | P1 |
| INT-11 | Sync Center page showing last sync time, queue depth, failed events, and a manual retry button | P1 |

### 3.2 Customer data management

| ID | Requirement | Priority |
|---|---|---|
| CUS-1 | Customer list with search (name, email, phone), sorting, filtering, pagination | P0 |
| CUS-2 | Customer 360 profile: contact details, addresses, lifetime value, order count, last order date, order history, message history, notes | P0 |
| CUS-3 | Deduplicate by email; guest checkouts create or attach to a customer by billing email | P0 |
| CUS-4 | Tags and manual notes on customers | P1 |
| CUS-5 | Automatic segments: new, repeat, VIP (spend threshold), lapsed (no order in N days) | P1 |
| CUS-6 | Marketing opt-in flag honored by all marketing workflows | P0 |
| CUS-7 | CSV export of customer list | P1 |
| CUS-8 | Duplicate customer merge tool | P2 |
| CUS-9 | RFM (recency, frequency, monetary) score | P2 |

### 3.3 Order tracking

| ID | Requirement | Priority |
|---|---|---|
| ORD-1 | Order list with filters by status, date range, customer, and amount | P0 |
| ORD-2 | Order detail page: line items, totals, payment method, addresses, linked customer | P0 |
| ORD-3 | Status timeline per order recording every transition with source (Woo or CRM) and timestamp | P0 |
| ORD-4 | Agent can change status and add carrier and tracking number; change is pushed to WooCommerce | P0 |
| ORD-5 | Realtime updates: new orders and status changes appear without page refresh | P1 |
| ORD-6 | Refund and partial refund visibility on the order | P1 |
| ORD-7 | Notes on orders (internal) | P1 |
| ORD-8 | Refund approval initiated from CRM | P2 |

### 3.4 Communication workflows

| ID | Requirement | Priority |
|---|---|---|
| COM-1 | Workflow definition = trigger + conditions + actions | P0 |
| COM-2 | Triggers: order created, order status changed, customer created | P0 |
| COM-3 | Delayed/scheduled triggers: N days after an event, customer inactive for N days | P1 |
| COM-4 | Conditions: order total, status, first order, customer tag/segment, opt-in state | P0 |
| COM-5 | Actions: send email from template, add tag, add note | P0 |
| COM-6 | Email templates with variables (e.g. `{{customer.first_name}}`, `{{order.number}}`, `{{order.tracking_number}}`) and preview | P0 |
| COM-7 | Workflow run log per execution with outcome and error details | P0 |
| COM-8 | Message history per customer (what was sent, when, status) | P0 |
| COM-9 | Seeded starter workflows: order confirmation, shipped notice, review request, win-back, high-value order alert | P1 |
| COM-10 | Abandoned-cart recovery workflow | P2 |
| COM-11 | Unsubscribe link and suppression of marketing email for opted-out customers | P0 |
| COM-12 | AI-drafted reply or customer-history summary for agents | P2 |

### 3.5 Platform

| ID | Requirement | Priority |
|---|---|---|
| PLT-1 | Login via Supabase Auth; role-based access (admin, agent) enforced in the API | P0 |
| PLT-2 | Dashboard: revenue, orders today, new customers, status breakdown, sync health | P1 |
| PLT-3 | Audit log of who changed what | P1 |
| PLT-4 | Settings page for Woo credentials, webhook secret, SMTP/provider, team | P0 |

---

## 4. Architecture

### 4.1 System context

```
 +----------------+   signed webhooks   +--------------------------------------+
 |  WooCommerce   | ------------------> |            Express server            |
 |  (WordPress)   | <------------------ |                                      |
 |                |   REST write-back   |  Webhook receiver --> Event worker   |
 +----------------+   + REST backfill   |        |                  |          |
                                        |        v                  v          |
 +----------------+      HTTPS + JWT    |    (queue table)   Workflow engine --+--> Email provider
 | React dashboard| <-----------------> |                           ^          |    (SMTP / Resend)
 | (agents/admins)|                     |  REST API          Scheduled jobs    |
 +-------+--------+                     +----------------------+---------------+
         |  login + realtime                                   |
         |                                                     v
         |                                    +-------------------------------+
         +----------------------------------->|           Supabase            |
                                              |  Postgres | Auth | Realtime   |
                                              +-------------------------------+
```

### 4.2 Components

| Component | Responsibility |
|---|---|
| React dashboard | UI for customers, orders, workflows, messages, sync health, settings. Uses Supabase JS only for login and Realtime subscriptions; all data reads and writes go through the Express API. |
| REST API | CRUD endpoints, validation (zod), role checks, pagination, search. Verifies the Supabase JWT on every request. |
| Webhook receiver | Verifies HMAC on the raw body, stores the event, returns 200. Contains no business logic. |
| Event worker | Claims pending events, upserts customers and orders, records status history, hands off to the workflow engine. |
| Workflow engine | Loads enabled workflows for a trigger, evaluates conditions, executes actions, writes run logs. |
| Scheduled jobs | Backfill from WooCommerce, webhook health check, delayed-trigger scanner. |
| Supabase Postgres | System of record, event queue, RLS policies. |
| Supabase Auth | User identities and JWTs; role stored in `profiles`. |
| Supabase Realtime | Pushes order and customer changes to the dashboard. |
| Email provider | Delivers workflow email (Nodemailer + SMTP, or Resend). |

### 4.3 Key architecture decisions

| Decision | Rationale | Trade-off |
|---|---|---|
| Postgres table as event queue (`FOR UPDATE SKIP LOCKED`) instead of Redis | Fewer moving parts; transactional with data writes | Lower throughput ceiling; migrate to BullMQ if needed |
| Webhooks plus scheduled REST backfill | Webhooks give speed; backfill gives correctness | Duplicate work, handled by idempotent upserts |
| Acknowledge first, process later | WooCommerce disables webhooks after repeated failed deliveries; fast 200 keeps them alive | Requires a durable queue and worker |
| Idempotency by unique `delivery_id` and unique Woo IDs | Duplicates and replays become harmless | Needs unique constraints and upsert discipline |
| API and worker in one process initially | Simpler deployment for v1 | Split into two processes when load requires |
| Express service-role access; RLS as defense in depth | Server owns business rules; direct client access stays restricted | Service key must never reach the browser |

### 4.4 Project structure

```
woo-crm/
├── docker-compose.yml          # local WordPress + WooCommerce + MySQL
├── PRD.md
├── docs/                       # analysis, design, diagrams
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── server/
│   └── src/
│       ├── index.js            # starts API + worker
│       ├── app.js
│       ├── config/             # env, supabase client, woo client
│       ├── middleware/         # auth, wooWebhook (HMAC), validate, errors
│       ├── routes/             # webhooks, customers, orders, workflows, messages, sync, dashboard
│       ├── controllers/
│       ├── services/           # wooClient, customerSync, orderSync, workflowEngine, email, audit
│       ├── workers/            # eventProcessor
│       ├── jobs/               # backfill, webhookHealth, scheduledTriggers
│       ├── templates/          # email templates
│       └── utils/              # hmac, retry, logger
└── client/
    └── src/
        ├── api/  auth/  hooks/  components/  layouts/
        └── pages/ (Dashboard, Customers, Orders, Workflows, Messages, SyncCenter, Settings)
```

### 4.5 Data model

| Table | Key columns |
|---|---|
| `profiles` | user_id (Supabase auth), role (`admin` or `agent`) |
| `customers` | id, woo_customer_id (unique, nullable), email (unique), first_name, last_name, phone, billing JSONB, shipping JSONB, total_spent, order_count, last_order_at, marketing_opt_in, tags text[], created_at |
| `orders` | id, woo_order_id (unique), customer_id (FK), status, total, currency, line_items JSONB, payment_method, tracking_number, carrier, woo_modified_at |
| `order_events` | order_id, from_status, to_status, source (`woo` or `crm`), at |
| `notes` | entity_type, entity_id, body, author_id, created_at |
| `webhook_events` | delivery_id (unique), topic, payload JSONB, status (`pending`, `processing`, `done`, `failed`), attempts, error, received_at |
| `workflows` | id, name, trigger_type, conditions JSONB, actions JSONB, enabled |
| `workflow_runs` | workflow_id, entity_type, entity_id, status, log JSONB, ran_at |
| `message_templates` | id, name, subject, body, is_marketing |
| `messages` | customer_id, channel, template_id, subject, body, status, sent_at, error |
| `sync_state` | resource, last_synced_at, cursor |
| `audit_log` | actor_id, action, entity_type, entity_id, diff JSONB, at |

Indexes: `customers.email`, `orders.status`, `orders.customer_id`, `webhook_events(status, received_at)`.

### 4.6 API surface (summary)

| Area | Endpoints |
|---|---|
| Webhooks | `POST /webhooks/woo` |
| Customers | `GET /api/customers`, `GET /api/customers/:id`, `PATCH /api/customers/:id`, `POST /api/customers/:id/notes` |
| Orders | `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status`, `PATCH /api/orders/:id/tracking` |
| Workflows | `GET/POST /api/workflows`, `PATCH/DELETE /api/workflows/:id`, `GET /api/workflows/:id/runs` |
| Messages | `GET /api/messages`, `GET/POST /api/templates` |
| Sync | `POST /api/sync/full`, `GET /api/sync/status`, `GET /api/sync/failed`, `POST /api/sync/failed/:id/retry` |
| Dashboard | `GET /api/dashboard/summary` |

---

## 5. User flows

### 5.1 Setup (Admin)
1. Admin signs in.
2. Opens Settings, enters WooCommerce store URL, REST consumer key and secret, and webhook secret.
3. CRM registers the required webhooks in WooCommerce (or shows the delivery URL and secret to paste).
4. Admin runs Full Import from Sync Center and watches progress.
5. Admin configures email provider and enables starter workflows.

### 5.2 New order arrives (automatic)
1. Shopper places an order in WooCommerce.
2. WooCommerce sends a signed webhook.
3. Receiver verifies HMAC, stores the event, returns 200.
4. Worker upserts the customer (matched by email) and the order, records the status event.
5. Workflow engine runs matching rules, for example sends an order confirmation email and logs the run.
6. Dashboard shows the new order live through Realtime.

### 5.3 Agent handles an order
1. Agent opens Orders, filters to "Processing".
2. Opens an order and reviews items, customer, and timeline.
3. Enters carrier and tracking number and sets status to "Shipped".
4. CRM pushes the change to WooCommerce, records the event with source `crm`.
5. "Shipped" workflow emails the customer with the tracking number.
6. The echo webhook from WooCommerce is detected as a no-op and skipped.

### 5.4 Agent looks up a customer
1. Agent searches by name or email.
2. Opens the Customer 360 profile.
3. Reviews lifetime value, orders, previous messages, and notes.
4. Adds a note and a tag (for example "VIP").

### 5.5 Admin builds a workflow
1. Admin opens Workflows and chooses New.
2. Selects trigger (for example "Order status changed to Completed, wait 7 days").
3. Adds conditions (for example first order, total over a threshold).
4. Adds an action: send the review-request template.
5. Previews the email with sample data, saves, and enables the workflow.
6. Later reviews run logs and message history to confirm delivery.

### 5.6 Recovering from failures
1. Server is down while an order is placed; WooCommerce delivery fails.
2. Server restarts; the scheduled backfill fetches orders modified since the last sync and processes the missing order.
3. If any event fails five times it appears in Sync Center as Failed; the admin inspects the error and retries.
4. If WooCommerce disabled the webhook, the health job re-enables it and alerts the admin.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Reliability | No lost events: durable queue, retries, backfill. Idempotent handlers. |
| Performance | Webhook endpoint responds in under 500 ms (store, ack, defer). Customer and order lists respond in under 1 s for 10k records with indexes and pagination. |
| Security | HMAC verification on all webhooks; HTTPS only; secrets in environment variables; service-role key server-side only; role checks in the API; RLS enabled; input validation on every endpoint. |
| Privacy | Respect marketing opt-in; unsubscribe link in marketing email; avoid logging full PII in application logs. |
| Observability | Structured logs; delivery and run logs stored in the database; sync health visible in the UI. |
| Scalability | Stateless receiver and API; multiple workers safe via `SKIP LOCKED`; paginated and throttled backfill. |
| Maintainability | Thin controllers, logic in services; migrations in version control; unit tests for HMAC, upsert idempotency, and workflow conditions. |

---

## 7. Edge cases and failure scenarios

| Scenario | Handling |
|---|---|
| Duplicate webhook delivery | Unique `delivery_id`; upsert on Woo IDs |
| Out-of-order events (update before create) | Compare `woo_modified_at`; fetch fresh record via REST when uncertain |
| Guest checkout without customer ID | Key on billing email |
| CRM write-back triggers echo webhook | Skip events with no real field difference |
| WooCommerce disables webhook | Health job re-enables and alerts |
| Worker crash mid-processing | Claimed rows time out back to `pending`; retries with backoff |
| Invalid signature | 401, nothing stored |
| Secret decoding mismatch | Apply `wp_specialchars_decode()` behavior when computing the expected signature; verify against raw body, not parsed JSON |
| Partial refunds, multi-currency | Store currency per order; show refund lines on order detail |
| Large import | Paginate at 100 per page; throttle requests |
| Email provider failure | Mark message failed, retry, surface in message history |
| Opted-out customer | Marketing workflows skip and log the reason |

---

## 8. Success metrics

| Metric | Target |
|---|---|
| Webhook-to-CRM latency (order visible in dashboard) | Under 5 seconds typical |
| Missed-event recovery | 100% of orders present after a forced outage and backfill |
| Duplicate records after replaying 100 deliveries | 0 |
| Write-back consistency (CRM status equals Woo status) | 100% in demo scenarios |
| Workflow email delivery success | 95% or higher on valid addresses |
| Time for an agent to find a customer and their orders | Under 15 seconds |

---

## 9. Milestones

| Phase | Deliverable | Est. |
|---|---|---|
| 0 | Local Woo store, Supabase project, repo scaffold, analysis doc | Day 1 |
| 1 | Database schema, migrations, seed data | Days 1-2 |
| 2 | Woo REST client, full import, customer/order upsert | Days 2-3 |
| 3 | Webhook receiver, queue, worker, idempotency | Days 3-4 |
| 4 | Auth, roles, REST API with validation | Days 4-5 |
| 5 | Frontend: dashboard, customers, orders, Realtime | Days 5-8 |
| 6 | Order write-back and loop prevention | Days 8-9 |
| 7 | Workflow engine, templates, email, run logs | Days 9-12 |
| 8 | Backfill, health job, Sync Center, tests, docs, demo polish | Days 12-14 |

---

## 10. Demo plan

1. Start with an empty CRM; run Full Import and show customers and orders appearing.
2. Place a new order in the WooCommerce store; it appears live in the CRM and a confirmation email is sent.
3. Mark the order Shipped with a tracking number in the CRM; show the change in WooCommerce and the shipped email.
4. Stop the server, place an order, restart; show the backfill recovering it.
5. Show the workflow run log, message history, and Sync Center.

---

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Webhooks unreachable during local dev | Cannot demo real-time sync | Use ngrok or cloudflared tunnel; backfill as fallback |
| WooCommerce disables webhook after failures | Silent sync loss | Fast ack, health job, alerting |
| Write-back loops | Data churn, duplicate emails | Diff check, source tagging |
| Email deliverability | Workflows appear broken | Use a reputable provider; log provider responses; test with a sandbox |
| Scope creep | Core features unfinished | Strict P0 first; P2 only after the demo flow is stable |
| Free-tier limits (Supabase, hosting) | Throttling or sleep | Keep payloads small; keep an always-on host for worker and cron |

---

## 12. Open questions

1. Which email provider will be used for the demo (SMTP sandbox or Resend)?
2. Is a customer-facing unsubscribe page required in v1, or is a simple mailto/link enough?
3. Should VIP and lapsed thresholds be configurable in Settings or fixed constants for v1?
4. Which P2 features will be built to differentiate the project (abandoned cart, RFM score, AI reply drafting)?
5. Will deployment be live for judging, or run locally with a recorded demo?

---

## 13. Deliverables checklist

- [ ] Analysis document (problem, users, requirements, competitor comparison)
- [ ] Design document (architecture, ER diagram, sync sequence diagram)
- [ ] Working application with seeded demo data
- [ ] Docker Compose for the WooCommerce test store
- [ ] README with setup steps and `.env.example`
- [ ] Demo video