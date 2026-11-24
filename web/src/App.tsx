import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './lib/store';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/Layout';
import { Card } from './components/ui';

const Dashboard = lazy(() => import('./screens/Dashboard'));
const Courses = lazy(() => import('./screens/Courses'));
const ChapterPage = lazy(() => import('./screens/Chapter'));
const Practice = lazy(() => import('./screens/Practice'));
const MockTests = lazy(() => import('./screens/MockTests'));
const Planner = lazy(() => import('./screens/Planner'));
const ProgressPage = lazy(() => import('./screens/Progress'));
const Library = lazy(() => import('./screens/Library'));
const VideoLesson = lazy(() => import('./screens/VideoLesson'));
const Gamification = lazy(() => import('./screens/Gamification'));
const ParentDashboard = lazy(() => import('./screens/ParentDashboard'));
const AdaptivePractice = lazy(() => import('./screens/AdaptivePractice'));
const DoubtTutor = lazy(() => import('./screens/DoubtTutor'));
const ConceptMapVisualizer = lazy(() => import('./screens/ConceptMapVisualizer'));
const OKFMetadataBrowser = lazy(() => import('./screens/OKFMetadataBrowser'));
const OfflineStatus = lazy(() => import('./screens/OfflineStatus'));
const RAGSearchViewer = lazy(() => import('./screens/RAGSearchViewer'));
const LearningAids = lazy(() => import('./screens/LearningAids'));

function NotFound() {
  return <Card className="empty-state"><h2>Page not found</h2><p>That route does not exist in the Class X platform.</p></Card>;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <AppDataProvider>
          <Suspense fallback={<div className="page-loading"><div className="loader-ring" /><span>Loading…</span></div>}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="courses" element={<Courses />} />
                <Route path="courses/:subjectId/:chapterId" element={<ChapterPage />} />
                <Route path="practice" element={<Practice />} />
                <Route path="mock-tests" element={<MockTests />} />
                <Route path="mock-exams" element={<Navigate to="/mock-tests" replace />} />
                <Route path="tutor" element={<DoubtTutor />} />
                <Route path="doubt" element={<Navigate to="/tutor" replace />} />
                <Route path="planner" element={<Planner />} />
                <Route path="study-plans" element={<Navigate to="/planner" replace />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="library" element={<Library />} />
                <Route path="video" element={<Navigate to="/video/mathematics/real-numbers" replace />} />
                <Route path="video/:subjectId/:chapterId" element={<VideoLesson />} />
                <Route path="adaptive-practice" element={<AdaptivePractice />} />
                <Route path="daily-quizzes" element={<Navigate to="/adaptive-practice" replace />} />
                <Route path="concept-map" element={<Navigate to="/concept-map/mathematics/real-numbers" replace />} />
                <Route path="concept-map/:subjectId/:chapterId" element={<ConceptMapVisualizer />} />
                <Route path="okf-metadata" element={<OKFMetadataBrowser />} />
                <Route path="offline-status" element={<OfflineStatus />} />
                <Route path="rag-search" element={<RAGSearchViewer />} />
                <Route path="gamification" element={<Gamification />} />
                <Route path="parent" element={<ParentDashboard />} />
                <Route path="analytics" element={<Navigate to="/parent" replace />} />
                <Route path="learning-aids" element={<Navigate to="/learning-aids/mathematics/real-numbers" replace />} />
                <Route path="learning-aids/:subjectId/:chapterId" element={<LearningAids />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AppDataProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
