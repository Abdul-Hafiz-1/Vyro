import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { SecurityPage } from './pages/public/SecurityPage';
import { LoginPage, SignupPage } from './pages/public/AuthPages';
import { OnboardingPage } from './pages/public/OnboardingPage';
import { TermsPage, PrivacyPage, DisputePolicyPage } from './pages/public/LegalPages';
import { StyleguidePage } from './pages/StyleguidePage';

// App Layout & Pages
import { AppLayout } from './components/common/AppLayout';
import { OverviewPage } from './pages/app/OverviewPage';
import { RequestCreatePage } from './pages/app/RequestCreatePage';
import { ListingsPage } from './pages/app/ListingsPage';
import { ListingEditorPage } from './pages/app/ListingEditorPage';
import { MemoryPage } from './pages/app/MemoryPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { NegotiationsListPage } from './pages/app/NegotiationsListPage';
import { NegotiationDetailPage } from './pages/app/NegotiationDetailPage';
import { TransactionsPage } from './pages/app/TransactionsPage';
import { TransactionDetailPage } from './pages/app/TransactionDetailPage';
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

// Helper component to redirect legacy /negotiations/:id to /deals/:id
const RedirectDealParam: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/app/deals/${id}`} replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '10px',
              fontFamily: '"Hanken Grotesk", sans-serif'
            }
          }}
        />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/styleguide" element={<StyleguidePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/dispute-policy" element={<DisputePolicyPage />} />

            {/* Application Routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              
              {/* Deals / Negotiations */}
              <Route path="deals" element={<NegotiationsListPage />} />
              <Route path="deals/:id" element={<NegotiationDetailPage />} />
              
              {/* Buyer Procurement */}
              <Route path="requests/new" element={<RequestCreatePage />} />
              <Route path="marketplace" element={<ListingsPage />} />

              {/* Seller Listings */}
              <Route path="listings" element={<ListingsPage />} />
              <Route path="listings/new" element={<ListingEditorPage />} />
              <Route path="listings/:id" element={<ListingEditorPage />} />

              {/* Rules & Governance */}
              <Route path="rules" element={<MemoryPage />} />

              {/* Transactions & Invoices */}
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="transactions/:id" element={<TransactionDetailPage />} />

              {/* Account, Notifications & Settings */}
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Clean Canonical Redirects for Legacy / Merged Aliases */}
              <Route path="negotiations" element={<Navigate to="/app/deals" replace />} />
              <Route path="negotiations/:id" element={<RedirectDealParam />} />
              <Route path="memory" element={<Navigate to="/app/rules" replace />} />
              <Route path="network" element={<Navigate to="/app/marketplace" replace />} />
              <Route path="agents" element={<Navigate to="/app/rules" replace />} />
              <Route path="agents/new" element={<Navigate to="/app/rules" replace />} />
              <Route path="analytics" element={<Navigate to="/app" replace />} />
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
