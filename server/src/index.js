const app = require("./app");
const env = require("./config/env");
const { logger } = require("./utils/logger");
const { startEventProcessor } = require("./workers/eventProcessor");
const { scheduleJobs } = require("./jobs/scheduledTriggers");

const server = app.listen(env.port, () => {
  logger.info(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
  
  // Start background queue worker
  startEventProcessor();

  // Start cron scheduled tasks
  scheduleJobs();
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => process.exit(0));
});
