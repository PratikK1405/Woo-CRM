// server/src/jobs/scheduledTriggers.js
const cron = require("node-cron");
const { prisma } = require("../config/prisma");
const { logger } = require("../utils/logger");

function scheduleJobs() {
  logger.info("[Jobs] Scheduled trigger scheduler initialized.");

  // Run health check and lapsed customer evaluator every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      logger.info("[Jobs] Running scheduled customer inactivity & sync checks...");

      // 1. Check active workflows with trigger 'customer_inactive'
      const inactiveWorkflows = await prisma.workflow.findMany({
        where: {
          enabled: true,
          triggerType: "customer_inactive",
        },
      });

      for (const wf of inactiveWorkflows) {
        const days = wf.triggerConfig?.inactiveDays || 90;
        const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Find customers whose last order was before the threshold date
        const lapsedCustomers = await prisma.customer.findMany({
          where: {
            marketingOptIn: true,
            lastOrderAt: { lte: thresholdDate },
          },
          take: 20,
        });

        logger.info(`[Jobs] Found ${lapsedCustomers.length} lapsed customers for workflow "${wf.name}"`);
      }

      // 2. Ensure sync state heartbeat
      await prisma.syncState.upsert({
        where: { resource: "health_check" },
        create: { resource: "health_check", status: "ok", lastSyncAt: new Date() },
        update: { status: "ok", lastSyncAt: new Date() },
      });
    } catch (err) {
      logger.error(`[Jobs] Cron scheduler error: ${err.message}`);
    }
  });
}

module.exports = { scheduleJobs };
