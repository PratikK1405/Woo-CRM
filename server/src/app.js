// server/src/app.js
const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/errors");

const app = express();

app.use(cors());

// Capture raw body for webhook HMAC validation
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Webhooks
app.use("/webhooks", require("./routes/webhooks"));

// Versioned API: /api/v1/...
const v1Router = express.Router();
v1Router.use("/auth", require("./routes/auth"));
v1Router.use("/customers", require("./routes/customers"));
v1Router.use("/orders", require("./routes/orders"));
v1Router.use("/workflows", require("./routes/workflows"));
v1Router.use("/messages", require("./routes/messages"));
v1Router.use("/sync", require("./routes/sync"));
v1Router.use("/dashboard", require("./routes/dashboard"));

app.use("/api/v1", v1Router);
// Backward-compatibility alias
app.use("/api", v1Router);

// Central error handler
app.use(errorHandler);

module.exports = app;
