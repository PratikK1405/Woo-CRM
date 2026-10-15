// client/src/pages/OrdersPage.jsx
import React, { useState, useEffect } from "react";
import {
  Download,
  Filter,
  Search,
  RefreshCw,
  X,
  Truck,
  FileText,
  Clock,
  Send,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "../api/crmApi";
import { StatusPill } from "../components/ui/StatusPill";

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await apiRequest(`/orders?${params.toString()}`);
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch orders from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleOpenDetail = async (orderId) => {
    setDetailLoading(true);
    try {
      const ord = await apiRequest(`/orders/${orderId}`);
      setSelectedOrder(ord);
      setTrackingNumberInput(ord.trackingNumber || "");
      setCarrierInput(ord.carrier || "");
    } catch (err) {
      console.error("Failed to load order details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiRequest(`/orders/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          trackingNumber: trackingNumberInput,
          carrier: carrierInput,
        }),
      });
      setSelectedOrder(updated);
      fetchOrders();
    } catch (err) {
      alert(err.message || "Could not update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      const newNote = await apiRequest(`/orders/${selectedOrder.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: noteContent.trim() }),
      });
      setSelectedOrder((prev) => ({
        ...prev,
        notes: [newNote, ...(prev.notes || [])],
      }));
      setNoteContent("");
    } catch (err) {
      alert(err.message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Orders</h1>
          <p className="text-sm text-[#64748B]">Manage fulfillments, tracking, and write-backs to WooCommerce.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#334155] shadow-xs hover:bg-[#F6F7FB] flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3D4EE8]" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E8F0] flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer name, email..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:border-[#3D4EE8]"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-[#64748B]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155] focus:border-[#3D4EE8] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-semibold text-[#475569]">
              <tr>
                <th className="px-6 py-3.5">Order #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5 text-right">Total</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Tracking</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8F0]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-[#64748B]">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#3D4EE8] border-t-transparent mb-2" />
                    <p>Loading orders from database...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-[#64748B]">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const customerName = o.customer
                    ? `${o.customer.firstName} ${o.customer.lastName}`.trim() || o.customer.email
                    : "Guest Checkout";
                  const itemsCount = Array.isArray(o.lineItems) ? o.lineItems.length : 1;
                  const dateStr = o.wooCreatedAt
                    ? new Date(o.wooCreatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => handleOpenDetail(o.id)}
                      className="hover:bg-[#EEF1FF]/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-[#3D4EE8]">#{o.number || o.wooOrderId}</td>
                      <td className="px-6 py-4 font-semibold text-[#0F172A]">
                        <p>{customerName}</p>
                        <p className="text-xs font-normal text-[#64748B]">{o.customer?.email || ""}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#475569]">{itemsCount} item{itemsCount > 1 ? "s" : ""}</td>
                      <td className="px-6 py-4 text-right font-bold tabular-nums text-[#0F172A]">
                        {Number(o.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {o.currency || "EUR"}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#64748B]">{dateStr}</td>
                      <td className="px-6 py-4 text-xs">
                        {o.trackingNumber ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            <Truck className="h-3 w-3" /> {o.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={o.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Fulfillment Slide-over / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E5E8F0] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    Order #{selectedOrder.number || selectedOrder.wooOrderId}
                  </h2>
                  <StatusPill status={selectedOrder.status} />
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  Placed on {new Date(selectedOrder.wooCreatedAt || selectedOrder.createdAt).toLocaleString()} via{" "}
                  {selectedOrder.paymentMethodTitle || "Card"}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Customer Info Card */}
              <div className="rounded-xl border border-[#E5E8F0] p-4 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Customer</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                    {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}
                  </p>
                  <p className="text-xs text-[#64748B]">{selectedOrder.customer?.email}</p>
                  {selectedOrder.customer?.phone && (
                    <p className="text-xs text-[#64748B]">{selectedOrder.customer.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Total Amount</p>
                  <p className="text-lg font-extrabold text-[#3D4EE8] mt-0.5">
                    {Number(selectedOrder.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                    {selectedOrder.currency || "EUR"}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Ordered Items
                </h3>
                <div className="rounded-xl border border-[#E5E8F0] divide-y divide-[#E5E8F0] overflow-hidden">
                  {Array.isArray(selectedOrder.lineItems) && selectedOrder.lineItems.length > 0 ? (
                    selectedOrder.lineItems.map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#0F172A]">{item.name}</p>
                          {item.sku && <p className="text-[10px] text-[#64748B]">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#0F172A]">
                            {item.quantity} × {item.price} {selectedOrder.currency}
                          </p>
                          <p className="text-[11px] font-bold text-[#3D4EE8]">{item.total} {selectedOrder.currency}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#64748B]">No items listed</div>
                  )}
                </div>
              </div>

              {/* Status Update & Tracking Number */}
              <div className="rounded-xl border border-[#E5E8F0] p-4 space-y-4 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" /> Fulfillment & Write-back
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      placeholder="e.g. FR982348210"
                      className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">Carrier</label>
                    <input
                      type="text"
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      placeholder="e.g. DHL Express, Chronopost"
                      className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-[#64748B] font-medium mr-1">Update Status:</span>
                  {["processing", "completed", "pending", "refunded"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus || selectedOrder.status === st}
                      onClick={() => handleStatusUpdate(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                        selectedOrder.status === st
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-indigo-50 text-[#3D4EE8] hover:bg-[#3D4EE8] hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Notes Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Order Notes & Timeline
                </h3>

                <form onSubmit={handleAddNote} className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add an internal note or customer comment..."
                    className="flex-1 h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
                  />
                  <button
                    type="submit"
                    disabled={savingNote || !noteContent.trim()}
                    className="h-9 px-3.5 rounded-lg bg-[#3D4EE8] text-white text-xs font-semibold flex items-center gap-1 hover:bg-[#3140C4] disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" /> Add Note
                  </button>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedOrder.notes && selectedOrder.notes.length > 0 ? (
                    selectedOrder.notes.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-slate-50 text-xs text-[#334155] border border-slate-100">
                        <p>{n.body}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">
                          {n.author?.fullName || "System"} • {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94A3B8] italic">No notes recorded for this order.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
