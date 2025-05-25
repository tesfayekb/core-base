
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Settings from '@/pages/Settings';
import { AuthProvider } from '@/contexts/AuthContext';
import { useSecurityHeaders } from '@/hooks/useSecurityHeaders';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function AppContent() {
  const { securityStatus } = useSecurityHeaders();

  useEffect(() => {
    // Log security status on app load
    if (securityStatus.isSecure) {
      console.log('✅ Security infrastructure initialized');
    } else {
      console.warn('⚠️ Security compliance issues:', securityStatus.recommendations);
    }
  }, [securityStatus]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
