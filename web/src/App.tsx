import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './lib/store';
import { Layout } from './components/Layout';
import Dashboard from './screens/Dashboard';
import Courses from './screens/Courses';
import ChapterPage from './screens/Chapter';
import Practice from './screens/Practice';
import MockTests from './screens/MockTests';
import Planner from './screens/Planner';
import ProgressPage from './screens/Progress';
import Library from './screens/Library';
import VideoLesson from './screens/VideoLesson';
import Gamification from './screens/Gamification';
import ParentDashboard from './screens/ParentDashboard';
import AdaptivePractice from './screens/AdaptivePractice';
import DoubtTutor from './screens/DoubtTutor';
import ConceptMapVisualizer from './screens/ConceptMapVisualizer';
import OKFMetadataBrowser from './screens/OKFMetadataBrowser';
import OfflineStatus from './screens/OfflineStatus';
import RAGSearchViewer from './screens/RAGSearchViewer';
import { Card } from './components/ui';

function NotFound() {
  return <Card className="empty-state"><h2>Page not found</h2><p>That route does not exist in the Class X platform.</p></Card>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <Suspense fallback={<div className="page-loading"><div className="loader-ring" /><span>Loading…</span></div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="courses" element={<Courses />} />
              <Route path="courses/:subjectId/:chapterId" element={<ChapterPage />} />
              <Route path="practice" element={<Practice />} />
              <Route path="mock-tests" element={<MockTests />} />
              <Route path="tutor" element={<DoubtTutor />} />
              <Route path="doubt" element={<Navigate to="/tutor" replace />} />
              <Route path="planner" element={<Planner />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="library" element={<Library />} />
              <Route path="video/:subjectId/:chapterId" element={<VideoLesson />} />
              <Route path="adaptive-practice" element={<AdaptivePractice />} />
              <Route path="concept-map/:subjectId/:chapterId" element={<ConceptMapVisualizer />} />
              <Route path="okf-metadata" element={<OKFMetadataBrowser />} />
              <Route path="offline-status" element={<OfflineStatus />} />
              <Route path="rag-search" element={<RAGSearchViewer />} />
              <Route path="gamification" element={<Gamification />} />
              <Route path="parent" element={<ParentDashboard />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AppDataProvider>
    </BrowserRouter>
  );
}
