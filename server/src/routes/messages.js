// server/src/routes/messages.js
const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

// GET /api/v1/messages - Message log with customer, order and template info
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "25", 10);
    const skip = (page - 1) * limit;

    const [messages, total, templates] = await Promise.all([
      prisma.message.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          order: true,
          template: true,
        },
      }).catch(() => []),
      prisma.message.count().catch(() => 0),
      prisma.messageTemplate.findMany().catch(() => []),
    ]);

    res.json({
      data: messages,
      templates,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/messages - Send or queue transactional message to customer
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { customerId, orderId, templateSlug, subject, body, recipient } = req.body;

    if (!customerId && !recipient) {
      return res.status(400).json({ error: "Customer ID or recipient is required" });
    }

    let customer = null;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
    }

    const targetRecipient = recipient || customer?.email;
    if (!targetRecipient) {
      return res.status(400).json({ error: "Target recipient email is required" });
    }

    let templateId = null;
    if (templateSlug) {
      const template = await prisma.messageTemplate.findUnique({ where: { slug: templateSlug } });
      if (template) templateId = template.id;
    }

    const message = await prisma.message.create({
      data: {
        customerId: customer?.id || customerId,
        orderId: orderId || null,
        templateId,
        channel: "email",
        toAddress: targetRecipient,
        subject: subject || "Customer Notification",
        body: body || "",
        status: "sent",
        sentAt: new Date(),
      },
      include: { customer: true, template: true },
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
