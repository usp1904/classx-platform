# Subsystem: UI/UX Dual Theme & Quick Navigation Bar

## 1. Operational Status

- **Status**: **PRODUCTION READY**
- **Target Git SHA**: `b7a11e2`
- **Affected Files**:
  - `web/src/styles.css` (lines 3-96, 571-574)
  - `web/src/components/Layout.tsx` (lines 84-101, 215-278)
- **Verified Capabilities**:
  - Complete dual-theme support (Dark default via `:root` and Light via `[data-theme="light"], :root.light`).
  - Cohesive design tokens: Primary (`#2563EB`), Secondary (`#7C3AED`), Accent (`#06B6D4`), Success (`#10B981`), Light (`#F8FAFC`), Dark (`#0F172A`).
  - Glassmorphic card styling (`blur(24px)`) and modern Neumorphic soft depth (`--neu-light`, `--neu-dark`).
  - Persistent theme switching synchronized across `<html>`, `<body>`, and `localStorage('classx_theme')`.
  - Sticky One-Tap Quick Navigation Bar with 7 core academic routes and 4 deep-link shortcuts.

---

## 2. Usage Instructions

### 2.1 Dual Theme Implementation & CSS Tokens

The visual design system is defined in `web/src/styles.css` using CSS custom properties. It combines a frosted Glassmorphism layer for floating surfaces with modern Neumorphic soft shadows for interactive controls.

#### Core Color Palette Tokens

```css
:root {
  /* Brand Tokens */
  --primary: #2563eb;
  --primary-deep: #1d4ed8;
  --primary-glow: rgba(37, 99, 235, 0.35);
  --primary-soft: rgba(37, 99, 235, 0.12);

  --secondary: #7c3aed;
  --secondary-deep: #6d28d9;
  --secondary-glow: rgba(124, 58, 237, 0.35);
  --secondary-soft: rgba(124, 58, 237, 0.12);

  --accent: #06b6d4;
  --accent-deep: #0891b2;
  --accent-glow: rgba(6, 182, 212, 0.35);
  --accent-soft: rgba(6, 182, 212, 0.12);

  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.3);
  --success-soft: rgba(16, 185, 129, 0.12);

  --amber: #f59e0b;
  --rose: #f43f5e;
}
```

#### Theme Scopes & Transitions

1. **Dark Theme Default (`:root`)**:
   - Canvas: `--canvas: #0f172a`, `--canvas-2: #1e293b`
   - Surfaces: `--surface: rgba(30, 41, 59, 0.72)`, `--surface-2: rgba(51, 65, 85, 0.38)`
   - Typography: `--ink: #f8fafc`, `--ink-2: #cbd5e1`, `--muted: #94a3b8`
   - Glassmorphism: `--glass-border: rgba(255, 255, 255, 0.08)`, `--glass-blur: blur(24px)`, `--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.45)`
   - Neumorphism: `--neu-bg: #131c31`, `--neu-light: rgba(255, 255, 255, 0.05)`, `--neu-dark: rgba(0, 0, 0, 0.6)`
2. **Light Theme Overrides (`[data-theme="light"], :root.light`)**:
   - Canvas: `--canvas: #f8fafc`, `--canvas-2: #f1f5f9`
   - Surfaces: `--surface: rgba(255, 255, 255, 0.84)`, `--surface-2: rgba(241, 245, 249, 0.92)`
   - Typography: `--ink: #0f172a`, `--ink-2: #334155`, `--muted: #64748b`
   - Glassmorphism: `--glass-border: rgba(15, 23, 42, 0.08)`, `--glass-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.07)`
   - Neumorphism: `--neu-bg: #eef2f6`, `--neu-light: rgba(255, 255, 255, 0.9)`, `--neu-dark: rgba(15, 23, 42, 0.07)`

Smooth color transitions are enforced across key layout shells:
```css
body, .sidebar, .topbar, .quick-access-bar {
  transition: background-color 0.25s ease, border-color 0.25s ease;
}
```

---

### 2.2 Theme Switcher Protocol

The theme toggle component is embedded within the top navigation bar (`Layout.tsx`).

#### State Management Lifecycle
1. **Initial Resolution**: Read `localStorage.getItem('classx_theme')`. Default to `'dark'` if unset.
2. **DOM Attachment**: On state change, apply `data-theme` attribute to both `document.documentElement` and `document.body`:
   ```typescript
   useEffect(() => {
     document.documentElement.setAttribute('data-theme', theme);
     document.body.setAttribute('data-theme', theme);
     localStorage.setItem('classx_theme', theme);
   }, [theme]);
   ```
3. **Toggle Handler**: The topbar button switches between `'dark'` and `'light'`.
   - Dark mode displays `<Sun size={18} className="text-amber-400" />`.
   - Light mode displays `<Moon size={18} className="text-indigo-600" />`.

---

### 2.3 One-Tap Quick Navigation Bar

Positioned sticky directly beneath the top header (`top: 59px; z-index: 25;`), the `.quick-access-bar` offers single-tap navigation chips for fast context switching during study sessions.

#### 7 Core Academic Routes
1. **Courses**: `/courses` — Subject & chapter curriculum syllabus browser.
2. **Practice Tests**: `/practice` — Question bank drill with answer concealment.
3. **Mock Exams**: `/mock-tests` — Timed full-syllabus examinations.
4. **Daily Quizzes**: `/adaptive-practice` — Adaptive micro-assessment quizzes.
5. **Study Plans**: `/planner` — 15-week CBSE 2026-27 structured timeline.
6. **Progress Tracking**: `/progress` — Syllabus mastery, question counts, and weak areas.
7. **Performance Analytics**: `/parent` — Comprehensive mastery & guardian analytics.

#### Supplemental Quick Links
- **Learning Aids**: `/learning-aids/mathematics/real-numbers`
- **Concept Maps**: `/concept-map/mathematics/real-numbers`
- **Video Lessons**: `/video/mathematics/real-numbers`
- **Leaderboard**: `/gamification`

#### Active State Styling
Active chips receive an instant visual indicator using a brand gradient and glow shadow:
```css
.quick-chip.active {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 14px var(--primary-glow);
}
```

---

## 3. Known Boundaries & Constraints

1. **Mobile Horizontal Scrolling**:
   - The `.quick-access-scroll` container uses `overflow-x: auto` with hidden scrollbars (`scrollbar-width: none`).
   - On viewports narrower than 480px, users must swipe horizontally to reach the supplemental links.
2. **Third-Party SVG Embedding**:
   - When embedding raw SVG graphics in components, do not use Tailwind color utility classes (`bg-slate-800`), as SVG child elements do not reliably inherit CSS classes across all rendering engines. Use explicit hex color mappings or `currentColor`.
3. **Subtle Neumorphism in Direct Sunlight**:
   - In extremely bright ambient environments, subtle neumorphic shadows in light mode may have reduced contrast. Text tokens (`--ink: #0f172a`) strictly maintain high contrast (WCAG AA compliant).

---

## 4. Validation Results & Verification Reference

- **Static Typecheck**: Passed with 0 TypeScript compilation errors (`tsc --noEmit`).
- **Production Build**: Vite bundled all styles and components into `server/public` cleanly in 39.81s.
- **Runtime Layout Rendering**: Verified against active server `http://127.0.0.1:8787/`.
- **Validation Checklist Reference**:
  - See items **TN-01 through TN-05** in [ClassX Validation Checklist — Section 3.1](../VALIDATION_CHECKLIST.md#31-uiux-dual-theme--quick-navigation).
