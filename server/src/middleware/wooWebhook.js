const { verifyWooWebhookSignature } = require("../utils/hmac");
const env = require("../config/env");

function wooWebhookMiddleware(req, res, next) {
  const signature = req.headers["x-wc-webhook-signature"];
  const deliveryId = req.headers["x-wc-webhook-delivery-id"];
  const topic = req.headers["x-wc-webhook-topic"];

  if (!signature || !deliveryId) {
    return res.status(401).json({ error: "Missing WooCommerce webhook headers" });
  }

  const isValid = verifyWooWebhookSignature(req.rawBody, signature, env.woo.webhookSecret);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  req.webhookMeta = { deliveryId, topic, resourceId: req.headers["x-wc-webhook-resource-id"] };
  next();
}

module.exports = { wooWebhookMiddleware };
