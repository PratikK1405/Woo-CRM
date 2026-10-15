const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation failed", details: err.errors });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
}

module.exports = { errorHandler };
