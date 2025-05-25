
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ValidationDashboard from './pages/ValidationDashboard';
import ComponentShowcase from './pages/ComponentShowcase';
import IntegrationDemo from './pages/IntegrationDemo';
import { useSecurityHeaders } from './hooks/useSecurityHeaders';

function App() {
  useSecurityHeaders();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="validation" element={<ValidationDashboard />} />
            <Route path="components" element={<ComponentShowcase />} />
            <Route path="integration" element={<IntegrationDemo />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
