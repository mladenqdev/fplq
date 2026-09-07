import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import TopBar from './TopBar';
import BottomTabs from './BottomTabs';
import { LoadingScreen } from './states';

export default function AppShell() {
  const planner = useLocation().pathname === '/planner';
  return (
    <div className="min-h-screen">
      <TopBar />
      <main
        className={`mx-auto ${planner ? 'max-w-7xl' : 'max-w-2xl'} px-3 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+4.5rem)]`}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomTabs />
    </div>
  );
}
