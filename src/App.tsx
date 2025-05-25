
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Navigation from './components/Navigation';
import ImplementationDashboard from './components/dashboard/ImplementationDashboard';
import ValidationDashboard from './tests/integration/ValidationDashboard';
import { CrossSystemValidationDashboard } from './components/validation/CrossSystemValidationDashboard';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<ImplementationDashboard />} />
              <Route path="/implementation" element={<ImplementationDashboard />} />
              <Route path="/validation" element={<ValidationDashboard report={null} isRunning={false} onRunValidation={() => {}} />} />
              <Route path="/cross-validation" element={<CrossSystemValidationDashboard />} />
            </Routes>
          </main>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
