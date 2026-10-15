import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  GitFork,
  Mail,
  RefreshCw,
  Settings,
  Shield,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

export function Sidebar() {
  const { role, isAdmin } = useAuth();

  const navItems = [
    { name: "Dashboard", to: "/", icon: LayoutDashboard },
    { name: "Customers", to: "/customers", icon: Users },
    { name: "Orders", to: "/orders", icon: ShoppingBag },
    { name: "Workflows", to: "/workflows", icon: GitFork, badge: !isAdmin ? "Read-only" : null },
    { name: "Messages", to: "/messages", icon: Mail },
    { name: "Sync Center", to: "/sync", icon: RefreshCw },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-[#E5E8F0] bg-white flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E5E8F0]">
          <div className="h-9 w-9 rounded-xl bg-[#3D4EE8] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            W
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-[#0F172A]">Woo CRM</h1>
            <p className="text-[11px] text-[#64748B]">Realtime Enterprise</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#3D4EE8] text-white shadow-xs"
                      : "text-[#475569] hover:bg-[#EEF1FF] hover:text-[#3D4EE8]"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Settings link (Admin Only per Design.md 7.1) */}
          {isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#3D4EE8] text-white shadow-xs"
                    : "text-[#475569] hover:bg-[#EEF1FF] hover:text-[#3D4EE8]"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4.5 w-4.5" />
                <span>Settings</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Admin
              </span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* RBAC Role Pill Indicator at bottom */}
      <div className="p-4 border-t border-[#E5E8F0]">
        <div className="rounded-xl bg-[#F6F7FB] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                isAdmin ? "bg-indigo-100 text-[#3D4EE8]" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isAdmin ? <Shield className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F172A] capitalize">{role || "Guest"}</p>
              <p className="text-[10px] text-[#64748B]">RBAC Enabled</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
