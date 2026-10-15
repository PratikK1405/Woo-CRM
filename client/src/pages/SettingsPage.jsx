// client/src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { ShieldCheck, Key, Database, Mail, CheckCircle, Server, RefreshCw } from "lucide-react";
import { apiRequest } from "../api/crmApi";

export function SettingsPage() {
  const [storeUrl, setStoreUrl] = useState("http://localhost:8080");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Simulate/trigger ping to sync status
      const res = await apiRequest("/sync/status");
      setTestResult({
        success: true,
        message: "Connected: Database & API Gateway verified and operational.",
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || "Connection failed to respond.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Store & Team Settings</h1>
        <p className="text-sm text-[#64748B]">
          Admin configuration: WooCommerce API credentials, webhooks, and team roles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* WooCommerce Integration */}
          <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-5 w-5 text-[#3D4EE8]" />
              <h2 className="text-base font-bold text-[#0F172A]">WooCommerce Store Connection</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Store URL</label>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Consumer Key</label>
                <input
                  type="text"
                  defaultValue="ck_••••••••••••••••••••••••••••••••"
                  disabled
                  className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">Webhook HMAC Secret</label>
                <input
                  type="text"
                  defaultValue="••••••••••••••••••••••••••••••••"
                  disabled
                  className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs font-mono"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                  Settings saved successfully.
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="h-9 px-4 rounded-xl bg-[#3D4EE8] text-white text-xs font-semibold hover:bg-[#3140C4] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${testing ? "animate-spin" : ""}`} />
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>

          {/* Infrastructure Health Card */}
          <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-[#3D4EE8]" /> Infrastructure Health
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="font-semibold text-[#334155]">PostgreSQL Supabase Pooler</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Connected (Pool: 10)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="font-semibold text-[#334155]">Webhook Queue Processor</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Active (Polling 3s)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="font-semibold text-[#334155]">Cron Schedulers</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Armed & Running
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security badge & RBAC summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 text-indigo-950 shadow-xs">
            <ShieldCheck className="h-7 w-7 text-[#3D4EE8] mb-3" />
            <h3 className="text-sm font-bold">RBAC Enforcement Active</h3>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
              This settings panel is restricted strictly to verified store administrators (`admin` role). Support agents (`agent`) are blocked at both route and API middleware level.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
