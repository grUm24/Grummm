# Landing + Portfolio Roadmap

Status date: 2026-03-03

## Final Implemented Scope

### Phase 0 - Preparation

- [x] Added `llm-rules.md` with hard constraints.
- [x] Added frontend testing baseline (Jest + RTL).

### Phase 1 - Hero and Visual Baseline

- [x] CSS animated space background (stars + subtle drift).
- [x] Hero integrated into public landing `/`.
- [x] Theme and language toggles with reactive UI updates.
- [x] Replaced 3D dependency approach with pure 2D animated Earth (no Three.js).

### Phase 2 - Portfolio Structure

- [x] Project data source with bilingual content and themed assets.
- [x] Responsive `ProjectCard` grid under hero.
- [x] Reactive text/image updates by theme and language.

### Phase 3 - Interactivity

- [x] Desktop: card expands in place on hover.
- [x] Mobile: first tap expands card, second tap navigates to details.
- [x] Removed popup overlay interaction (replaced with in-grid expansion).

### Phase 4 - Project Page

- [x] `ProjectDetailPage` layout (media -> text -> screenshots).
- [x] Responsive details layout.
- [x] Integrated back action into content block, plus swipe-back on mobile.

### Phase 5 - Finalization

- [x] Lazy loading for images/video.
- [x] Routing updates for landing/portfolio/details.
- [x] Baseline tests for card interactivity.
- [x] Docs and smoke notes updated.
- [ ] Post-deploy smoke run on target server (manual step).

## Notes

- Current hero Earth visualization is fully CSS/DOM-based and does not depend on `three`, `@react-three/fiber`, or `@react-three/drei`.
- CSP-related browser issues from 3D loaders are no longer relevant to the current implementation.
