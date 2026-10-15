require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  woo: {
    storeUrl: process.env.WOO_STORE_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    webhookSecret: process.env.WOO_WEBHOOK_SECRET,
  },
  encryptionKey: process.env.APP_ENCRYPTION_KEY,
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "2525", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || "no-reply@crm.local",
  },
};
