# Subsystem: Application Routing & Route Fallbacks

## 1. Operational Status

- **Status**: **PRODUCTION READY**
- **Target Git SHA**: `b7a11e2`
- **Affected Files**:
  - `web/src/App.tsx` (lines 25-66)
- **Verified Capabilities**:
  - Full client-side routing tree managed by `react-router-dom` v7 under `<BrowserRouter>`.
  - Nested layout architecture wrapped with sticky topbar, sidebar, and quick access navigation bar.
  - Complete suite of 9 canonical route redirects preserving compatibility with legacy links, user bookmarks, and marketing shortcuts.
  - Wildcard catch-all route (`path="*"`) rendering an informative `<NotFound />` 404 card instead of blank screens.

---

## 2. Usage Instructions

### 2.1 Route Map & Canonical Paths

The platform maps all major educational functions to canonical URLs:

| Canonical URL Path | Screen Component | Functionality |
|---|---|---|
| `/` | `Dashboard` | Overview of daily streak, progress summary, and rapid study actions |
| `/courses` | `CourseExplorer` | Subject and chapter directory across CBSE Class X syllabus |
| `/practice` | `Practice` | Filterable question drill with solution reveal and step hints |
| `/mock-tests` | `MockExams` | Timed CBSE examination simulations with scoring keys |
| `/adaptive-practice` | `DailyQuiz` | Adaptive daily diagnostic questions tailored to learner weak spots |
| `/planner` | `StudyPlanner` | 15-week CBSE 2026-27 structured curriculum timeline |
| `/progress` | `Progress` | Quantitative syllabus coverage, question stats, and mastery indicators |
| `/parent` | `ParentAnalytics` | Guardian analytics, topic heatmaps, and weekly effort tracking |
| `/tutor` | `AITutor` | Grounded AI tutor with textbook citations |
| `/learning-aids/:subjectId/:chapterId` | `LearningAids` | 30 cognitive learning aids for any chapter |
| `/concept-map/:subjectId/:chapterId` | `ConceptMapVisualizer` | Interactive 2D SVG concept dependency map |
| `/video/:subjectId/:chapterId` | `VideoLessons` | Video lesson lectures with chapter transcript index |
| `/gamification` | `Gamification` | XP progression, badges showcase, and cohort leaderboard |

---

### 2.2 Route Aliases & Redirect Rules

To prevent broken links from user bookmarks, external marketing campaigns, or legacy references, `App.tsx` defines 9 explicit replacement redirects:

```typescript
{/* Canonical Redirects for Legacy / Alternate URLs */}
<Route path="/mock-exams" element={<Navigate to="/mock-tests" replace />} />
<Route path="/doubt" element={<Navigate to="/tutor" replace />} />
<Route path="/study-plans" element={<Navigate to="/planner" replace />} />
<Route path="/video" element={<Navigate to="/video/mathematics/real-numbers" replace />} />
<Route path="/daily-quizzes" element={<Navigate to="/adaptive-practice" replace />} />
<Route path="/concept-map" element={<Navigate to="/concept-map/mathematics/real-numbers" replace />} />
<Route path="/analytics" element={<Navigate to="/parent" replace />} />
<Route path="/learning-aids" element={<Navigate to="/learning-aids/mathematics/real-numbers" replace />} />
<Route path="/dashboard" element={<Navigate to="/" replace />} />
```

#### Redirect Semantics
- Every redirect uses `replace={true}`, ensuring that the browser history stack is not polluted with intermediary redirect entries (enabling smooth browser Back button navigation).
- Base parameterized routes (`/video`, `/concept-map`, `/learning-aids`) automatically redirect to the primary canonical chapter (`mathematics/real-numbers`), providing immediate content rather than an error.

---

### 2.3 404 Error Boundary Handling

Any unmapped or malformed URL path is caught by the wildcard route at the bottom of the routing table:

```typescript
<Route path="*" element={<NotFound />} />
```

#### NotFound Component Definition
```typescript
function NotFound() {
  return (
    <Card className="empty-state">
      <h2>Page not found</h2>
      <p>That route does not exist in the Class X platform.</p>
    </Card>
  );
}
```

The component renders within the standard `<Layout>`, preserving the topbar and navigation controls so that users can instantly navigate back to safety.

---

## 3. Known Boundaries & Deep-Link Constraints

1. **SPA Hosting Requirements**:
   - In production, the Express backend serves `server/public/index.html` for all non-API GET requests:
     ```javascript
     app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, 'public', 'index.html'));
     });
     ```
   - This ensures that direct deep links (e.g. `http://localhost:8787/learning-aids/science/light-reflection-and-refraction`) load the SPA bundle properly without 404 web server errors.
2. **Case Sensitivity**:
   - URL route paths in React Router are lowercase. While the backend curriculum normalizer matches subject and chapter identifiers case-insensitively, frontend routes should always use lowercase slugs.

---

## 4. Validation Results & Verification Reference

- **Route Definitions Tested**: All 13 canonical routes and 9 redirect aliases verified via TypeScript compilation and static routing analysis.
- **Production Asset Serving**: `GET http://127.0.0.1:8787/` returns the complete bundled `index.html` (HTTP 200, 950 bytes).
- **Validation Checklist Reference**:
  - See items **RT-01 through RT-10** in [ClassX Validation Checklist — Section 3.5](../VALIDATION_CHECKLIST.md#35-route-redirects--fallbacks).
