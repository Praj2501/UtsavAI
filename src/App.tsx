import React, { Suspense, lazy } from 'react';
import { useAuthStore } from './stores/authStore';
import { useEventStore } from './stores/eventStore';
import { Navbar } from './components/common/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PageSkeleton } from './components/common/States';

const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const BlueprintPage = lazy(() => import('./features/blueprint/BlueprintPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const BudgetPage = lazy(() => import('./features/budget/BudgetPage'));
const TimelinePage = lazy(() => import('./features/timeline/TimelinePage'));
const VendorsPage = lazy(() => import('./features/vendors/VendorsPage'));
const RsvpPage = lazy(() => import('./features/rsvp/RsvpPage'));
const ContentPage = lazy(() => import('./features/content/ContentPage'));
const RunSheetPage = lazy(() => import('./features/runsheet/RunSheetPage'));
const CopilotDrawer = lazy(() => import('./features/copilot/CopilotDrawer'));

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();
  const { activeView } = useEventStore();

  React.useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-utsav-50 text-stone-900">
        <Navbar />

        <main id="main-content" className="flex-1 w-full">
          <Suspense fallback={<PageSkeleton />}>
            {activeView === 'landing' && <LandingPage />}
            {activeView === 'blueprint' && <BlueprintPage />}
            {activeView === 'dashboard' && <DashboardPage />}
            {activeView === 'budget' && <BudgetPage />}
            {activeView === 'timeline' && <TimelinePage />}
            {activeView === 'vendors' && <VendorsPage />}
            {activeView === 'rsvp' && <RsvpPage />}
            {activeView === 'content' && <ContentPage />}
            {activeView === 'runsheet' && <RunSheetPage />}
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <CopilotDrawer />
        </Suspense>

        <footer className="bg-white border-t border-utsav-200 py-6 text-center text-xs text-stone-500">
          <p>Utsav AI &copy; 2026. Built with Firebase & Gemini. Client-only architecture.</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
