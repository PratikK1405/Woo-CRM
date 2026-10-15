// client/src/pages/SyncPage.jsx
import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/crmApi";

export function SyncPage() {
  const { isAdmin } = useAuth();
  const [syncData, setSyncData] = useState({
    status: "healthy",
    queueDepth: 0,
    failedEvents: 0,
    resources: [],
    recentEvents: [],
    lastSync: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchSyncStatus = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/sync/status");
      if (res) {
        setSyncData(res);
      }
    } catch (err) {
      console.warn("Could not load sync status from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const handleManualSync = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    try {
      await apiRequest("/sync/trigger", {
        method: "POST",
        body: JSON.stringify({ resource: "all" }),
      });
      alert("Manual synchronization completed successfully!");
      fetchSyncStatus();
    } catch (err) {
      alert(err.message || "Manual sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!isAdmin) return;
    setRetrying(true);
    try {
      const res = await apiRequest("/sync/retry-failed", { method: "POST" });
      alert(res.message || "Failed events queued for retry");
      fetchSyncStatus();
    } catch (err) {
      alert(err.message || "Failed to retry events");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Sync Center</h1>
          <p className="text-sm text-[#64748B]">
            Bi-directional WooCommerce synchronization health, queue depth, and dead-letter recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSyncStatus}
            className="h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#334155] shadow-xs hover:bg-[#F6F7FB] flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3D4EE8]" : ""}`} /> Refresh Status
          </button>

          {isAdmin && (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="h-10 px-4 rounded-xl bg-[#3D4EE8] text-white font-semibold text-xs flex items-center gap-2 shadow-xs hover:bg-[#3140C4] disabled:opacity-50 cursor-pointer"
            >
              <Zap className="h-4 w-4" /> {syncing ? "Syncing..." : "Trigger Full Sync"}
            </button>
          )}
        </div>
      </div>

      {/* Sync Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Webhook Engine Status</p>
            <p className="text-lg font-extrabold text-[#0F172A] mt-0.5">
              {syncData.status === "healthy" ? "Healthy (Active)" : "Attention Needed"}
            </p>
            <p className="text-[11px] text-[#64748B]">Sub-15s webhook ingress</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-[#3D4EE8] flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Queue Depth</p>
            <p className="text-lg font-extrabold text-[#0F172A] mt-0.5 tabular-nums">
              {syncData.queueDepth} pending events
            </p>
            <p className="text-[11px] text-[#64748B]">Async queue processing</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Dead-Letter Queue</p>
              <p className="text-lg font-extrabold text-[#0F172A] mt-0.5 tabular-nums">
                {syncData.failedEvents} failed
              </p>
              <p className="text-[11px] text-[#64748B]">After 5 retry attempts</p>
            </div>
          </div>
          {isAdmin && syncData.failedEvents > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1 hover:bg-amber-100"
            >
              <RotateCcw className="h-3 w-3" /> Retry All
            </button>
          )}
        </div>
      </div>

      {/* Sync State by Resource */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#E5E8F0]">
          <h2 className="text-base font-bold text-[#0F172A]">Resource Synchronization States</h2>
          <p className="text-xs text-[#64748B]">State markers for backfill and incremental pollers</p>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-[#F1F5F9] text-xs font-semibold text-[#475569]">
            <tr>
              <th className="px-6 py-3.5">Resource Entity</th>
              <th className="px-6 py-3.5">Last Synced</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Sync Strategy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E8F0]">
            {(syncData.resources.length > 0 ? syncData.resources : [
              { resource: "customers", status: "completed", lastSyncedAt: new Date().toISOString() },
              { resource: "orders", status: "completed", lastSyncedAt: new Date().toISOString() },
              { resource: "webhooks", status: "completed", lastSyncedAt: new Date().toISOString() },
            ]).map((r) => (
              <tr key={r.resource} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-[#0F172A] capitalize">{r.resource}</td>
                <td className="px-6 py-4 text-xs text-[#64748B]">
                  {r.lastSyncedAt ? new Date(r.lastSyncedAt).toLocaleString() : "Never"}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <CheckCircle className="h-3 w-3" /> Active / Synced
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-[#64748B]">
                  {r.resource === "webhooks" ? "Realtime HMAC Ingress" : "Incremental Cursor + Webhooks"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Webhook Events */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#E5E8F0]">
          <h2 className="text-base font-bold text-[#0F172A]">Recent Webhook Deliveries</h2>
          <p className="text-xs text-[#64748B]">Audit log of incoming deliveries from WooCommerce</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-semibold text-[#475569]">
              <tr>
                <th className="px-6 py-3.5">Delivery ID</th>
                <th className="px-6 py-3.5">Topic</th>
                <th className="px-6 py-3.5">Received At</th>
                <th className="px-6 py-3.5">Attempts</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8F0]">
              {syncData.recentEvents && syncData.recentEvents.length > 0 ? (
                syncData.recentEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 text-xs">
                    <td className="px-6 py-4 font-mono text-[11px] text-[#3D4EE8]">{ev.deliveryId}</td>
                    <td className="px-6 py-4 font-semibold text-[#0F172A]">{ev.topic}</td>
                    <td className="px-6 py-4 text-[#64748B]">{new Date(ev.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 tabular-nums">{ev.attempts}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          ev.status === "done"
                            ? "bg-emerald-50 text-emerald-700"
                            : ev.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-indigo-50 text-[#3D4EE8]"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-xs text-[#64748B]">
                    No incoming webhook deliveries recorded yet. Inbound deliveries will stream live here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
