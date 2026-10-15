const express = require("express");
const router = express.Router();
const { wooWebhookMiddleware } = require("../middleware/wooWebhook");
const { prisma } = require("../config/prisma");

router.post("/woo", wooWebhookMiddleware, async (req, res, next) => {
  const { deliveryId, topic, resourceId } = req.webhookMeta;
  const payload = req.body;

  try {
    // Idempotent upsert on deliveryId (INT-3)
    await prisma.webhookEvent.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        topic,
        wooResourceId: resourceId ? parseInt(resourceId, 10) : null,
        payload,
      },
      update: {}, // duplicate delivery: no-op
    });

    // Immediate 200 response
    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
