import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { SecurityPage } from './pages/public/SecurityPage';
import { LoginPage, SignupPage } from './pages/public/AuthPages';
import { OnboardingPage } from './pages/public/OnboardingPage';

// App Layout & Pages
import { AppLayout } from './components/common/AppLayout';
import { OverviewPage } from './pages/app/OverviewPage';
import { NetworkPage } from './pages/app/NetworkPage';
import { AgentsPage } from './pages/app/AgentsPage';
import { AgentCreatePage } from './pages/app/AgentCreatePage';
import { RequestCreatePage } from './pages/app/RequestCreatePage';
import { ListingsPage } from './pages/app/ListingsPage';
import { ListingEditorPage } from './pages/app/ListingEditorPage';
import { MemoryPage } from './pages/app/MemoryPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { NegotiationsListPage } from './pages/app/NegotiationsListPage';
import { NegotiationDetailPage } from './pages/app/NegotiationDetailPage';
import { TransactionsPage } from './pages/app/TransactionsPage';
import { TransactionDetailPage } from './pages/app/TransactionDetailPage';
import { AnalyticsPage } from './pages/app/AnalyticsPage';
import { SettingsPage } from './pages/app/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--vyro-surface)',
              border: '1px solid var(--vyro-line)',
              color: 'var(--vyro-text)',
              fontSize: '13px',
              borderRadius: '6px'
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
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Application Routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              
              {/* Buyer & Seller Nav Items */}
              <Route path="deals" element={<NegotiationsListPage />} />
              <Route path="deals/:id" element={<NegotiationDetailPage />} />
              <Route path="marketplace" element={<ListingsPage />} />
              <Route path="rules" element={<MemoryPage />} />
              <Route path="requests/new" element={<RequestCreatePage />} />

              {/* Listings & Fulfillment */}
              <Route path="listings" element={<ListingsPage />} />
              <Route path="listings/new" element={<ListingEditorPage />} />
              <Route path="listings/:id" element={<ListingEditorPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="transactions/:id" element={<TransactionDetailPage />} />

              {/* Legacy Aliases & Secondary Views */}
              <Route path="negotiations" element={<NegotiationsListPage />} />
              <Route path="negotiations/:id" element={<NegotiationDetailPage />} />
              <Route path="memory" element={<MemoryPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="network" element={<NetworkPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agents/new" element={<AgentCreatePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
