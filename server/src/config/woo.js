const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const env = require("./env");

function getWooClient() {
  if (!env.woo.storeUrl || !env.woo.consumerKey || !env.woo.consumerSecret) {
    throw new Error("WooCommerce credentials not configured.");
  }
  return new WooCommerceRestApi({
    url: env.woo.storeUrl,
    consumerKey: env.woo.consumerKey,
    consumerSecret: env.woo.consumerSecret,
    version: "wc/v3",
    queryStringAuth: true,
  });
}

module.exports = { getWooClient };
