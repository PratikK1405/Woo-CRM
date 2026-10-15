const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding message templates...");
  const templates = [
    {
      slug: "order-confirmation",
      name: "Order Confirmation",
      subject: "Your order #{{order.number}} has been received",
      body: "Hi {{customer.first_name}},\n\nThank you for your order! We are currently processing it.\n\nTotal: {{order.total}} {{order.currency}}",
      isMarketing: false,
    },
    {
      slug: "order-shipped",
      name: "Order Shipped",
      subject: "Your order #{{order.number}} is on the way!",
      body: "Hi {{customer.first_name}},\n\nYour order has shipped!\nCarrier: {{order.carrier}}\nTracking: {{order.tracking_number}}",
      isMarketing: false,
    },
    {
      slug: "review-request",
      name: "Review Request",
      subject: "How was your recent purchase?",
      body: "Hi {{customer.first_name}},\n\nWe hope you love your order! Would you mind leaving us a quick review?",
      isMarketing: true,
    },
    {
      slug: "win-back",
      name: "Customer Win-Back",
      subject: "We miss you at our store!",
      body: "Hi {{customer.first_name}},\n\nIt's been a while since your last visit. Check out our new arrivals with code WELCOMEBACK10.",
      isMarketing: true,
    },
    {
      slug: "high-value-order-alert",
      name: "High Value Order Internal Alert",
      subject: "High-value order #{{order.number}} placed",
      body: "Notice: Order #{{order.number}} was placed with a total of {{order.total}} {{order.currency}}.",
      isMarketing: false,
    },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.upsert({
      where: { slug: t.slug },
      create: t,
      update: t,
    });
  }

  console.log("Seeding starter workflows...");
  const workflows = [
    {
      systemKey: "starter-order-confirmation",
      name: "Send Order Confirmation",
      description: "Automatically email customer when an order is created",
      triggerType: "order_created",
      triggerConfig: {},
      delayMinutes: 0,
      conditions: [],
      actions: [{ type: "send_email", templateSlug: "order-confirmation" }],
      enabled: true,
    },
    {
      systemKey: "starter-order-shipped",
      name: "Send Tracking Notice",
      description: "Email tracking details when status moves to shipped/completed",
      triggerType: "order_status_changed",
      triggerConfig: { toStatus: "completed" },
      delayMinutes: 0,
      conditions: [],
      actions: [{ type: "send_email", templateSlug: "order-shipped" }],
      enabled: true,
    },
    {
      systemKey: "starter-win-back",
      name: "90-Day Lapsed Winback",
      description: "Send re-engagement email to inactive customers",
      triggerType: "customer_inactive",
      triggerConfig: { inactiveDays: 90 },
      delayMinutes: 0,
      conditions: [{ field: "marketing_opt_in", operator: "equals", value: true }],
      actions: [{ type: "send_email", templateSlug: "win-back" }],
      enabled: false,
    },
  ];

  for (const w of workflows) {
    await prisma.workflow.upsert({
      where: { systemKey: w.systemKey },
      create: w,
      update: w,
    });
  }

  console.log("Seeding sync state defaults...");
  for (const resource of ["customers", "orders", "webhooks"]) {
    await prisma.syncState.upsert({
      where: { resource },
      create: { resource, status: "completed", lastSyncedAt: new Date() },
      update: { lastSyncedAt: new Date() },
    });
  }

  console.log("Seeding realistic demo customers & orders...");
  const demoCustomers = [
    {
      email: "elodie.martin@example.fr",
      firstName: "Élodie",
      lastName: "Martin",
      phone: "+33 6 12 34 56 78",
      totalSpent: 1480.0,
      orderCount: 3,
      marketingOptIn: true,
      tags: ["VIP", "Repeat Buyer"],
      billing: { city: "Paris", country: "FR", address_1: "15 Rue de Rivoli" },
      shipping: { city: "Paris", country: "FR", address_1: "15 Rue de Rivoli" },
    },
    {
      email: "t.dubois@company.eu",
      firstName: "Thomas",
      lastName: "Dubois",
      phone: "+33 6 98 76 54 32",
      totalSpent: 498.0,
      orderCount: 2,
      marketingOptIn: false,
      tags: ["B2B"],
      billing: { city: "Lyon", country: "FR", address_1: "42 Cours Lafayette" },
      shipping: { city: "Lyon", country: "FR", address_1: "42 Cours Lafayette" },
    },
    {
      email: "sophie.b@gmail.com",
      firstName: "Sophie",
      lastName: "Bernard",
      phone: "+33 7 11 22 33 44",
      totalSpent: 1450.0,
      orderCount: 1,
      marketingOptIn: true,
      tags: ["Enterprise"],
      billing: { city: "Marseille", country: "FR", address_1: "8 Quai du Port" },
      shipping: { city: "Marseille", country: "FR", address_1: "8 Quai du Port" },
    },
    {
      email: "julien@moreau-tech.fr",
      firstName: "Julien",
      lastName: "Moreau",
      phone: "+33 6 55 44 33 22",
      totalSpent: 189.0,
      orderCount: 2,
      marketingOptIn: false,
      tags: ["Tech"],
      billing: { city: "Bordeaux", country: "FR", address_1: "12 Rue Sainte-Catherine" },
      shipping: { city: "Bordeaux", country: "FR", address_1: "12 Rue Sainte-Catherine" },
    },
    {
      email: "claire.fontaine@outlook.com",
      firstName: "Claire",
      lastName: "Fontaine",
      phone: "+33 6 44 33 22 11",
      totalSpent: 520.0,
      orderCount: 1,
      marketingOptIn: true,
      tags: ["New"],
      billing: { city: "Nantes", country: "FR", address_1: "5 Rue Crébillon" },
      shipping: { city: "Nantes", country: "FR", address_1: "5 Rue Crébillon" },
    },
  ];

  const createdCustomers = [];
  for (const c of demoCustomers) {
    const cust = await prisma.customer.upsert({
      where: { email: c.email },
      create: c,
      update: c,
    });
    createdCustomers.push(cust);
  }

  const demoOrders = [
    {
      wooOrderId: 5281,
      number: "5281",
      customerId: createdCustomers[0].id,
      status: "processing",
      currency: "EUR",
      total: 980.0,
      subtotal: 900.0,
      taxTotal: 80.0,
      paymentMethod: "stripe",
      paymentMethodTitle: "Stripe Credit Card",
      wooCreatedAt: new Date(),
      wooModifiedAt: new Date(),
      lineItems: [
        { name: "Suite Pro License", quantity: 1, price: 850.0, total: 850.0, sku: "PRO-SUITE" },
        { name: "Priority Support Add-on", quantity: 1, price: 130.0, total: 130.0, sku: "SUPPORT-ADDON" },
      ],
    },
    {
      wooOrderId: 5280,
      number: "5280",
      customerId: createdCustomers[1].id,
      status: "completed",
      currency: "EUR",
      total: 249.0,
      subtotal: 220.0,
      taxTotal: 29.0,
      trackingNumber: "FR982348210",
      carrier: "DHL Express",
      paymentMethod: "paypal",
      paymentMethodTitle: "PayPal",
      wooCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      wooModifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lineItems: [
        { name: "Standard License", quantity: 1, price: 249.0, total: 249.0, sku: "STD-LIC" },
      ],
    },
    {
      wooOrderId: 5279,
      number: "5279",
      customerId: createdCustomers[2].id,
      status: "pending",
      currency: "EUR",
      total: 1450.0,
      subtotal: 1350.0,
      taxTotal: 100.0,
      paymentMethod: "bacs",
      paymentMethodTitle: "Bank Transfer",
      wooCreatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      wooModifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      lineItems: [
        { name: "Enterprise Annual Subscription", quantity: 1, price: 1450.0, total: 1450.0, sku: "ENT-ANNUAL" },
      ],
    },
    {
      wooOrderId: 5278,
      number: "5278",
      customerId: createdCustomers[3].id,
      status: "refunded",
      currency: "EUR",
      total: 89.0,
      subtotal: 89.0,
      taxTotal: 0.0,
      paymentMethod: "stripe",
      paymentMethodTitle: "Stripe",
      wooCreatedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      wooModifiedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      lineItems: [
        { name: "Starter Kit Essentials", quantity: 1, price: 89.0, total: 89.0, sku: "START-KIT" },
      ],
    },
    {
      wooOrderId: 5277,
      number: "5277",
      customerId: createdCustomers[4].id,
      status: "completed",
      currency: "EUR",
      total: 520.0,
      subtotal: 480.0,
      taxTotal: 40.0,
      trackingNumber: "CH394821092",
      carrier: "Chronopost",
      paymentMethod: "applepay",
      paymentMethodTitle: "Apple Pay",
      wooCreatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      wooModifiedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      lineItems: [
        { name: "Developer Pack + Docs", quantity: 2, price: 260.0, total: 520.0, sku: "DEV-PACK" },
      ],
    },
  ];

  for (const o of demoOrders) {
    const { subtotal, ...orderData } = o;
    const order = await prisma.order.upsert({
      where: { wooOrderId: orderData.wooOrderId },
      create: orderData,
      update: orderData,
    });

    // Seed sample order note
    await prisma.note.deleteMany({ where: { orderId: order.id } });
    await prisma.note.create({
      data: {
        orderId: order.id,
        body: `Order received and confirmed via ${orderData.paymentMethodTitle}`,
        isCustomerVisible: false,
      },
    });

    // Seed sample order event
    await prisma.orderEvent.deleteMany({ where: { orderId: order.id } });
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        source: "woo",
        toStatus: order.status,
      },
    });
  }

  // Seed sample customer note
  await prisma.note.deleteMany({ where: { customerId: createdCustomers[0].id } });
  await prisma.note.create({
    data: {
      customerId: createdCustomers[0].id,
      body: "High-tier client interested in enterprise volume licensing expansion for Q4.",
      isCustomerVisible: false,
    },
  });

  console.log("Database seeded successfully with live operational data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
