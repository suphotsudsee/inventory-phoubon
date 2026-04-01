/**
 * Main App Component for Inventory Phoubon
 * Hash-based routing with auth protection
 */

import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProcurementPage } from './pages/ProcurementPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StockManagementPage } from './pages/StockManagementPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [activeHash, setActiveHash] = React.useState(window.location.hash || '#/dashboard');

  React.useEffect(() => {
    const handler = () => setActiveHash(window.location.hash || '#/dashboard');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navItems = [
    { label: 'Dashboard', hash: '#/dashboard' },
    { label: 'Stock', hash: '#/stock' },
    { label: 'Procurement', hash: '#/procurement' },
    { label: 'Reports', hash: '#/reports' },
    { label: 'Settings', hash: '#/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-xl">H</span>
              <span className="text-lg font-bold tracking-tight">Inventory Phoubon</span>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.hash}
                  href={item.hash}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeHash === item.hash
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-600'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="font-medium">{user?.fullName || user?.username}</div>
              <div className="text-xs capitalize text-blue-200">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              className="rounded bg-blue-800 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-blue-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <StockManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProcurementPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ReportsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
