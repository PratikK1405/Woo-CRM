const crypto = require("crypto");

/**
 * Verifies WooCommerce Webhook HMAC-SHA256 signature against raw request body
 */
function verifyWooWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

module.exports = { verifyWooWebhookSignature };
