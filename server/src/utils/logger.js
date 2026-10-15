function formatLog(level, message, meta) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(log);
}

const logger = {
  info: (msg, meta) => console.log(formatLog("info", msg, meta)),
  warn: (msg, meta) => console.warn(formatLog("warn", msg, meta)),
  error: (msg, meta) => console.error(formatLog("error", msg, meta)),
};

module.exports = { logger };
