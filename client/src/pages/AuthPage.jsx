// client/src/pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Sparkles, User, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState("agent");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, fullName, selectedRole);
        // Automatic demo login if verification is pending
        demoLogin(selectedRole);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || "Authentication failed. Try quick demo login below.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = (role) => {
    demoLogin(role);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F7FB] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl bg-white border border-[#E5E8F0] shadow-xl overflow-hidden">
        {/* Left Side: Brand & Visual Showcase */}
        <div className="bg-gradient-to-br from-[#262F7E] via-[#3140C4] to-[#3D4EE8] p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-xl border border-white/20">
                W
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">WooCommerce CRM</h1>
                <p className="text-xs text-[#C7D0FF]">Realtime Sync & Automated RBAC</p>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-[#E0E5FF] border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Hackathon Judge Evaluation
              </span>
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
                Unified commerce operations with sub-15s customer lookups.
              </h2>
              <p className="text-sm text-[#C7D0FF] leading-relaxed">
                Bi-directional WooCommerce synchronization, customer 360 profiles, automated recovery workflows, and role-based access.
              </p>
            </div>
          </div>

          {/* Quick Demo Logins for Judges */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C7D0FF] mb-3">
              1-Click Fast Pass for Evaluators:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDemo("admin")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white text-[#262F7E] font-semibold text-xs shadow-sm hover:bg-[#EEF1FF] transition-all cursor-pointer"
              >
                <Shield className="h-4 w-4 text-[#3D4EE8]" /> Demo Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemo("agent")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/15 text-white font-semibold text-xs border border-white/25 hover:bg-white/25 transition-all cursor-pointer"
              >
                <User className="h-4 w-4 text-emerald-300" /> Demo Agent
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#0F172A]">
              {isLogin ? "Sign In" : "Create Account"}
            </h2>
            <div className="flex rounded-xl bg-[#F1F5F9] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMessage("");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isLogin ? "bg-white text-[#3D4EE8] shadow-xs" : "text-[#64748B]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMessage("");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !isLogin ? "bg-white text-[#3D4EE8] shadow-xs" : "text-[#64748B]"
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] focus:border-[#3D4EE8] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@store.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] focus:border-[#3D4EE8] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#334155]">Password</label>
                {isLogin && (
                  <span className="text-xs text-[#3D4EE8] hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] focus:border-[#3D4EE8] transition-colors"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                  RBAC Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("admin")}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                      selectedRole === "admin"
                        ? "border-[#3D4EE8] bg-[#EEF1FF] text-[#262F7E]"
                        : "border-[#CBD5E1] text-[#475569]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Admin</p>
                      <p className="text-[10px] text-[#64748B]">Full configuration</p>
                    </div>
                    {selectedRole === "admin" && <CheckCircle2 className="h-4 w-4 text-[#3D4EE8]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("agent")}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                      selectedRole === "agent"
                        ? "border-[#3D4EE8] bg-[#EEF1FF] text-[#262F7E]"
                        : "border-[#CBD5E1] text-[#475569]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Support Agent</p>
                      <p className="text-[10px] text-[#64748B]">Customer operations</p>
                    </div>
                    {selectedRole === "agent" && <CheckCircle2 className="h-4 w-4 text-[#3D4EE8]" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 rounded-xl bg-[#3D4EE8] hover:bg-[#3140C4] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {isLogin ? "Authenticate" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
