// server/src/workers/eventProcessor.js
const { prisma } = require("../config/prisma");
const { logger } = require("../utils/logger");

let isRunning = false;
let timerId = null;

async function processOrderPayload(payload, topic) {
  if (!payload || !payload.id) return;

  const wooOrderId = parseInt(payload.id, 10);
  const orderNumber = String(payload.number || payload.id);
  const billing = payload.billing || {};
  const shipping = payload.shipping || {};
  const email = (billing.email || payload.customer_email || "").toLowerCase().trim();

  let customerId = null;

  // 1. Resolve or upsert customer if email is available
  if (email) {
    const firstName = billing.first_name || payload.first_name || "";
    const lastName = billing.last_name || payload.last_name || "";
    const phone = billing.phone || null;
    const wooCustomerId = payload.customer_id ? parseInt(payload.customer_id, 10) : null;

    const customer = await prisma.customer.upsert({
      where: { email },
      create: {
        email,
        wooCustomerId: wooCustomerId && wooCustomerId > 0 ? wooCustomerId : null,
        firstName,
        lastName,
        phone,
        billing,
        shipping,
        marketingOptIn: false,
      },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        billing: billing || undefined,
        shipping: shipping || undefined,
        lastSyncedAt: new Date(),
      },
    });

    customerId = customer.id;
  }

  // 2. Parse timestamps & financial totals
  const total = parseFloat(payload.total || "0");
  const subtotal = parseFloat(payload.subtotal || payload.total || "0");
  const taxTotal = parseFloat(payload.total_tax || "0");
  const shippingTotal = parseFloat(payload.shipping_total || "0");
  const discountTotal = parseFloat(payload.discount_total || "0");

  const dateCreated = payload.date_created_gmt ? new Date(payload.date_created_gmt) : new Date();
  const dateModified = payload.date_modified_gmt ? new Date(payload.date_modified_gmt) : new Date();

  // 3. Upsert order
  const existingOrder = await prisma.order.findUnique({
    where: { wooOrderId },
    select: { id: true, status: true, dateModifiedGmt: true },
  });

  // Out-of-order check: don't overwrite newer record with older modified date
  if (existingOrder && existingOrder.dateModifiedGmt > dateModified) {
    logger.info(`Skipping stale order webhook #${wooOrderId}`);
    return;
  }

  const order = await prisma.order.upsert({
    where: { wooOrderId },
    create: {
      wooOrderId,
      orderNumber,
      customerId,
      status: payload.status || "processing",
      currency: payload.currency || "USD",
      total,
      subtotal,
      taxTotal,
      shippingTotal,
      discountTotal,
      paymentMethod: payload.payment_method_title || payload.payment_method || "",
      billingAddress: billing,
      shippingAddress: shipping,
      dateCreatedGmt: dateCreated,
      dateModifiedGmt: dateModified,
      rawPayload: payload,
    },
    update: {
      status: payload.status || undefined,
      total,
      subtotal,
      taxTotal,
      shippingTotal,
      discountTotal,
      billingAddress: billing,
      shippingAddress: shipping,
      dateModifiedGmt: dateModified,
      rawPayload: payload,
      customerId: customerId || undefined,
    },
  });

  // 4. Upsert line items if provided
  if (Array.isArray(payload.line_items) && payload.line_items.length > 0) {
    // Clean old items and insert fresh
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.createMany({
      data: payload.line_items.map((item) => ({
        orderId: order.id,
        wooItemId: item.id ? parseInt(item.id, 10) : null,
        wooProductId: item.product_id ? parseInt(item.product_id, 10) : null,
        productName: item.name || "Item",
        quantity: parseInt(item.quantity || "1", 10),
        unitPrice: parseFloat(item.price || "0"),
        totalPrice: parseFloat(item.total || "0"),
        sku: item.sku || null,
      })),
    });
  }

  // 5. Record order event audit log
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      source: "woo",
      eventType: topic || "order_webhook",
      fromState: existingOrder ? existingOrder.status : null,
      toState: order.status,
      payload: { total, currency: order.currency, itemsCount: payload.line_items?.length || 0 },
    },
  });

  // 6. Recalculate customer totalSpent & ordersCount if customer attached
  if (customerId) {
    const agg = await prisma.order.aggregate({
      where: { customerId },
      _sum: { total: true },
      _count: { id: true },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: agg._sum?.total || 0,
        ordersCount: agg._count?.id || 0,
        lastOrderAt: dateCreated,
      },
    });
  }
}

async function processCustomerPayload(payload) {
  if (!payload || !payload.email) return;

  const email = payload.email.toLowerCase().trim();
  const wooCustomerId = payload.id ? parseInt(payload.id, 10) : null;
  const firstName = payload.first_name || "";
  const lastName = payload.last_name || "";
  const billing = payload.billing || {};
  const shipping = payload.shipping || {};
  const phone = billing.phone || payload.phone || null;

  await prisma.customer.upsert({
    where: { email },
    create: {
      email,
      wooCustomerId,
      firstName,
      lastName,
      phone,
      billing,
      shipping,
      lastSyncedAt: new Date(),
    },
    update: {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
      billing: billing || undefined,
      shipping: shipping || undefined,
      lastSyncedAt: new Date(),
    },
  });
}

async function processNextEvents() {
  if (isRunning) return;
  isRunning = true;

  try {
    const pendingEvents = await prisma.webhookEvent.findMany({
      where: {
        status: "pending",
        nextAttemptAt: { lte: new Date() },
      },
      take: 10,
      orderBy: { createdAt: "asc" },
    });

    for (const event of pendingEvents) {
      try {
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: { status: "processing" },
        });

        const topic = event.topic || "";
        const payload = event.payload;

        if (topic.startsWith("order.")) {
          await processOrderPayload(payload, topic);
        } else if (topic.startsWith("customer.")) {
          await processCustomerPayload(payload);
        }

        // Mark successfully completed
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: "done",
            processedAt: new Date(),
          },
        });
      } catch (procErr) {
        logger.error(`Error processing webhook event ${event.id}: ${procErr.message}`);
        const nextAttempts = event.attempts + 1;
        const isDeadLetter = nextAttempts >= 5;

        // Exponential backoff: 2s, 4s, 8s, 16s...
        const backoffSeconds = Math.pow(2, nextAttempts);
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: isDeadLetter ? "failed" : "pending",
            attempts: nextAttempts,
            lastError: procErr.message,
            nextAttemptAt: isDeadLetter ? undefined : nextAttemptAt,
          },
        });
      }
    }
  } catch (err) {
    // Ignore routine polling connection drops
  } finally {
    isRunning = false;
  }
}

function startEventProcessor() {
  logger.info("[Worker] Webhook event queue processor started.");
  // Poll every 3 seconds
  timerId = setInterval(processNextEvents, 3000);
}

function stopEventProcessor() {
  if (timerId) clearInterval(timerId);
}

module.exports = { startEventProcessor, stopEventProcessor };
