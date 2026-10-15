// client/src/pages/CustomersPage.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  RefreshCw,
  X,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  Send,
  Tag,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "../api/crmApi";
import { StatusPill } from "../components/ui/StatusPill";

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await apiRequest(`/customers?${params.toString()}`);
      if (res && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch customers from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleOpenDetail = async (customerId) => {
    setDetailLoading(true);
    try {
      const cust = await apiRequest(`/customers/${customerId}`);
      setSelectedCustomer(cust);
    } catch (err) {
      console.error("Failed to load customer details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      const newNote = await apiRequest(`/customers/${selectedCustomer.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: noteContent.trim() }),
      });
      setSelectedCustomer((prev) => ({
        ...prev,
        notes: [newNote, ...(prev.notes || [])],
      }));
      setNoteContent("");
      fetchCustomers();
    } catch (err) {
      alert(err.message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Customer 360</h1>
          <p className="text-sm text-[#64748B]">
            Unified customer profiles, order history, communication notes, and segmentation.
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#334155] shadow-xs hover:bg-[#F6F7FB] flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3D4EE8]" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E8F0]">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, or phone number..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:border-[#3D4EE8]"
            />
          </form>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-semibold text-[#475569]">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Phone</th>
                <th className="px-6 py-3.5 text-right">Orders</th>
                <th className="px-6 py-3.5 text-right">Total Spent</th>
                <th className="px-6 py-3.5">Tags</th>
                <th className="px-6 py-3.5">Marketing</th>
                <th className="px-6 py-3.5">Customer Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8F0]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-[#64748B]">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#3D4EE8] border-t-transparent mb-2" />
                    <p>Loading customers from database...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-[#64748B]">
                    No customers found matching "{search}".
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const fullName = `${c.firstName} ${c.lastName}`.trim() || c.email;
                  const dateStr = c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenDetail(c.id)}
                      className="hover:bg-[#EEF1FF]/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#EEF1FF] text-[#3D4EE8] font-bold text-xs flex items-center justify-center uppercase shrink-0">
                            {c.firstName ? c.firstName[0] : c.email[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{fullName}</p>
                            <p className="text-xs text-[#64748B]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#64748B]">{c.phone || "—"}</td>
                      <td className="px-6 py-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {c._count?.orders ?? c.orderCount ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right font-bold tabular-nums text-[#3D4EE8]">
                        {Number(c.totalSpent).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(c.tags) && c.tags.length > 0 ? (
                            c.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {c.marketingOptIn ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Subscribed
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Opt-out
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#64748B]">{dateStr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E5E8F0] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#3D4EE8] text-white font-bold text-base flex items-center justify-center uppercase shadow-xs">
                  {selectedCustomer.firstName ? selectedCustomer.firstName[0] : "C"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h2>
                  <p className="text-xs text-[#64748B] flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedCustomer.email}</span>
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedCustomer.phone}</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Financial Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E5E8F0] bg-slate-50/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Total Spent</p>
                  <p className="text-base font-extrabold text-[#3D4EE8] mt-1 tabular-nums">
                    {Number(selectedCustomer.totalSpent).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E5E8F0] bg-slate-50/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Orders Placed</p>
                  <p className="text-base font-extrabold text-[#0F172A] mt-1 tabular-nums">
                    {selectedCustomer.orders?.length ?? selectedCustomer.orderCount ?? 0}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E5E8F0] bg-slate-50/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Avg Order Value</p>
                  <p className="text-base font-extrabold text-[#0F172A] mt-1 tabular-nums">
                    {selectedCustomer.orders && selectedCustomer.orders.length > 0
                      ? Math.round(Number(selectedCustomer.totalSpent) / selectedCustomer.orders.length)
                      : 0}{" "}
                    €
                  </p>
                </div>
              </div>

              {/* Tags & Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-[#E5E8F0] p-4 bg-white">
                  <p className="font-bold text-[#64748B] uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Billing Address
                  </p>
                  {selectedCustomer.billing ? (
                    <p className="text-[#334155] leading-relaxed">
                      {selectedCustomer.billing.address_1 || ""}<br />
                      {selectedCustomer.billing.city || ""}, {selectedCustomer.billing.country || ""}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">No billing address saved</p>
                  )}
                </div>

                <div className="rounded-xl border border-[#E5E8F0] p-4 bg-white">
                  <p className="font-bold text-[#64748B] uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Customer Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedCustomer.tags) && selectedCustomer.tags.length > 0 ? (
                      selectedCustomer.tags.map((t) => (
                        <span key={t} className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No tags assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2.5 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Order History
                </h3>
                <div className="rounded-xl border border-[#E5E8F0] divide-y divide-[#E5E8F0] overflow-hidden text-xs">
                  {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                    selectedCustomer.orders.map((ord) => (
                      <div key={ord.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-[#3D4EE8]">Order #{ord.number || ord.wooOrderId}</p>
                          <p className="text-[10px] text-[#64748B]">{new Date(ord.wooCreatedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold tabular-nums text-[#0F172A]">
                            {Number(ord.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {ord.currency || "EUR"}
                          </p>
                          <StatusPill status={ord.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 italic">No orders found for this customer.</div>
                  )}
                </div>
              </div>

              {/* Staff Notes Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Staff Notes Timeline
                </h3>

                <form onSubmit={handleAddNote} className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add an internal customer support note..."
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
                  {selectedCustomer.notes && selectedCustomer.notes.length > 0 ? (
                    selectedCustomer.notes.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-slate-50 text-xs text-[#334155] border border-slate-100">
                        <p>{n.body}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">
                          {n.author?.fullName || "Support Agent"} • {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94A3B8] italic">No customer notes recorded yet.</p>
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
