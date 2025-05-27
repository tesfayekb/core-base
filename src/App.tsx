import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ValidationDashboard from './pages/ValidationDashboard';
import ComponentShowcase from './pages/ComponentShowcase';
import IntegrationDemo from './pages/IntegrationDemo';
import TenantManagement from './pages/TenantManagement';
import { useSecurityHeaders } from './hooks/useSecurityHeaders';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { Toaster } from './components/ui/toaster';
import { AuthPage } from './components/auth/AuthPage';
import Users from './pages/Users';
import Settings from './pages/Settings';
import { AuditDashboard } from './components/audit/AuditDashboard';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';
import { MigrationTestPage } from './pages/MigrationTestPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  console.log('🔒 ProtectedRoute:', { isAuthenticated, loading });
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log('🚫 Not authenticated, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }
  
  console.log('✅ Authenticated, rendering protected content');
  return <>{children}</>;
}

function AppRoutes() {
  console.log('AppRoutes rendering');
  useSecurityHeaders();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public route */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="users" element={<Users />} />
            <Route path="tenant-management" element={<TenantManagement />} />
            <Route path="roles" element={<Users />} /> {/* Users page has roles tab */}
            <Route path="audit" element={<AuditDashboard />} />
            <Route path="validation" element={<ValidationDashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="components" element={<ComponentShowcase />} />
            <Route path="integration" element={<IntegrationDemo />} />
            <Route path="migration-test" element={<MigrationTestPage />} />
          </Route>
          
          {/* 404 catch-all route - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function App() {
  console.log('App component rendering');
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
