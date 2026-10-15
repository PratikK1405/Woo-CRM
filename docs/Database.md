# Database Design: WooCommerce CRM

| Field                      | Value                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| Project                    | woo-crm                                                          |
| Database                   | Supabase Postgres                                                |
| ORM / migrations           | Prisma (Prisma 7 conventions; Prisma 6 differences noted inline) |
| Source of truth for schema | `server/prisma/schema.prisma` + `server/prisma/migrations/`      |
| Related                    | [PRD.md](./PRD.md) sections 3, 4.5, 6, 7                         |

This document is the reference for the data layer: how the app connects, the full Prisma schema, the SQL Prisma cannot express, Supabase-specific setup (RLS, Realtime, Auth), and the query patterns that make sync idempotent.

---

## 1. Principles

1. **Express owns the data.** The browser never reads or writes tables directly. All reads and writes go through the Express API, which connects to Postgres through Prisma.
2. **Prisma bypasses RLS; that is intentional.** The Prisma connection role (`postgres` or a dedicated role with `BYPASSRLS`) ignores Row Level Security. RLS is defense in depth for the Supabase client (Auth and Realtime) only.
3. **The Supabase service-role key is not a database credential.** Prisma uses a Postgres connection string. The service-role key is only for `supabase-js` admin calls (for example `auth.admin`) and must never reach the browser.
4. **Idempotency lives in constraints.** Unique `delivery_id`, unique Woo IDs, and `woo_modified_at` comparison make duplicate, delayed and out-of-order events harmless (INT-7).
5. **Aggregates are recomputed, never incremented.** `order_count`, `total_spent`, `last_order_at` are recalculated from `orders` so replays cannot double-count.
6. **Money is `Decimal`, never float.** WooCommerce sends totals as strings; store them as `numeric(12,2)`.
7. **All timestamps are `timestamptz`** and Woo's `*_gmt` fields are used as the source.

---

## 2. Setup

### 2.1 Environment variables

```bash
# Prisma Client at runtime: Supabase transaction pooler (port 6543)
DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma CLI (migrate, db execute, seed): direct or session pooler (port 5432)
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
# or, if your network supports IPv6:
# DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase client (Auth + Realtime only)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="..."            # browser-safe
SUPABASE_SERVICE_ROLE_KEY="..."    # server only, never expose

# Encrypts secrets stored in app_settings (32 random bytes, base64)
APP_ENCRYPTION_KEY="..."
```

Copy these (without values) into `.env.example`.

> The direct connection on `db.[ref].supabase.co` is IPv6 only on the free tier. If your machine or host has no IPv6, use the session pooler string (port 5432) for `DIRECT_URL`.

### 2.2 Prisma config (`server/prisma.config.ts`)

Prisma 7 moved connection URLs out of `schema.prisma`. The CLI reads the direct URL here; the runtime client gets the pooled URL through a driver adapter.

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: { url: env("DIRECT_URL") },
});
```

On **Prisma 6**, put `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` in the `datasource` block of `schema.prisma` instead, and the driver adapter is optional.

### 2.3 Runtime client (`server/src/config/prisma.js`)

```js
import { PrismaClient } from "@prisma/client"; // or your generated path, see 3.1
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 10, // keep well under the pooler limit
});

export const prisma = new PrismaClient({ adapter });
```

Create one client per process. API and worker run in the same process in v1 (PRD 4.3), so they share it.

### 2.4 Scripts (`server/package.json`)

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy && npm run db:setup",
    "db:setup": "prisma db execute --file prisma/sql/supabase-setup.sql",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

### 2.5 File layout

PRD section 4.4 places migrations in `supabase/migrations/`. With Prisma, use one migration system only. Recommended layout:

```
server/
├── prisma.config.ts
└── prisma/
    ├── schema.prisma
    ├── migrations/             # Prisma Migrate (single source of truth for schema)
    ├── sql/
    │   └── supabase-setup.sql  # idempotent: RLS, grants, Realtime, auth trigger
    └── seed.js
