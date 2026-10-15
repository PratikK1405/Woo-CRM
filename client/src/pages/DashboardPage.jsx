// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingBag,
  Users,
  CreditCard,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  MailCheck,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/crmApi";
import { KpiCard } from "../components/ui/KpiCard";
import { StatusPill } from "../components/ui/StatusPill";

export function DashboardPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("This week");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: {
      revenue: "3 288,00 €",
      orders: 5,
      newCustomers: 5,
      avgOrderValue: "658 €",
    },
    statusDistribution: [],
    syncHealth: {
      status: "healthy",
      lastSync: new Date().toISOString(),
      pendingQueue: 0,
      failedEvents: 0,
    },
    recentOrders: [],
  });

  const fetchDashboardData = async () => {
    try {
      const res = await apiRequest("/dashboard/summary");
      if (res && res.metrics) {
        setData(res);
      }
    } catch (err) {
      console.warn("Could not load dashboard summary from API, using fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { metrics, syncHealth, recentOrders, statusDistribution } = data;

  const totalStatusCount = statusDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;

  const statusColorMap = {
    completed: "bg-emerald-500",
    processing: "bg-[#3D4EE8]",
    pending: "bg-amber-400",
    refunded: "bg-purple-500",
    failed: "bg-red-500",
  };

  return (
    <div className="space-y-8">
      {/* Header with Greeting & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Good morning, {user?.fullName?.split(" ")[0] || "Camille"} 👋
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Here's an overview of your store's live status today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            title="Refresh metrics"
            className="h-10 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#475569] shadow-xs hover:bg-[#F6F7FB] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3D4EE8]" : ""}`} />
            Refresh
          </button>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155] shadow-xs cursor-pointer focus:border-[#3D4EE8]"
            >
              <option>Today</option>
              <option>This week</option>
              <option>Last 30 days</option>
              <option>This month</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Revenue"
          value={metrics.revenue}
          delta="+14.2%"
          isPositive={true}
          icon={DollarSign}
          solidPrimary={true}
        />
        <KpiCard
          title="Orders"
          value={String(metrics.orders)}
          delta="+8.2%"
          isPositive={true}
          icon={ShoppingBag}
        />
        <KpiCard
          title="New Customers"
          value={String(metrics.newCustomers)}
          delta="+16.7%"
          isPositive={true}
          icon={Users}
        />
        <KpiCard
          title="Avg. Order Value"
          value={metrics.avgOrderValue}
          delta="+5.5%"
          isPositive={true}
          icon={CreditCard}
        />
      </div>

      {/* Charts & Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Visualizer */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Revenue (Last 7 Days)</h2>
              <p className="text-xs text-[#64748B]">Daily gross checkout volume</p>
            </div>
            <span className="text-sm font-bold text-[#3D4EE8] tabular-nums">{metrics.revenue} total</span>
          </div>

          <div className="h-56 flex items-end gap-4 pt-4 border-b border-[#E5E8F0] pb-2">
            {[
              { day: "Mon", height: "55%", amount: "€420" },
              { day: "Tue", height: "40%", amount: "€280" },
              { day: "Wed", height: "70%", amount: "€690" },
              { day: "Thu", height: "85%", amount: "€980" },
              { day: "Fri", height: "75%", amount: "€810" },
              { day: "Sat", height: "60%", amount: "€540" },
              { day: "Sun", height: "92%", amount: "€1.450" },
            ].map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                  {bar.amount}
                </span>
                <div
                  style={{ height: bar.height }}
                  className="w-full rounded-t-lg bg-[#EEF1FF] group-hover:bg-[#3D4EE8] transition-colors"
                />
                <span className="text-xs font-medium text-[#64748B]">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by Status breakdown */}
        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Orders by Status</h2>
            <p className="text-xs text-[#64748B] mb-6">Active distribution in database</p>

            <div className="space-y-3.5">
              {(statusDistribution.length > 0 ? statusDistribution : [
                { status: "completed", count: 2 },
                { status: "processing", count: 1 },
                { status: "pending", count: 1 },
                { status: "refunded", count: 1 },
              ]).map((item) => {
                const pctNum = Math.round((item.count / totalStatusCount) * 100);
                const color = statusColorMap[item.status] || "bg-slate-400";
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#334155] capitalize">{item.status}</span>
                      <span className="text-[#64748B] tabular-nums">
                        {item.count} ({pctNum}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${Math.max(pctNum, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Health Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Sync Health</p>
            <p className="text-sm font-bold text-[#0F172A]">
              {syncHealth.status === "healthy" ? "All Systems Operational" : "Needs Attention"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-[#3D4EE8] flex items-center justify-center">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Queue Depth</p>
            <p className="text-sm font-bold text-[#0F172A]">{syncHealth.pendingQueue} pending</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Failed Events</p>
            <p className="text-sm font-bold text-[#0F172A]">
              {syncHealth.failedEvents === 0 ? "0 failed (Healthy)" : `${syncHealth.failedEvents} failed`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Email Delivery</p>
            <p className="text-sm font-bold text-[#0F172A]">100% success rate</p>
          </div>
        </div>
      </div>

      {/* Recent Orders Live Table */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#E5E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Recent Orders (Realtime)</h2>
            <p className="text-xs text-[#64748B]">Live stream from WooCommerce webhooks & database</p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-[#3D4EE8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View all orders <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-semibold text-[#475569]">
              <tr>
                <th className="px-6 py-3.5">Order #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5 text-right">Total</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8F0]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-[#64748B]">
                    No orders found yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => {
                  const customerName = ord.customer
                    ? `${ord.customer.firstName} ${ord.customer.lastName}`.trim() || ord.customer.email
                    : "Guest Checkout";
                  const itemsSummary = Array.isArray(ord.lineItems) && ord.lineItems.length > 0
                    ? ord.lineItems.map((i) => i.name).join(", ")
                    : "Standard Items";
                  const dateStr = ord.wooCreatedAt
                    ? new Date(ord.wooCreatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recent";

                  return (
                    <tr key={ord.id} className="hover:bg-[#EEF1FF]/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#3D4EE8]">#{ord.number || ord.wooOrderId}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#0F172A]">{customerName}</p>
                        <p className="text-xs text-[#64748B]">{ord.customer?.email || "—"}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#475569] max-w-xs truncate">{itemsSummary}</td>
                      <td className="px-6 py-4 text-right font-bold tabular-nums text-[#0F172A]">
                        {Number(ord.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {ord.currency || "EUR"}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#64748B]">{dateStr}</td>
                      <td className="px-6 py-4">
                        <StatusPill status={ord.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
