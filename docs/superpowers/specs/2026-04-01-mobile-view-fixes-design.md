# Mobile View Fixes — Design Spec

**Issue:** [#112](https://github.com/QuackbackIO/quackback/issues/112)
**Date:** 2026-04-01
**Scope:** Fix reported mobile issues + flagged high-severity items

## Problem

Two pages reported broken on mobile:

1. **Home page** — toolbar (board selector + sort tabs + search/filter) overflows horizontally
2. **Settings/Profile** — sidebar and content are always side-by-side; content crushed to ~100px on phones

Audit found additional issues: 3. **Post detail** — VoteSidebar forces a 2-column layout on mobile even when MetadataSidebar is hidden 4. **Roadmap** — hardcoded height calc doesn't account for mobile header height 5. **Search popover** — fixed `w-80` (320px) overflows narrow screens

## Fixes

### 1. Settings Layout — Stack on mobile

**Files:** `apps/web/src/routes/_portal/settings.tsx`, `apps/web/src/components/settings/settings-nav.tsx`

Settings layout container (`settings.tsx:21`):

- `flex gap-8 px-6 py-8` → `flex flex-col md:flex-row gap-4 md:gap-8 px-4 sm:px-6 py-6 md:py-8`

Settings nav (`settings-nav.tsx:14`):

- `w-56 shrink-0` → `w-full md:w-56 md:shrink-0`

**Result:** On mobile, nav is a full-width card above content. On `md+`, existing sidebar layout.

### 2. Feedback Toolbar — Stack board selector above sort row

**Files:** `apps/web/src/components/public/feedback/feedback-container.tsx`, `apps/web/src/components/public/feedback/feedback-toolbar.tsx`

Board selector + toolbar wrapper (`feedback-container.tsx:212`):

- `flex items-center gap-2` → `flex flex-col sm:flex-row sm:items-center gap-2`

Search popover (`feedback-toolbar.tsx:106`):

- `className="w-80"` → `className="w-[calc(100vw-2rem)] sm:w-80"`

**Result:** Board selector stacks above sort/filter on mobile. Search popover constrained to viewport.

### 3. Post Detail — Compact VoteSidebar on mobile

**File:** `apps/web/src/components/public/post-detail/vote-sidebar.tsx`

VoteSidebar is the only vote button on mobile (MetadataSidebar is `hidden lg:block`), so it must stay visible. Instead, reduce its padding on mobile to reclaim space for content.

`SIDEBAR_CLASS` (`vote-sidebar.tsx:7-8`):

- `py-6 px-4` → `py-3 px-2 sm:py-6 sm:px-4`

Apply the same change to the skeleton.

**Result:** VoteSidebar shrinks from ~80px to ~48px on mobile, giving content more room. Full padding on `sm+`.

### 4. Roadmap — Simplify height calculation

**File:** `apps/web/src/components/public/roadmap-board.tsx`

ScrollArea height (`roadmap-board.tsx:105`):

- `calc(100dvh - 3.5rem - 2rem - 4.5rem - 3rem)` → `calc(100dvh - 14rem)`

Same total, less brittle. The kanban horizontal scroll pattern stays as-is.

## Out of scope

- Portal nav hamburger menu (3 items fit on mobile)
- Roadmap vertical stacking on mobile (design decision for a separate issue)
- Global spacing tightening for < 360px screens
- Changelog page (already responsive)
