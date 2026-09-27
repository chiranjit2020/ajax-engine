import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { CodeStudioPage } from '../pages/CodeStudioPage';
import { LabPage } from '../pages/LabPage';
import { NetworkPage } from '../pages/NetworkPage';
import { WordPressLabPage } from '../pages/WordPressLabPage';
import { InspectorProvider } from './providers/InspectorProvider';
import { ProgressProvider } from './providers/ProgressProvider';
import { SimulationProvider } from './providers/SimulationProvider';
import { ThemeProvider } from './providers/ThemeProvider';

// The learning pages carry most of the written content, so they are split out of the first download…
const loadLearn = () => import('../pages/LearnPage');
const loadLesson = () => import('../pages/LessonPage');
const loadChallenges = () => import('../pages/ChallengesPage');
const loadReference = () => import('../pages/ReferencePage');
const LearnPage = lazy(() => loadLearn().then((module) => ({ default: module.LearnPage })));
const LessonPage = lazy(() => loadLesson().then((module) => ({ default: module.LessonPage })));
const ChallengesPage = lazy(() => loadChallenges().then((module) => ({ default: module.ChallengesPage })));
const ReferencePage = lazy(() => loadReference().then((module) => ({ default: module.ReferencePage })));

/**
 * …but fetched in the background soon after start-up, so every page still works
 * offline once the app has loaded (spec §2).
 */
function usePrefetchPages() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const load of [loadLearn, loadLesson, loadChallenges, loadReference]) void load().catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);
}

function PageLoading() {
  return (
    <p role="status" className="p-4 text-sm text-muted">
      Loading…
    </p>
  );
}

/**
 * Hash-based routing: every route survives a refresh on any static host
 * without server rewrite rules (Phase 1 decision).
 */
export function App() {
  usePrefetchPages();
  return (
    <ThemeProvider>
      <ProgressProvider>
        <SimulationProvider>
          <InspectorProvider>
            <HashRouter>
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route index element={<LabPage />} />
                    <Route path="learn" element={<LearnPage />} />
                    <Route path="learn/:lessonId" element={<LessonPage />} />
                    <Route path="code" element={<CodeStudioPage />} />
                    <Route path="network" element={<NetworkPage />} />
                    <Route path="wordpress" element={<WordPressLabPage />} />
                    <Route path="challenges" element={<ChallengesPage />} />
                    <Route path="reference" element={<ReferencePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </Suspense>
            </HashRouter>
          </InspectorProvider>
        </SimulationProvider>
      </ProgressProvider>
    </ThemeProvider>
  );
}
