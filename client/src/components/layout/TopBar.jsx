import React from "react";
import { Search, Bell, LogOut, Shield, User, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

export function TopBar() {
  const { user, role, isAdmin, logout, demoLogin } = useAuth();

  return (
    <header className="h-16 px-8 border-b border-[#E5E8F0] bg-white sticky top-0 z-20 flex items-center justify-between">
      {/* Search Input */}
      <div className="relative w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search customers, orders, tracking (/)..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#CBD5E1] bg-[#F6F7FB] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#3D4EE8] transition-colors"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Sync Indicator (Design.md 7.1) */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Synced 2 min ago</span>
        </div>

        {/* Judge Interactive Role Switcher */}
        <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl gap-1 text-xs font-semibold">
          <button
            onClick={() => demoLogin("admin")}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              isAdmin ? "bg-white text-[#3D4EE8] shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
            title="Switch session to Admin role"
          >
            <Shield className="h-3 w-3" /> Admin
          </button>
          <button
            onClick={() => demoLogin("agent")}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              !isAdmin ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
            title="Switch session to Agent role"
          >
            <User className="h-3 w-3" /> Agent
          </button>
        </div>

        {/* Notifications */}
        <button
          className="relative h-10 w-10 rounded-xl border border-[#E5E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F6F7FB]"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#3D4EE8]" />
        </button>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#E5E8F0]">
          <div className="h-9 w-9 rounded-full bg-[#EEF1FF] text-[#3D4EE8] font-bold text-xs flex items-center justify-center uppercase">
            {user?.fullName?.slice(0, 2) || "U"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#0F172A] leading-none">{user?.fullName || "Agent"}</p>
            <p className="text-[11px] text-[#64748B] leading-none mt-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-[#64748B] hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
