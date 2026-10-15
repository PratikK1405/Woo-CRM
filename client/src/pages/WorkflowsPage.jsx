// client/src/pages/WorkflowsPage.jsx
import React, { useState, useEffect } from "react";
import { Plus, GitFork, Play, CheckCircle2, ShieldAlert, RefreshCw, X, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/crmApi";

export function WorkflowsPage() {
  const { isAdmin } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrigger, setNewTrigger] = useState("order_created");
  const [creating, setCreating] = useState(false);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/workflows");
      if (res && res.data) {
        setWorkflows(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch workflows from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggle = async (wf) => {
    if (!isAdmin) return;
    setTogglingId(wf.id);
    try {
      const updated = await apiRequest(`/workflows/${wf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !wf.enabled }),
      });
      setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? updated : w)));
    } catch (err) {
      alert(err.message || "Failed to update workflow");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await apiRequest("/workflows", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          triggerType: newTrigger,
          enabled: true,
        }),
      });
      setWorkflows([created, ...workflows]);
      setShowCreateModal(false);
      setNewName("");
      setNewDesc("");
    } catch (err) {
      alert(err.message || "Failed to create workflow");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin || !confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await apiRequest(`/workflows/${id}`, { method: "DELETE" });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete workflow");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Automated Workflows</h1>
          <p className="text-sm text-[#64748B]">
            Event triggers, condition filters, and transactional customer communications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkflows}
            className="h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#334155] shadow-xs hover:bg-[#F6F7FB] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3D4EE8]" : ""}`} /> Refresh
          </button>

          {isAdmin ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 rounded-xl bg-[#3D4EE8] hover:bg-[#3140C4] text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Workflow
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-600" /> Read-Only Mode (Agent Role)
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[#64748B]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#3D4EE8] border-t-transparent mb-2" />
          <p>Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E8F0] bg-white p-12 text-center text-sm text-[#64748B]">
          No workflows found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#EEF1FF] text-[#3D4EE8] flex items-center justify-center shrink-0">
                  <GitFork className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">{wf.name}</h3>
                  <p className="text-xs text-[#64748B] mt-1">
                    <span className="font-semibold text-[#334155]">Trigger:</span> {wf.triggerType}
                  </p>
                  {wf.description && (
                    <p className="text-xs text-[#64748B] mt-0.5">{wf.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-[#E5E8F0]">
                {isAdmin ? (
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(wf.enabled)}
                        disabled={togglingId === wf.id}
                        onChange={() => handleToggle(wf)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3D4EE8]"></div>
                    </label>
                    <span className="text-xs font-semibold text-[#475569] w-14">
                      {wf.enabled ? "Active" : "Paused"}
                    </span>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      title="Delete workflow"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      wf.enabled ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {wf.enabled ? "Active" : "Disabled"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E8F0] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">New Automated Workflow</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Workflow Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. VIP Thank You Dispatch"
                  className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Trigger Event</label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#CBD5E1] text-xs bg-white"
                >
                  <option value="order_created">order_created (New order placed)</option>
                  <option value="order_status_changed">order_status_changed (Order status moved)</option>
                  <option value="customer_created">customer_created (New customer registration)</option>
                  <option value="customer_inactive">customer_inactive (Lapsed customer re-engagement)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Description</label>
                <textarea
                  rows="3"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explain what this automation does..."
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 px-4 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="h-9 px-4 rounded-xl bg-[#3D4EE8] text-white text-xs font-semibold hover:bg-[#3140C4] disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Save Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
