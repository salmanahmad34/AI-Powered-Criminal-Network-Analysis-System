# CrimeGraph AI — Mobile & Multi-Device Responsive Design Specification

This document details the multi-device responsive UI architecture for the CrimeGraph AI Investigation Intelligence Platform.

---

## 📱 Breakpoint Strategy

CrimeGraph AI uses fluid responsive design built on the Tailwind CSS breakpoint scale:

| Breakpoint | Target Screen Width | Target Device Class | Primary Layout Behavior |
| :--- | :--- | :--- | :--- |
| **Mobile** | `< 640px` (`default`) | Smart phones (375px–430px) | Single column layout, off-canvas slide-over drawer, card representations for data tables, stacked form actions, touch target heights `≥ 40px`. |
| **Tablet** | `640px – 1023px` (`sm`, `md`) | iPads, Android tablets (768px–1024px) | 2 to 3 column card grids, horizontally scrollable data tables with momentum touch scrolling, inline filters. |
| **Desktop** | `≥ 1024px` (`lg`, `xl`) | Laptops & Desktop Monitors | Full multi-column dashboard, sticky collapsible sidebar, expanded data tables, side-by-side graph workspace. |

---

## ☰ Mobile Navigation System

- **Header Bar**: Displays hamburger toggle `☰`, page title, and minimal status badge (`DEMO DATABASE`). Non-essential elements are hidden on small screens.
- **Slide-over Drawer**: Toggling `☰` opens a left-hand navigation drawer (`w-72 max-w-[85vw]`) with a `bg-black/40` backdrop.
- **Interaction Rules**:
  - Drawer closes automatically when a navigation link is clicked or when clicking the backdrop overlay.
  - Full RBAC visibility is preserved (Viewers, Investigators, Senior Officers, Administrators).
  - Touch targets for navigation links are expanded to `min-height: 40px` for accurate thumb interaction.

---

## 📊 Responsive Data Tables

To prevent awkward horizontal scrolling and layout clipping on small screens, CrimeGraph AI implements a dual-view table strategy:

1. **Desktop/Tablet (`sm:block`)**: Standard tabular view enclosed in `.table-container` with `-webkit-overflow-scrolling: touch`.
2. **Mobile (< 640px) (`sm:hidden`)**: Structured card representation displaying key fields (e.g. Case Number, Title, Status, Priority, Investigator, and explicit Action buttons) in a compact, touch-friendly vertical stack.

---

## 📈 Interactive Network Graph Mobile Behavior

- **SVG Rescaling**: The graph SVG uses `viewBox="0 0 800 400"` with `preserveAspectRatio="xMidYMid meet"` to scale fluidly inside any mobile container without cropping nodes.
- **Touch Zoom & Pan**: Mobile users can use touch controls (`Zoom In [+]`, `Zoom Out [-]`, `Reset`) overlaying the top-right of the graph canvas.
- **Details Panel**: Stacks vertically below the graph canvas on screens `< 1024px` while remaining side-by-side on desktop.

---

## 💬 AI Assistant Mobile UX

- Chat message container wraps text cleanly with `break-words`.
- Input area stays pinned at the bottom of the viewport with responsive padding.
- Suggested prompt chips collapse into wrapped inline buttons.

---

## ♿ Accessibility & Touch Standards

- All interactive buttons and input controls maintain a minimum height of `40px–44px`.
- High contrast light mode colors maintained (Charcoal `#18181b` on white `#ffffff`).
- Fully accessible keyboard navigation and `aria-label` attributes on drawer toggles and zoom controls.
