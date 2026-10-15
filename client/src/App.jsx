// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";

import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { OrdersPage } from "./pages/OrdersPage";
import { WorkflowsPage } from "./pages/WorkflowsPage";
import { SyncPage } from "./pages/SyncPage";
import { MessagesPage } from "./pages/MessagesPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* Authenticated Dashboard Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="sync" element={<SyncPage />} />

            {/* Admin-only RBAC Protected Route */}
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
