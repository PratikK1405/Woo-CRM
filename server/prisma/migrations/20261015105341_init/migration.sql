-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'agent');

-- CreateEnum
CREATE TYPE "event_source" AS ENUM ('woo', 'crm');

-- CreateEnum
CREATE TYPE "webhook_event_status" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "workflow_trigger" AS ENUM ('order_created', 'order_status_changed', 'customer_created', 'customer_inactive');

-- CreateEnum
CREATE TYPE "run_status" AS ENUM ('scheduled', 'running', 'success', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('customer', 'order');

-- CreateEnum
CREATE TYPE "message_channel" AS ENUM ('email');

-- CreateEnum
CREATE TYPE "message_status" AS ENUM ('queued', 'sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'agent',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "woo_customer_id" INTEGER,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "billing" JSONB,
    "shipping" JSONB,
    "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "last_order_at" TIMESTAMPTZ(6),
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed_at" TIMESTAMPTZ(6),
    "unsubscribe_token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "woo_modified_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "woo_order_id" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "discount_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunded_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "refunds" JSONB NOT NULL DEFAULT '[]',
    "payment_method" TEXT,
    "payment_method_title" TEXT,
    "billing" JSONB,
    "shipping" JSONB,
    "customer_note" TEXT,
    "tracking_number" TEXT,
    "carrier" TEXT,
    "woo_created_at" TIMESTAMPTZ(6) NOT NULL,
    "woo_modified_at" TIMESTAMPTZ(6) NOT NULL,
    "last_crm_push_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "source" "event_source" NOT NULL,
    "actor_id" UUID,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "order_id" UUID,
    "body" TEXT NOT NULL,
    "author_id" UUID,
    "is_customer_visible" BOOLEAN NOT NULL DEFAULT false,
    "woo_note_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "woo_resource_id" INTEGER,
    "payload" JSONB NOT NULL,
    "status" "webhook_event_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" TEXT,
    "error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_state" (
    "resource" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(6),
    "cursor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "last_error" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("resource")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "system_key" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" "workflow_trigger" NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" "run_status" NOT NULL DEFAULT 'scheduled',
    "scheduled_for" TIMESTAMPTZ(6),
    "log" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "ran_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_marketing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "workflow_run_id" UUID,
    "template_id" UUID,
    "channel" "message_channel" NOT NULL DEFAULT 'email',
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "message_status" NOT NULL DEFAULT 'queued',
    "skip_reason" TEXT,
    "provider_message_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB,
    "secret" TEXT,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_woo_customer_id_key" ON "customers"("woo_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_unsubscribe_token_key" ON "customers"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "customers_last_order_at_idx" ON "customers"("last_order_at" DESC);

-- CreateIndex
CREATE INDEX "customers_total_spent_idx" ON "customers"("total_spent" DESC);

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_woo_order_id_key" ON "orders"("woo_order_id");

-- CreateIndex
CREATE INDEX "orders_status_woo_created_at_idx" ON "orders"("status", "woo_created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_customer_id_woo_created_at_idx" ON "orders"("customer_id", "woo_created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_woo_created_at_idx" ON "orders"("woo_created_at" DESC);

-- CreateIndex
CREATE INDEX "order_events_order_id_at_idx" ON "order_events"("order_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "notes_woo_note_id_key" ON "notes"("woo_note_id");

-- CreateIndex
CREATE INDEX "notes_customer_id_created_at_idx" ON "notes"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notes_order_id_created_at_idx" ON "notes"("order_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_delivery_id_key" ON "webhook_events"("delivery_id");

-- CreateIndex
CREATE INDEX "webhook_events_status_received_at_idx" ON "webhook_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_system_key_key" ON "workflows"("system_key");

-- CreateIndex
CREATE INDEX "workflows_trigger_type_enabled_idx" ON "workflows"("trigger_type", "enabled");

-- CreateIndex
CREATE INDEX "workflow_runs_workflow_id_created_at_idx" ON "workflow_runs"("workflow_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "workflow_runs_entity_type_entity_id_idx" ON "workflow_runs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "workflow_runs_status_scheduled_for_idx" ON "workflow_runs"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_workflow_id_dedupe_key_key" ON "workflow_runs"("workflow_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_slug_key" ON "message_templates"("slug");

-- CreateIndex
CREATE INDEX "messages_customer_id_created_at_idx" ON "messages"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_status_created_at_idx" ON "messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_at_idx" ON "audit_log"("entity_type", "entity_id", "at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_at_idx" ON "audit_log"("at" DESC);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
