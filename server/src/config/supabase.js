const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

if (!env.supabase.url || !env.supabase.serviceRoleKey) {
  console.warn("Supabase credentials missing in environment variables.");
}

const supabaseAdmin = createClient(
  env.supabase.url || "http://localhost",
  env.supabase.serviceRoleKey || "dummy-key",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabaseAdmin };
