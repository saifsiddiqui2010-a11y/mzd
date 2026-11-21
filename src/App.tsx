import { X } from 'lucide-react';
import { AccountView } from './components/AccountView';
import { AdminDashboard } from './components/AdminDashboard';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeView } from './components/HomeView';
import { OrderTrackingView } from './components/OrderTrackingView';
import { ProductDetailView } from './components/ProductDetailView';
import { StoreHeader } from './components/StoreHeader';
import { AppProvider, useApp } from './context/AppContext';

function AppShell() {
  const { route, toast, dismissToast } = useApp();

  return (
    <>
      {route === 'admin' ? (
        <AdminDashboard />
      ) : (
        <div className="min-h-screen bg-[#FAFAF9] text-[#141413]">
          <StoreHeader />
          {route === 'home' && <HomeView />}
          {route === 'product' && <ProductDetailView />}
          {route === 'track' && <OrderTrackingView />}
          {route === 'account' && <AccountView />}
          <CartCheckoutDrawer />
        </div>
      )}

      {/* Subtle Non-Intrusive Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm px-4 py-3 text-xs font-medium shadow-lg border flex items-center gap-3 ${
            toast.tone === 'error'
              ? 'bg-[#991B1B] text-white border-[#7F1D1D]'
              : 'bg-[#141413] text-white border-white/10'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
