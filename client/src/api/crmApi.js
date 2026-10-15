import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function apiRequest(endpoint, options = {}) {
  let token = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch (err) {
    // Supabase auth unavailable or offline
  }

  // If in demo mode without active Supabase session, use demo bearer token
  if (!token) {
    const cachedDemo = localStorage.getItem("woo_crm_demo_user");
    if (cachedDemo) {
      try {
        const demoUser = JSON.parse(cachedDemo);
        token = demoUser.role === "admin" ? "demo-admin-token" : "demo-agent-token";
      } catch (e) {}
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const cleanBase = BASE_URL.replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const response = await fetch(`${cleanBase}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
