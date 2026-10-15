// client/src/pages/MessagesPage.jsx
import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, Send, CheckCircle2, Clock, FileText, X } from "lucide-react";
import { apiRequest } from "../api/crmApi";

export function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/messages");
      if (res) {
        setMessages(res.data || []);
        setTemplates(res.templates || []);
      }
    } catch (err) {
      console.warn("Could not load messages from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim()) return;
    setSending(true);
    try {
      await apiRequest("/messages", {
        method: "POST",
        body: JSON.stringify({
          recipient: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      setShowSendModal(false);
      setRecipient("");
      setSubject("");
      setBody("");
      fetchMessages();
    } catch (err) {
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSelectTemplate = (tpl) => {
    setSubject(tpl.subject || "");
    setBody(tpl.body || "");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Customer Communications</h1>
          <p className="text-sm text-[#64748B]">
            Transactional notification logs, email templates, and direct communications history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMessages}
            className="h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#334155] shadow-xs hover:bg-[#F6F7FB] flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3D4EE8]" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="h-10 px-4 rounded-xl bg-[#3D4EE8] text-white font-semibold text-xs flex items-center gap-2 shadow-xs hover:bg-[#3140C4] cursor-pointer"
          >
            <Send className="h-4 w-4" /> Send Direct Email
          </button>
        </div>
      </div>

      {/* Templates Available Row */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[#0F172A] mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#3D4EE8]" /> Configured Email Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id || tpl.slug}
              onClick={() => {
                handleSelectTemplate(tpl);
                setShowSendModal(true);
              }}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-[#3D4EE8] hover:bg-[#EEF1FF]/30 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#0F172A]">{tpl.name}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  {tpl.isMarketing ? "Marketing" : "Transactional"}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 truncate">{tpl.subject}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sent Message History */}
      <div className="rounded-2xl border border-[#E5E8F0] bg-white shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#E5E8F0]">
          <h2 className="text-base font-bold text-[#0F172A]">Dispatched Message Log</h2>
          <p className="text-xs text-[#64748B]">Audited transactional customer communications</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-semibold text-[#475569]">
              <tr>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Customer / Order</th>
                <th className="px-6 py-3.5">Channel</th>
                <th className="px-6 py-3.5">Sent At</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8F0]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-[#64748B]">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#3D4EE8] border-t-transparent mb-2" />
                    <p>Loading communications log...</p>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-xs text-[#64748B]">
                    No messages dispatched yet. Automated workflow runs and direct emails will appear here.
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 text-xs">
                    <td className="px-6 py-4 font-semibold text-[#0F172A]">{m.toAddress || m.recipient}</td>
                    <td className="px-6 py-4 text-[#334155]">{m.subject}</td>
                    <td className="px-6 py-4 text-[#64748B]">
                      {m.customer ? `${m.customer.firstName} ${m.customer.lastName}`.trim() : "—"}
                    </td>
                    <td className="px-6 py-4 uppercase font-semibold text-[10px] text-slate-500">
                      {m.channel}
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">
                      {m.sentAt ? new Date(m.sentAt).toLocaleString() : new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Sent
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Message Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E5E8F0] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Compose Customer Email</h2>
              <button
                onClick={() => setShowSendModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Update regarding your order #5281"
                  className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Message Body</label>
                <textarea
                  rows="5"
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message to the customer..."
                  className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="h-9 px-4 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="h-9 px-4 rounded-xl bg-[#3D4EE8] text-white text-xs font-semibold hover:bg-[#3140C4] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
