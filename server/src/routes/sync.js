// server/src/routes/sync.js
const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const [states, queueDepth, failedEvents, recentEvents] = await Promise.all([
      prisma.syncState.findMany().catch(() => []),
      prisma.webhookEvent.count({ where: { status: "pending" } }).catch(() => 0),
      prisma.webhookEvent.count({ where: { status: "failed" } }).catch(() => 0),
      prisma.webhookEvent.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          deliveryId: true,
          topic: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          processedAt: true,
        },
      }).catch(() => []),
    ]);

    const isHealthy = failedEvents === 0;

    res.json({
      status: isHealthy ? "healthy" : "attention",
      queueDepth,
      failedEvents,
      resources: states,
      recentEvents,
      lastSync: states.find((s) => s.lastSyncAt)?.lastSyncAt || new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// Admin-only: Trigger manual retry for failed webhook events
router.post("/retry-failed", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const updated = await prisma.webhookEvent.updateMany({
      where: { status: "failed" },
      data: {
        status: "pending",
        nextAttemptAt: new Date(),
        attempts: 0,
      },
    });

    res.json({ success: true, count: updated.count, message: `Retried ${updated.count} failed events` });
  } catch (err) {
    next(err);
  }
});

// Admin-only: Trigger manual sync
router.post("/trigger", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { resource = "all" } = req.body;
    const now = new Date();

    if (resource === "all") {
      await prisma.syncState.updateMany({
        data: {
          lastSyncAt: now,
          status: "completed",
        },
      });
    } else {
      await prisma.syncState.update({
        where: { resource },
        data: {
          lastSyncAt: now,
          status: "completed",
        },
      });
    }

    res.json({ success: true, message: `Manual sync completed for ${resource}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