```

Do not also run `supabase db push` for schema changes; two migration histories will drift.

### 2.6 Migration workflow

| Task                             | Command                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| New schema change in development | `npm run db:migrate -- --name add_something`                                                 |
| Change needing hand-written SQL  | `npx prisma migrate dev --create-only`, edit the generated `.sql`, then `npm run db:migrate` |
| Apply in staging/production      | `npm run db:deploy` (migrations, then Supabase setup script)                                 |
| Reset local/dev project          | `npx prisma migrate reset` (destroys data)                                                   |

Rules:

- **Portable Postgres goes in migrations** (tables, indexes, CHECK constraints, trigram extension). This keeps Prisma's shadow database working.
- **Supabase-only objects go in `supabase-setup.sql`** (`auth.*`, `anon`/`authenticated` roles, `supabase_realtime`, `auth.uid()`). A plain shadow database does not have these, so putting them in migrations makes `migrate dev` fail.
- Prisma does not diff CHECK constraints, and may not understand partial or expression indexes. If `migrate dev` reports drift on a hand-written index, move that statement into the setup script using `CREATE INDEX IF NOT EXISTS`.
- `@updatedAt` is applied by Prisma Client only. Raw SQL writes must set `updated_at = now()` themselves.

---

## 3. Entity relationship diagram

```mermaid
erDiagram
    profiles ||--o{ notes : writes
    profiles ||--o{ order_events : "acts in"
    profiles ||--o{ audit_log : performs
    profiles ||--o{ workflows : creates

    customers ||--o{ orders : places
    customers ||--o{ notes : "has"
    customers ||--o{ messages : receives

    orders ||--o{ order_events : "status history"
    orders ||--o{ notes : "has"
    orders ||--o{ messages : "related to"

    workflows ||--o{ workflow_runs : executes
    workflow_runs ||--o{ messages : sends
    message_templates ||--o{ messages : renders

    customers {
        uuid id PK
        int woo_customer_id UK
        text email UK
        numeric total_spent
        int order_count
        timestamptz last_order_at
        bool marketing_opt_in
        text[] tags
    }
    orders {
        uuid id PK
        int woo_order_id UK
        uuid customer_id FK
        text status
        numeric total
        timestamptz woo_modified_at
    }
    webhook_events {
        uuid id PK
        text delivery_id UK
        enum status
        int attempts
        timestamptz next_attempt_at
    }
    workflow_runs {
        uuid id PK
        uuid workflow_id FK
        text dedupe_key
        enum status
    }
```

Standalone tables with no relations: `webhook_events`, `sync_state`, `app_settings`.

### 3.1 Table list

| Table               | Purpose                                                | PRD ref              |
| ------------------- | ------------------------------------------------------ | -------------------- |
| `profiles`          | Staff identity and role, 1:1 with `auth.users`         | PLT-1                |
| `customers`         | Unified customer record, deduplicated by email         | CUS-1..7             |
| `orders`            | Orders mirrored from WooCommerce plus CRM-owned fields | ORD-1..7             |
| `order_events`      | Status transition timeline                             | ORD-3                |
| `notes`             | Internal notes and customer-visible order notes        | CUS-4, ORD-7         |
| `webhook_events`    | Durable inbound queue                                  | INT-3, INT-4         |
| `workflows`         | Trigger, conditions, actions                           | COM-1..5             |
| `workflow_runs`     | Per-execution log, also the delayed-run schedule       | COM-3, COM-7         |
| `message_templates` | Email templates with variables                         | COM-6                |
| `messages`          | Outbound message history                               | COM-8                |
| `sync_state`        | Per-resource backfill cursor and health                | INT-5, INT-6, INT-11 |
| `audit_log`         | Who changed what                                       | PLT-3                |
| `app_settings`      | Integration config and thresholds (added, see 7)       | PLT-4                |

---

## 4. Prisma schema

`server/prisma/schema.prisma`

```prisma
// ───────────────────────── Generator & datasource ─────────────────────────
// Plain-JS server (index.js): "prisma-client-js" imports from '@prisma/client'.
// TypeScript server: use provider = "prisma-client" with a required `output`
// (and moduleFormat = "cjs" if your project is CommonJS), then import from that path.
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // Prisma 6 only:
  // url       = env("DATABASE_URL")
  // directUrl = env("DIRECT_URL")
}

// ───────────────────────────────── Enums ──────────────────────────────────
enum UserRole {
  admin
  agent

  @@map("user_role")
}

enum EventSource {
  woo
  crm

  @@map("event_source")
}

enum WebhookEventStatus {
  pending
  processing
  done
  failed // dead-letter: attempts exhausted

  @@map("webhook_event_status")
}

enum WorkflowTrigger {
  order_created
  order_status_changed
  customer_created
  customer_inactive

  @@map("workflow_trigger")
}

enum RunStatus {
  scheduled
  running
  success
  skipped
  failed

  @@map("run_status")
}

enum EntityType {
  customer
  order

  @@map("entity_type")
}

enum MessageChannel {
  email

  @@map("message_channel")
}

enum MessageStatus {
  queued
  sent
  failed
  skipped

  @@map("message_status")
}

// ──────────────────────────────── Identity ────────────────────────────────
/// One row per Supabase Auth user. FK to auth.users is added in supabase-setup.sql.
model Profile {
  userId    String   @id @map("user_id") @db.Uuid
  email     String
  fullName  String?  @map("full_name")
  role      UserRole @default(agent)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  notes       Note[]
  orderEvents OrderEvent[]
  workflows   Workflow[]
  auditLogs   AuditLog[]

  @@map("profiles")
}

// ─────────────────────────────── Customers ────────────────────────────────
model Customer {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wooCustomerId   Int?      @unique @map("woo_customer_id") // null for guest-only customers
  email           String    @unique // always stored lowercase (CHECK in migration)
  firstName       String    @default("") @map("first_name")
  lastName        String    @default("") @map("last_name")
  phone           String?
  billing         Json?
  shipping        Json?
  totalSpent      Decimal   @default(0) @map("total_spent") @db.Decimal(12, 2)
  orderCount      Int       @default(0) @map("order_count")
  lastOrderAt     DateTime? @map("last_order_at") @db.Timestamptz(6)
  marketingOptIn  Boolean   @default(false) @map("marketing_opt_in")
  unsubscribedAt  DateTime? @map("unsubscribed_at") @db.Timestamptz(6)
  unsubscribeToken String   @unique @default(dbgenerated("gen_random_uuid()")) @map("unsubscribe_token") @db.Uuid
  tags            String[]  @default([])
  wooModifiedAt   DateTime? @map("woo_modified_at") @db.Timestamptz(6)
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz(6) // soft delete (Woo "deleted" webhook)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  orders   Order[]
  notes    Note[]
  messages Message[]

  @@index([lastOrderAt(sort: Desc)])
  @@index([totalSpent(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@index([tags], type: Gin)
  @@map("customers")
}

// ───────────────────────────────── Orders ─────────────────────────────────
model Order {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wooOrderId         Int       @unique @map("woo_order_id")
  number             String    // display number, may differ from woo_order_id
  customerId         String    @map("customer_id") @db.Uuid
  status             String    // Woo slug: pending, processing, on-hold, completed, cancelled, refunded, failed, plus plugin statuses
  total              Decimal   @db.Decimal(12, 2)
  discountTotal      Decimal   @default(0) @map("discount_total") @db.Decimal(12, 2)
  shippingTotal      Decimal   @default(0) @map("shipping_total") @db.Decimal(12, 2)
  taxTotal           Decimal   @default(0) @map("tax_total") @db.Decimal(12, 2)
  refundedTotal      Decimal   @default(0) @map("refunded_total") @db.Decimal(12, 2)
  currency           String    @db.VarChar(3)
  lineItems          Json      @default("[]") @map("line_items")
  refunds            Json      @default("[]")
  paymentMethod      String?   @map("payment_method")
  paymentMethodTitle String?   @map("payment_method_title")
  billing            Json?
  shipping           Json?
  customerNote       String?   @map("customer_note") // note left by the shopper at checkout
  trackingNumber     String?   @map("tracking_number")
  carrier            String?
  wooCreatedAt       DateTime  @map("woo_created_at") @db.Timestamptz(6)
  wooModifiedAt      DateTime  @map("woo_modified_at") @db.Timestamptz(6)
  lastCrmPushAt      DateTime? @map("last_crm_push_at") @db.Timestamptz(6) // last write-back to Woo
  deletedAt          DateTime? @map("deleted_at") @db.Timestamptz(6)
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  customer Customer     @relation(fields: [customerId], references: [id], onDelete: Restrict)
  events   OrderEvent[]
  notes    Note[]
  messages Message[]

  @@index([status, wooCreatedAt(sort: Desc)])
  @@index([customerId, wooCreatedAt(sort: Desc)])
  @@index([wooCreatedAt(sort: Desc)])
  @@map("orders")
}

model OrderEvent {
  id         String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId    String      @map("order_id") @db.Uuid
  fromStatus String?     @map("from_status") // null for the first event
  toStatus   String      @map("to_status")
  source     EventSource
  actorId    String?     @map("actor_id") @db.Uuid // staff member when source = crm
  at         DateTime    @default(now()) @db.Timestamptz(6)

  order Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  actor Profile? @relation(fields: [actorId], references: [userId], onDelete: SetNull)

  @@index([orderId, at])
  @@map("order_events")
}

// ────────────────────────────────── Notes ─────────────────────────────────
/// Exactly one of customer_id / order_id is set (CHECK in migration).
model Note {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerId        String?  @map("customer_id") @db.Uuid
  orderId           String?  @map("order_id") @db.Uuid
  body              String
  authorId          String?  @map("author_id") @db.Uuid // null for system notes (workflow "add note")
  isCustomerVisible Boolean  @default(false) @map("is_customer_visible") // pushed to Woo as customer note
  wooNoteId         Int?     @unique @map("woo_note_id")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  customer Customer? @relation(fields: [customerId], references: [id], onDelete: Cascade)
  order    Order?    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  author   Profile?  @relation(fields: [authorId], references: [userId], onDelete: SetNull)

  @@index([customerId, createdAt(sort: Desc)])
  @@index([orderId, createdAt(sort: Desc)])
  @@map("notes")
}

// ───────────────────────────── Sync & queue ───────────────────────────────
model WebhookEvent {
  id            String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  deliveryId    String             @unique @map("delivery_id") // X-WC-Webhook-Delivery-ID
  topic         String             // e.g. order.updated
  wooResourceId Int?               @map("woo_resource_id")
  payload       Json
  status        WebhookEventStatus @default(pending)
  attempts      Int                @default(0)
  nextAttemptAt DateTime           @default(now()) @map("next_attempt_at") @db.Timestamptz(6)
  lockedAt      DateTime?          @map("locked_at") @db.Timestamptz(6)
  lockedBy      String?            @map("locked_by") // worker id, for debugging
  error         String?
  receivedAt    DateTime           @default(now()) @map("received_at") @db.Timestamptz(6)
  processedAt   DateTime?          @map("processed_at") @db.Timestamptz(6)

  @@index([status, receivedAt])
  @@map("webhook_events")
}

model SyncState {
  resource     String    @id // "customers" | "orders" | "webhooks"
  lastSyncedAt DateTime? @map("last_synced_at") @db.Timestamptz(6)
  cursor       String?   // last page or modified_after watermark
  status       String    @default("idle") // idle | running | error
  lastError    String?   @map("last_error")
  meta         Json      @default("{}")   // import progress counters
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("sync_state")
}

// ─────────────────────────────── Workflows ────────────────────────────────
model Workflow {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  systemKey     String?         @unique @map("system_key") // stable key for seeded starter workflows
  name          String
  description   String?
  triggerType   WorkflowTrigger @map("trigger_type")
  triggerConfig Json            @default("{}") @map("trigger_config") // e.g. {"toStatus":"completed"} or {"inactiveDays":90}
  delayMinutes  Int             @default(0) @map("delay_minutes")     // 0 = run immediately
  conditions    Json            @default("[]")
  actions       Json            @default("[]")
  enabled       Boolean         @default(false)
  createdById   String?         @map("created_by_id") @db.Uuid
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)

  createdBy Profile?      @relation(fields: [createdById], references: [userId], onDelete: SetNull)
  runs      WorkflowRun[]

  @@index([triggerType, enabled])
  @@map("workflows")
}

model WorkflowRun {
  id           String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workflowId   String     @map("workflow_id") @db.Uuid
  entityType   EntityType @map("entity_type")
  entityId     String     @map("entity_id") @db.Uuid // polymorphic on purpose: logs outlive entities
  dedupeKey    String     @map("dedupe_key") // e.g. "order:{id}:status:completed:{eventId}"
  status       RunStatus  @default(scheduled)
  scheduledFor DateTime?  @map("scheduled_for") @db.Timestamptz(6)
  log          Json       @default("[]")
  error        String?
  ranAt        DateTime?  @map("ran_at") @db.Timestamptz(6)
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)

  workflow Workflow  @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  messages Message[]

  @@unique([workflowId, dedupeKey])
  @@index([workflowId, createdAt(sort: Desc)])
  @@index([entityType, entityId])
  @@index([status, scheduledFor])
  @@map("workflow_runs")
}

// ─────────────────────────────── Messaging ────────────────────────────────
model MessageTemplate {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug        String   @unique // stable key used by seeds and workflow actions
  name        String
  subject     String
  body        String   // supports {{customer.first_name}}, {{order.number}}, ...
  isMarketing Boolean  @default(false) @map("is_marketing")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  messages Message[]

  @@map("message_templates")
}

model Message {
  id                String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerId        String         @map("customer_id") @db.Uuid
  orderId           String?        @map("order_id") @db.Uuid
  workflowRunId     String?        @map("workflow_run_id") @db.Uuid
  templateId        String?        @map("template_id") @db.Uuid
  channel           MessageChannel @default(email)
  toAddress         String         @map("to_address") // snapshot of the address used
  subject           String
  body              String         // rendered output, kept for history
  status            MessageStatus  @default(queued)
  skipReason        String?        @map("skip_reason") // e.g. "marketing opt-out"
  providerMessageId String?        @map("provider_message_id")
  attempts          Int            @default(0)
  error             String?
  sentAt            DateTime?      @map("sent_at") @db.Timestamptz(6)
  createdAt         DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)

  customer    Customer         @relation(fields: [customerId], references: [id], onDelete: Cascade)
  order       Order?           @relation(fields: [orderId], references: [id], onDelete: SetNull)
  workflowRun WorkflowRun?     @relation(fields: [workflowRunId], references: [id], onDelete: SetNull)
  template    MessageTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  @@index([customerId, createdAt(sort: Desc)])
  @@index([status, createdAt])
  @@map("messages")
}

// ───────────────────────────── Platform tables ────────────────────────────
model AuditLog {
  id         String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  actorId    String?    @map("actor_id") @db.Uuid // null for system actions
  action     String     // e.g. order.status_changed, workflow.updated
  entityType String     @map("entity_type")
  entityId   String     @map("entity_id")
  diff       Json?
  at         DateTime   @default(now()) @db.Timestamptz(6)

  actor Profile? @relation(fields: [actorId], references: [userId], onDelete: SetNull)

  @@index([entityType, entityId, at(sort: Desc)])
  @@index([at(sort: Desc)])
  @@map("audit_log")
}

/// Admin-editable configuration. Secrets are encrypted by the app before storage.
model AppSetting {
  key         String   @id // e.g. woo.store_url, woo.webhook_secret, smtp.host, segments.vip_threshold
  value       Json?    // non-secret values
  secret      String?  // AES-256-GCM ciphertext (base64); never returned by the API
  updatedById String?  @map("updated_by_id") @db.Uuid
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("app_settings")
}
```

---

## 5. SQL that Prisma cannot express

Create an empty migration, then paste this in:

```bash
npx prisma migrate dev --create-only --name constraints_and_search_indexes
```

```sql
-- Trigram search (CUS-1). On Supabase the "extensions" schema already exists.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX customers_email_trgm_idx      ON customers USING gin (email      extensions.gin_trgm_ops);
CREATE INDEX customers_first_name_trgm_idx ON customers USING gin (first_name extensions.gin_trgm_ops);
CREATE INDEX customers_last_name_trgm_idx  ON customers USING gin (last_name  extensions.gin_trgm_ops);
CREATE INDEX customers_phone_trgm_idx      ON customers USING gin (phone      extensions.gin_trgm_ops);

-- Dedupe by email is only reliable if case is normalised (CUS-3).
ALTER TABLE customers
  ADD CONSTRAINT customers_email_lowercase CHECK (email = lower(email));

-- A note belongs to exactly one target.
ALTER TABLE notes
  ADD CONSTRAINT notes_exactly_one_target CHECK (num_nonnulls(customer_id, order_id) = 1);

-- Queue hygiene.
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_attempts_nonneg CHECK (attempts >= 0);

-- Hot path for the worker: only pending rows are scanned.
CREATE INDEX webhook_events_claim_idx
  ON webhook_events (next_attempt_at)
  WHERE status = 'pending';

-- Order search by amount and soft-delete-aware listing.
CREATE INDEX orders_live_created_idx
  ON orders (woo_created_at DESC)
  WHERE deleted_at IS NULL;
```

With these indexes in place, Prisma's `contains` with `mode: 'insensitive'` (which compiles to `ILIKE '%term%'`) on `email`, `firstName`, `lastName` and `phone` uses the trigram indexes.

---

## 6. Supabase setup script

`server/prisma/sql/supabase-setup.sql` is idempotent and runs after every deploy (`npm run db:setup`). It holds everything that depends on Supabase's `auth` schema and roles.

```sql
-- ─────────────── 1. Link profiles to auth.users ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create a profile (default role: agent) whenever a user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, updated_at)
  VALUES (NEW.id, NEW.email, 'agent'::public.user_role, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────── 2. Row Level Security ───────────────
-- Enable on every table. Tables with no policy are unreadable to anon/authenticated.
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings      ENABLE ROW LEVEL SECURITY;

-- Helper avoids recursive RLS when policies need to look at profiles.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = (SELECT auth.uid())
  );
$$;

-- A user can read their own profile.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Staff can read only what Realtime subscriptions need.
DROP POLICY IF EXISTS orders_select_staff ON public.orders;
CREATE POLICY orders_select_staff ON public.orders
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS customers_select_staff ON public.customers;
CREATE POLICY customers_select_staff ON public.customers
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

DROP POLICY IF EXISTS order_events_select_staff ON public.order_events;
CREATE POLICY order_events_select_staff ON public.order_events
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));

-- ─────────────── 3. Table privileges for the Data API roles ───────────────
-- Prisma-created tables in "public" are reachable through Supabase's REST API
-- unless privileges are removed. Revoke everything, then grant only what Realtime needs.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

GRANT SELECT ON public.profiles, public.orders, public.customers, public.order_events
  TO authenticated;

-- ─────────────── 4. Realtime (ORD-5) ───────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders', 'customers', 'order_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
```

Notes:

- **Realtime respects RLS.** The dashboard subscribes with the user's JWT, so the `SELECT` policies above are what allow events through. Subscribe only to `orders`, `customers`, `order_events`.
- **Role-based access (admin vs agent) is enforced in the Express API**, not in RLS (PRD PLT-1). RLS here only answers "is this a signed-in staff member".
- **Optional hardening:** in the Supabase dashboard, remove `public` from "Exposed schemas" under API settings, since the app never uses PostgREST. Then the REVOKE/GRANT block is a second layer rather than the only one.
- **Optional hardening:** create a dedicated Postgres role for Prisma (with `BYPASSRLS`) instead of using `postgres`, following Supabase's Prisma guide.
- **Promote the first admin** once, in the SQL editor:
  ```sql
  UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
  ```

---

## 7. Design decisions and deviations from the PRD

The PRD data model (4.5) lists key columns. The schema above follows it and makes these deliberate changes:

| Change                                                                                             | Reason                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notes` uses `customer_id` and `order_id` (one must be set) instead of `entity_type` + `entity_id` | Real foreign keys, cascading deletes and referential integrity. Polymorphic IDs cannot have FKs.                                                                                                                      |
| `workflow_runs` and `audit_log` keep polymorphic `entity_type` + `entity_id`                       | They are logs that must survive deletion of the entity they describe.                                                                                                                                                 |
| `orders.status` is `String`, not an enum                                                           | Plugins add custom Woo statuses; an enum would make the worker crash on unknown values.                                                                                                                               |
| Soft delete (`deleted_at`) on `customers` and `orders`                                             | Woo "deleted" webhooks should not erase history, message logs or revenue. List queries filter `deleted_at IS NULL`.                                                                                                   |
| `orders.customer_id` uses `ON DELETE RESTRICT`                                                     | Hard-deleting a customer must never silently remove their orders.                                                                                                                                                     |
| Added `webhook_events.next_attempt_at`, `locked_at`, `locked_by`, `processed_at`                   | Needed for exponential backoff (INT-4) and reclaiming rows from crashed workers (section 8.1).                                                                                                                        |
| Added `workflow_runs.dedupe_key` with unique `(workflow_id, dedupe_key)`                           | A retried event must not send the same email twice.                                                                                                                                                                   |
| Added `workflow_runs.scheduled_for` and `workflows.delay_minutes`                                  | Delayed triggers (COM-3) are rows with `status = scheduled`, picked up by the scanner job.                                                                                                                            |
| Added `workflows.system_key` and `message_templates.slug`                                          | Lets the seed script upsert starter workflows (COM-9) without creating duplicates.                                                                                                                                    |
| Added `customers.unsubscribe_token` and `unsubscribed_at`                                          | Unguessable unsubscribe links without exposing customer IDs (COM-11).                                                                                                                                                 |
| Added `orders.refunded_total`, `refunds`, `last_crm_push_at`, and amount breakdown columns         | Refund visibility (ORD-6) and write-back loop prevention (INT-9).                                                                                                                                                     |
| Added `messages.order_id`, `workflow_run_id`, `to_address`, `skip_reason`                          | Link a message to its run and order; record why marketing mail was skipped (COM-8, edge cases in PRD 7).                                                                                                              |
| Added `notes.is_customer_visible`, `woo_note_id`                                                   | Write-back of customer-visible notes (INT-8) without re-importing them as duplicates.                                                                                                                                 |
| Added `app_settings` table                                                                         | PLT-4 needs Woo credentials, webhook secret and SMTP stored from the Settings page. Secrets are AES-256-GCM encrypted with `APP_ENCRYPTION_KEY`. Also holds VIP and lapsed thresholds (open question 3).              |
| Segments (CUS-5) are computed, not stored                                                          | Thresholds may become configurable. New = `order_count <= 1`, repeat = `order_count >= 2`, VIP = `total_spent >= threshold`, lapsed = `last_order_at < now() - N days`. Indexed on `last_order_at` and `total_spent`. |
| Multi-store is not modelled                                                                        | Out of scope for v1. Later, add a `stores` table and a `store_id` column to `customers`, `orders`, `webhook_events`, `sync_state`, and make the Woo ID uniques composite with `store_id`.                             |

---

## 8. Core query patterns

### 8.1 Claim queued events (worker)

Use a single `UPDATE ... RETURNING` statement. The row lock is held only for that statement, so it works with the transaction pooler and never stays open while calling WooCommerce.

```js
const events = await prisma.$queryRaw`
  UPDATE webhook_events
     SET status = 'processing',
         locked_at = now(),
         locked_by = ${workerId},
         attempts = attempts + 1
   WHERE id IN (
     SELECT id FROM webhook_events
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY received_at
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *`;
```

Outcomes:

```sql
-- success
UPDATE webhook_events SET status = 'done', processed_at = now(), error = NULL WHERE id = $1;

-- failure, retries left (exponential backoff: 10s, 20s, 40s, 80s)
UPDATE webhook_events
   SET status = 'pending', error = $2, locked_at = NULL,
       next_attempt_at = now() + (power(2, attempts) * interval '5 seconds')
 WHERE id = $1 AND attempts < 5;

-- failure, attempts exhausted -> dead letter (shown in Sync Center)
UPDATE webhook_events SET status = 'failed', error = $2, locked_at = NULL
 WHERE id = $1 AND attempts >= 5;
```

Reclaim rows from crashed workers (run every minute). `attempts` was already incremented at claim time, so a crash counts as an attempt:

```sql
UPDATE webhook_events
   SET status = CASE WHEN attempts >= 5 THEN 'failed'::webhook_event_status
                     ELSE 'pending'::webhook_event_status END,
       locked_at = NULL
 WHERE status = 'processing' AND locked_at < now() - interval '5 minutes';
```

Manual retry from Sync Center: `UPDATE webhook_events SET status = 'pending', attempts = 0, next_attempt_at = now(), error = NULL WHERE id = $1 AND status = 'failed'`.

### 8.2 Receive a webhook (idempotent insert)

```js
await prisma.webhookEvent.upsert({
  where: { deliveryId },
  create: { deliveryId, topic, wooResourceId, payload },
  update: {}, // duplicate delivery: do nothing
});
// then respond 200 immediately
```

### 8.3 Upsert an order without letting stale data win

Prisma's `upsert` cannot add a "only if newer" condition, and two workers may process the same order concurrently. Use one atomic statement so an older event never overwrites a newer row (INT-7):

```js
const rows = await prisma.$executeRaw`
  INSERT INTO orders (woo_order_id, number, customer_id, status, total, currency,
                      line_items, woo_created_at, woo_modified_at, updated_at /* , ... */)
  VALUES (${wooId}, ${number}, ${customerId}, ${status}, ${total}, ${currency},
          ${lineItems}::jsonb, ${createdAt}, ${modifiedAt}, now())
  ON CONFLICT (woo_order_id) DO UPDATE
     SET status = EXCLUDED.status,
         total = EXCLUDED.total,
         line_items = EXCLUDED.line_items,
         woo_modified_at = EXCLUDED.woo_modified_at,
         updated_at = now()
   WHERE orders.woo_modified_at < EXCLUDED.woo_modified_at`;
// rows === 0 means the stored row was already as new or newer: skip side effects
```

Do the following in the same `prisma.$transaction` and only when the upsert changed a row:

1. Read the previous status first (`SELECT status ... FOR UPDATE`), and insert an `order_events` row **only if the status actually changed** (`source = 'woo'`). This keeps the timeline free of duplicates on replay.
2. Recompute the customer aggregates (8.4).
3. Enqueue workflow runs (8.6).

### 8.4 Resolve the customer, then recompute aggregates

Customer matching order (CUS-3):

1. Match on `woo_customer_id` if the payload has one.
2. Otherwise match on lower-cased billing email.
3. If found by email and the row has no `woo_customer_id` (an earlier guest who later registered), set it.
4. If the matching row is soft-deleted (customer re-created in Woo), clear `deleted_at` rather than inserting a second row.
5. Otherwise create.

Aggregates are recomputed in the same transaction:

```sql
UPDATE customers c
   SET order_count   = s.cnt,
       total_spent   = s.spent,
       last_order_at = s.last_at,
       updated_at    = now()
  FROM (
    SELECT count(*)                              AS cnt,
           coalesce(sum(total - refunded_total), 0) AS spent,
           max(woo_created_at)                   AS last_at
      FROM orders
     WHERE customer_id = $1
       AND deleted_at IS NULL
       AND status IN ('processing', 'completed', 'on-hold')
  ) s
 WHERE c.id = $1;
```

The counted statuses are a business decision; keep them in one constant so the definition of "lifetime value" is consistent everywhere.

### 8.5 CRM write-back and loop prevention (INT-8, INT-9)

When an agent changes status or tracking:

1. In one transaction: update `orders` (status, tracking, carrier, `last_crm_push_at = now()`), insert `order_events` with `source = 'crm'` and `actor_id`, insert an `audit_log` row.
2. Push to WooCommerce.
3. When the echo webhook arrives, the worker compares `status`, `tracking_number`, `carrier` in the payload with the stored row. If nothing differs, it marks the event `done` and skips the event insert and workflow triggers.

If the push to Woo fails, keep the row but surface the error to the agent and retry. Do not roll back silently, or the CRM and Woo will disagree without anyone knowing.

### 8.6 Workflow run idempotency and delays

Create a run with a deterministic key so a retried event cannot trigger the same workflow twice:

```js
await prisma.workflowRun.createMany({
  data: matches.map((w) => ({
    workflowId: w.id,
    entityType: "order",
    entityId: order.id,
    dedupeKey: `order:${order.id}:status:${toStatus}:${eventId}`,
    status: w.delayMinutes > 0 ? "scheduled" : "running",
    scheduledFor: w.delayMinutes > 0 ? addMinutes(now, w.delayMinutes) : null,
  })),
  skipDuplicates: true, // unique(workflow_id, dedupe_key)
});
```

The scheduled-trigger job claims due runs with the same `SKIP LOCKED` pattern as 8.1, using `WHERE status = 'scheduled' AND scheduled_for <= now()`. For `customer_inactive`, use `inactive:{customerId}:{lastOrderAt}` as the key so a lapsed customer is only contacted once per last order.

Before sending a marketing template, the engine re-checks `marketing_opt_in` and `unsubscribed_at`. If suppressed, it writes a `messages` row with `status = 'skipped'` and a `skip_reason` (COM-11, PRD 7).

### 8.7 Customer list (search, filter, paginate)

```js
const where = {
  deletedAt: null,
  ...(q && {
    OR: [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ],
  }),
  ...(tag && { tags: { has: tag } }),
};
const [rows, total] = await prisma.$transaction([
  prisma.customer.findMany({
    where,
    orderBy: { lastOrderAt: "desc" },
    take,
    skip,
  }),
  prisma.customer.count({ where }),
]);
```

For lists over about 10k rows with deep pages, switch to cursor pagination (`cursor` + `take`) to stay under the 1 s target in PRD section 6.

---

## 9. Index summary

| Table          | Index                                                                                   | Serves                             |
| -------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| customers      | unique `email`, unique `woo_customer_id`, unique `unsubscribe_token`                    | Dedupe, upsert, unsubscribe        |
| customers      | `last_order_at DESC`, `total_spent DESC`, `created_at DESC`                             | Sort, VIP and lapsed segments      |
| customers      | GIN `tags`                                                                              | Tag filter                         |
| customers      | trigram GIN on `email`, `first_name`, `last_name`, `phone`                              | Search (migration)                 |
| orders         | unique `woo_order_id`                                                                   | Upsert                             |
| orders         | `(status, woo_created_at DESC)`                                                         | Order list by status and date      |
| orders         | `(customer_id, woo_created_at DESC)`                                                    | Customer 360 order history         |
| orders         | `woo_created_at DESC`                                                                   | Date-range filter, dashboard       |
| order_events   | `(order_id, at)`                                                                        | Timeline                           |
| notes          | `(customer_id, created_at DESC)`, `(order_id, created_at DESC)`                         | Notes panels                       |
| webhook_events | unique `delivery_id`                                                                    | Idempotent receive                 |
| webhook_events | `(status, received_at)`                                                                 | Sync Center lists                  |
| webhook_events | partial `(next_attempt_at) WHERE status = 'pending'`                                    | Worker claim (migration)           |
| workflows      | `(trigger_type, enabled)`                                                               | Trigger lookup                     |
| workflow_runs  | unique `(workflow_id, dedupe_key)`                                                      | Run idempotency                    |
| workflow_runs  | `(workflow_id, created_at DESC)`, `(entity_type, entity_id)`, `(status, scheduled_for)` | Run log, entity history, scheduler |
| messages       | `(customer_id, created_at DESC)`, `(status, created_at)`                                | Message history, failed sends      |
| audit_log      | `(entity_type, entity_id, at DESC)`, `(at DESC)`                                        | History views                      |

---

## 10. Seed data (`server/prisma/seed.js`)

Run with `npm run db:seed`. Every insert is an upsert on a stable key, so seeding is safe to re-run.

| Data                    | Key                                | Notes                                                                                                                                     |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Message templates       | `slug`                             | `order-confirmation`, `order-shipped`, `review-request`, `win-back`, `high-value-order-alert` (alert is internal, `is_marketing = false`) |
| Starter workflows       | `system_key`                       | Created with `enabled = false`; admin turns them on (COM-9)                                                                               |
| `app_settings` defaults | `key`                              | `segments.vip_threshold`, `segments.lapsed_days`, `sync.backfill_interval_minutes`                                                        |
| `sync_state` rows       | `resource`                         | `customers`, `orders`, `webhooks`                                                                                                         |
| Demo customers/orders   | `woo_customer_id` / `woo_order_id` | Optional; the demo plan starts from an empty CRM and a Full Import, so keep demo data separate (`db:seed:demo`)                           |

Staff users are created through Supabase Auth, not by seed. The `handle_new_user` trigger creates their profile.

---

## 11. Retention and maintenance

| Item                                  | Policy                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `webhook_events` with `status = done` | Delete after 14 days (large JSON payloads). Keep `failed` until an admin resolves them.                            |
| `workflow_runs` / `messages`          | Keep. Consider archiving after 12 months.                                                                          |
| `audit_log`                           | Keep. Append-only; never update or delete from application code.                                                   |
| Backups                               | Supabase daily backups on paid plans. On the free tier, take a `pg_dump` before demos and before risky migrations. |

Schedule cleanup with `pg_cron` (enable the extension in Supabase) or from the existing scheduled-jobs runner:

```sql
DELETE FROM webhook_events
 WHERE status = 'done' AND processed_at < now() - interval '14 days';
```

Also run `VACUUM (ANALYZE)` awareness: `webhook_events` has high churn, so keep the table small with the cleanup above rather than letting it bloat.

---

## 12. Security checklist

- [ ] RLS enabled on every table (setup script section 2)
- [ ] `anon` and `authenticated` have `SELECT` only on `profiles`, `orders`, `customers`, `order_events`
- [ ] `public` removed from exposed API schemas, or the REVOKE block verified
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` only in server environment variables
- [ ] Woo consumer secret, webhook secret and SMTP password stored only encrypted in `app_settings.secret`
- [ ] API never returns `app_settings.secret`
- [ ] Webhook payloads (which contain PII) are purged by the retention job and not written to application logs
- [ ] Email stored lowercase (CHECK constraint) and `unsubscribe_token` used in all unsubscribe links
- [ ] All writes in sections 8.3 to 8.5 run inside a single transaction

---

## 13. Requirement traceability

| Requirement   | Database support                                                                |
| ------------- | ------------------------------------------------------------------------------- |
| INT-3, INT-4  | `webhook_events` with unique `delivery_id`, backoff, `failed` dead-letter state |
| INT-6         | `sync_state.last_synced_at` and `cursor` per resource                           |
| INT-7         | Unique Woo IDs, `woo_modified_at` guarded upsert (8.3)                          |
| INT-9         | `last_crm_push_at`, `order_events.source`, no-diff check (8.5)                  |
| INT-11        | `sync_state`, `webhook_events` counts and `failed` rows                         |
| CUS-3         | Unique lower-cased `email`, match order in 8.4                                  |
| CUS-5         | Computed segments over indexed `total_spent`, `last_order_at`, `order_count`    |
| CUS-6, COM-11 | `marketing_opt_in`, `unsubscribed_at`, `messages.skip_reason`                   |
| ORD-3         | `order_events`                                                                  |
| ORD-5         | Realtime publication on `orders`, `customers`, `order_events`                   |
| ORD-6         | `orders.refunds`, `refunded_total`                                              |
| COM-1..5, 7   | `workflows`, `workflow_runs`                                                    |
| COM-3         | `workflow_runs.scheduled_for`, `workflows.delay_minutes`                        |
| COM-6, 8      | `message_templates`, `messages`                                                 |
| PLT-1         | `profiles.role` (enforced in API), RLS for Realtime                             |
| PLT-3         | `audit_log`                                                                     |
| PLT-4         | `app_settings`                                                                  |

---

## 14. Open items

1. **Prisma generator choice.** The server is plain JavaScript in the PRD. `prisma-client-js` imports from `@prisma/client` with no build step. If you move the server to TypeScript, switch to the `prisma-client` generator and set `output` (and `moduleFormat = "cjs"` for CommonJS).
2. **Which order statuses count toward lifetime value** (section 8.4). Default here: processing, completed, on-hold, net of refunds.
3. **Tracking field in WooCommerce.** Core WooCommerce has no tracking field. Decide whether write-back uses a shipment-tracking plugin or custom order meta; the CRM columns (`tracking_number`, `carrier`) are the same either way.
4. **Open question 3 in the PRD** (configurable VIP and lapsed thresholds). The schema supports it through `app_settings`; if fixed for v1, replace those keys with constants.
