import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { SecurityPage } from './pages/public/SecurityPage';
import { LoginPage, SignupPage } from './pages/public/AuthPages';

// App Layout & Pages
import { AppLayout } from './components/common/AppLayout';
import { OverviewPage } from './pages/app/OverviewPage';
import { NetworkPage } from './pages/app/NetworkPage';
import { AgentsPage } from './pages/app/AgentsPage';
import { AgentCreatePage } from './pages/app/AgentCreatePage';
import { RequestCreatePage } from './pages/app/RequestCreatePage';
import { NegotiationsListPage } from './pages/app/NegotiationsListPage';
import { NegotiationDetailPage } from './pages/app/NegotiationDetailPage';
import { TransactionsPage } from './pages/app/TransactionsPage';
import { TransactionDetailPage } from './pages/app/TransactionDetailPage';
import { AnalyticsPage } from './pages/app/AnalyticsPage';
import { SettingsPage } from './pages/app/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#171A21',
            border: '1px solid #292D36',
            color: '#F2F2F0',
            fontFamily: 'Geist, Inter, sans-serif',
            fontSize: '13px'
          }
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Application Routes */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/new" element={<AgentCreatePage />} />
            <Route path="requests/new" element={<RequestCreatePage />} />
            <Route path="negotiations" element={<NegotiationsListPage />} />
            <Route path="negotiations/:id" element={<NegotiationDetailPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="transactions/:id" element={<TransactionDetailPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
