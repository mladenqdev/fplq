import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import AppShell from './components/AppShell';
import FirstRun from './features/onboarding/FirstRun';
import { useEntryIdStore } from './stores/useEntryId';

const LivePage = lazy(() => import('./features/live/LivePage'));
const LeaguePage = lazy(() => import('./features/live/LeaguePage'));
const PlannerPage = lazy(() => import('./features/planner/PlannerPage'));
const FixturesPage = lazy(() => import('./features/fixtures/FixturesPage'));
const PlayersPage = lazy(() => import('./features/players/PlayersPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <LivePage /> },
      { path: '/league/:id', element: <LeaguePage /> },
      { path: '/planner', element: <PlannerPage /> },
      { path: '/fixtures', element: <FixturesPage /> },
      { path: '/players', element: <PlayersPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <LivePage /> },
    ],
  },
]);

export default function App() {
  const entryId = useEntryIdStore((s) => s.entryId);
  if (entryId == null) return <FirstRun />;
  return <RouterProvider router={router} />;
}
