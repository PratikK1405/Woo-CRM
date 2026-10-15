import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ShieldAlert } from "lucide-react";

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F6F7FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#3D4EE8] border-t-transparent" />
          <p className="text-sm font-medium text-[#64748B]">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A]">Access Restricted (RBAC)</h2>
        <p className="mt-2 max-w-md text-sm text-[#64748B]">
          Your account role (<span className="font-semibold uppercase text-indigo-600">{role}</span>) does not have permission to access this module. Contact a store administrator or switch roles in demo mode.
        </p>
      </div>
    );
  }

  return children;
}
