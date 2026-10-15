# Design System and UI/UX Standards: WooCommerce CRM

| Field | Value |
|---|---|
| Project | woo-crm |
| Applies to | React dashboard (`client/`), transactional and workflow emails |
| Visual references | "Design UI/UX CRM" (orders and KPI dashboard) and "Project Dashboard" (FlowTask) |
| Standards | WCAG 2.2 AA, WAI-ARIA Authoring Practices, 4px spacing grid, design tokens |
| Related | [PRD.md](./PRD.md), [database.md](./database.md) |

This document defines how the CRM looks, behaves and is built on the front end. It turns the two reference dashboards into an implementable system: tokens, components, page blueprints, interaction rules, accessibility and a definition of done.

---

## 1. Design principles

1. **Clarity over decoration.** Staff look up a customer or order in under 15 seconds (PRD success metric). Every screen has one primary job and the data comes first.
2. **Always-current, never surprising.** Data arrives live (Realtime). Changes are visible, attributed (`Woo` or `CRM`) and never silently overwrite what the agent is looking at.
3. **Honest system state.** Sync status, pending write-backs and failures are shown in the UI, not hidden. An agent must always know whether WooCommerce agrees with the CRM.
4. **Safe by default.** Destructive or customer-facing actions (status change that triggers an email, workflow enable, deleting a template) are confirmed and previewed.
5. **Consistent and tokenized.** No raw hex values, pixel margins or one-off components in feature code. Everything comes from tokens and the shared component library.
6. **Accessible to everyone.** WCAG 2.2 AA is a release requirement, not polish.

---

## 2. What we take from the references (and what we don't)

### 2.1 Adopted

| Pattern | Source | How we use it |
|---|---|---|
| Soft white cards on a pale lavender-grey page, large radius, light shadow | Both | Base surface style (section 4) |
| Vivid indigo-blue primary with tinted icon tiles | Both | Brand colour, KPI icons |
| Sidebar navigation with the active item as a filled primary pill | Both | App shell |
| KPI cards with value, trend delta and sparkline; first card in solid primary | CRM | Dashboard summary row |
| Bar chart for 7-day revenue, donut with legend and percentages | Both | Dashboard charts |
| Orders table: number, customer, amount, date, payment, status pill, row menu; summary cards above; search, filter and sort bar; numbered pagination with "1-7 of 141" | CRM | Orders and Customers lists |
| Status shown as coloured pill | Both | Order status, message status, run status |
| Greeting and date-range selector in page header | Both | Dashboard header |
| Labelled sidebar with icons | FlowTask | We use labelled navigation, not icon-only (section 7.1) |
| Colour-tinted columns with count badges | FlowTask | Optional Orders board view (P2) |

### 2.2 Deliberately not adopted

| Reference element | Reason |
|---|---|
| Tickets, response rate, customer satisfaction cards | Out of scope: no ticketing or CSAT in the PRD. Replaced by sync health, queue depth, failed events and email delivery rate. |
| "Upgrade to Pro" card, time tracking, project progress, team presence | Not relevant to a WooCommerce CRM. |
| Icon-only sidebar with no labels | Poor learnability and accessibility. |
| Very light grey captions (about 10 to 11px) such as "vs last week" | Fails contrast and legibility. Minimum is 12px at AA contrast. |
| Free-text product names as a table column | Orders have multiple line items; show first item plus "+N more". |
| Stock illustration blobs and 3D shapes | Marketing-style decoration. Reserved for the empty-state and sign-in screens only. |

---

## 3. Technology choices (front end)

These are recommendations; the PRD fixes only React, Express and Supabase.

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React + TypeScript | Fast dev loop, typed props and API contracts |
| Styling | Tailwind CSS v4 with CSS-variable tokens | Tokens map to utilities; no runtime cost |
| Components | shadcn/ui on Radix primitives | Accessible dialogs, menus, tabs, tooltips; code is owned in repo |
| Data fetching | TanStack Query | Caching, pagination, optimistic updates, retry |
| Tables | TanStack Table | Headless; we own markup and accessibility |
| Forms | React Hook Form + zod | Reuse the same zod schemas as the Express API |
| Charts | Recharts | Declarative, themeable with tokens |
| Icons | lucide-react | One consistent 24px stroke set |
| Realtime | `@supabase/supabase-js` (Auth + Realtime only, per PRD 4.2) | |
| i18n / formatting | `react-i18next` + `Intl` APIs | The reference UI is French; plan for multiple locales |
| Docs and QA | Storybook, Playwright, axe-core | Component catalogue, visual regression, a11y checks |

---

## 4. Design tokens

Tokens are the single source of truth. Define them as CSS variables, expose them to Tailwind, and never hard-code values in components.

### 4.1 Colour

#### Brand

| Token | Value | Use |
|---|---|---|
| `--primary-50` | `#EEF1FF` | Tinted backgrounds, selected rows |
| `--primary-100` | `#E0E5FF` | Icon tiles, hover tint |
| `--primary-200` | `#C7D0FF` | Borders on tinted surfaces |
| `--primary-300` | `#A3B0FF` | Chart secondary |
| `--primary-400` | `#7C8BFB` | Chart tertiary |
| `--primary-500` | `#5B6CF5` | Focus glow, charts |
| `--primary-600` | `#3D4EE8` | **Primary actions, links, active nav** (white text on it is about 6:1) |
| `--primary-700` | `#3140C4` | Hover and pressed |
| `--primary-800` | `#2A369F` | Active on dark surfaces |
| `--primary-900` | `#262F7E` | Headings accent, dark brand surfaces |

#### Neutrals

| Token | Value | Use |
|---|---|---|
| `--neutral-0` | `#FFFFFF` | Cards, inputs |
| `--neutral-25` | `#F6F7FB` | App background |
| `--neutral-50` | `#F1F5F9` | Subtle fills, table header |
| `--neutral-100` | `#E5E8F0` | Default borders, dividers |
| `--neutral-200` | `#CBD5E1` | Input borders, strong dividers |
| `--neutral-300` | `#94A3B8` | Disabled text and icons only |
| `--neutral-500` | `#64748B` | Muted text (about 4.8:1 on white, the lightest allowed text colour) |
| `--neutral-600` | `#475569` | Secondary text |
| `--neutral-700` | `#334155` | Body emphasis |
| `--neutral-900` | `#0F172A` | Headings and primary text |

#### Semantic and status

| Role | Background | Text / icon | Border |
|---|---|---|---|
| Success | `#ECFDF3` | `#15803D` | `#BBF7D0` |
| Warning | `#FFFBEB` | `#B45309` | `#FDE68A` |
| Danger | `#FEF2F2` | `#B91C1C` | `#FECACA` |
| Info | `--primary-50` | `--primary-700` | `--primary-200` |
| Accent (refunds) | `#F5F3FF` | `#6D28D9` | `#DDD6FE` |
| Neutral | `--neutral-50` | `--neutral-600` | `--neutral-100` |

All text and icon colours above are chosen to meet 4.5:1 against their background pair. Re-check with a contrast tool whenever a value changes.

#### Order status mapping

WooCommerce statuses map to pill styles. Unknown or plugin-defined statuses render as Neutral with the raw slug (the database stores status as a string for this reason).

| Woo status | Label (en) | Style |
|---|---|---|
| `pending` | Pending payment | Warning |
| `processing` | Processing | Info |
| `on-hold` | On hold | Warning |
| `completed` | Completed | Success |
| `cancelled` | Cancelled | Neutral |
| `refunded` | Refunded | Accent |
| `failed` | Failed | Danger |
| other | raw slug | Neutral |

The "New / Pending / In progress / Completed" summary cards in the CRM reference map to counts of `pending`, `on-hold`, `processing`, `completed`. "New" is not a Woo status; use "Today" (orders created today) if a fourth card is wanted.

#### Data visualisation palette

Categorical, in this order: `#3D4EE8`, `#14B8A6`, `#F59E0B`, `#8B5CF6`, `#EC4899`, `#64748B`. Rules:

- Never rely on colour alone. Show values or labels, and add direct labels or a legend with values (as the donut does in the reference).
- Max 6 series per chart; group the remainder into "Other".
- Gridlines use `--neutral-100`; axis text uses `--neutral-500`, 12px.

#### Dark theme

Tokens are semantic (`--bg-page`, `--bg-surface`, `--text-primary`, `--border-default`, ...) so dark mode is a token swap, not a rewrite. Light theme ships first; dark theme is P2. When added, drive it from `prefers-color-scheme` plus a user toggle, and re-verify every contrast pair.

### 4.2 Typography

Font: **Inter** (variable), fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Self-host the font files; do not depend on a third-party CDN at runtime.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| Display | 32 / 40 | 700 | Sign-in and empty-state headline |
| H1 | 24 / 32 | 600 | Page title |
| H2 | 20 / 28 | 600 | Section / card group title |
| H3 | 16 / 24 | 600 | Card title |
| Body | 14 / 20 | 400 | Default text, table cells |
| Body large | 16 / 24 | 400 | Long-form text, email body |
| Label | 13 / 18 | 500 | Form labels, table headers |
| Caption | 12 / 16 | 500 | Helper text, timestamps |
| KPI value | 28 / 36 | 700 | Dashboard numbers |

Rules: never below 12px; use `font-variant-numeric: tabular-nums` for all numbers in tables, KPIs and charts so columns align; sentence case everywhere (not Title Case, not ALL CAPS); line length for prose 60 to 80 characters.

### 4.3 Spacing, sizing and shape

- **Base unit 4px.** Scale: `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- **Card padding** 20px (16px on mobile). **Gap between cards** 24px (16px on mobile).
- **Radius:** `--radius-sm` 6px (inputs, small buttons), `--radius-md` 10px (buttons, menus), `--radius-lg` 16px (cards, modals), `--radius-full` (pills, avatars).
- **Control heights:** small 32px, default 36px, large 44px (primary page actions, touch contexts). Inputs 40px.
- **Minimum interactive target** 32px square (exceeds WCAG 2.2 AA minimum of 24px); 44px on touch layouts.

### 4.4 Elevation and borders

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(16,24,40,.06)` | Cards (with 1px `--neutral-100` border) |
| `--shadow-md` | `0 4px 16px rgba(16,24,40,.08)` | Dropdowns, popovers, hovered cards |
| `--shadow-lg` | `0 12px 32px rgba(16,24,40,.14)` | Modals, drawers |

Cards use a border **and** a light shadow. The shadow alone does not meet 3:1 non-text contrast for boundaries.

### 4.5 Motion

| Token | Value |
|---|---|
| `--duration-fast` | 120ms (hover, focus) |
| `--duration-base` | 200ms (menus, tabs) |
| `--duration-slow` | 300ms (drawers, modals) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

Motion is functional only: state change, entry and exit, new-row highlight (2s fade from `--primary-50`). Under `prefers-reduced-motion: reduce`, disable transitions and sparkline animation; keep the highlight as a static tint that clears after 2s.

### 4.6 Layering

`base 0` · `sticky header 10` · `dropdown 20` · `drawer / modal 30` · `toast 40` · `tooltip 50`. No arbitrary `z-index` values in feature code.

### 4.7 Implementation (`client/src/styles/tokens.css`)

```css
:root {
  /* brand */
  --primary-50: #eef1ff;  --primary-100: #e0e5ff; --primary-200: #c7d0ff;
  --primary-500: #5b6cf5; --primary-600: #3d4ee8; --primary-700: #3140c4;

  /* neutrals */
  --neutral-0: #ffffff;   --neutral-25: #f6f7fb;  --neutral-50: #f1f5f9;
  --neutral-100: #e5e8f0; --neutral-200: #cbd5e1; --neutral-500: #64748b;
  --neutral-600: #475569; --neutral-900: #0f172a;

  /* semantic (components use these, never the raw scale) */
  --bg-page: var(--neutral-25);
  --bg-surface: var(--neutral-0);
  --bg-subtle: var(--neutral-50);
  --text-primary: var(--neutral-900);
  --text-secondary: var(--neutral-600);
  --text-muted: var(--neutral-500);
  --border-default: var(--neutral-100);
  --border-input: var(--neutral-200);
  --action-primary: var(--primary-600);
  --action-primary-hover: var(--primary-700);
  --focus-ring: var(--primary-600);

  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(16,24,40,.06);
  --shadow-md: 0 4px 16px rgba(16,24,40,.08);
  --shadow-lg: 0 12px 32px rgba(16,24,40,.14);
}

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

With Tailwind v4, map these in an `@theme` block so utilities like `bg-surface` and `text-muted` resolve to the variables.

---

## 5. Iconography and imagery

- lucide-react, 20px in navigation and buttons, 16px inline with text, 24px in KPI tiles. Stroke width 1.75 to 2, `currentColor`.
- Icons accompany a text label unless the control has an accessible name and tooltip (for example the row "more" menu).
- KPI icon tiles: 40px square, `--radius-md`, tinted background (`--primary-100`, success, warning, accent) with the matching dark icon.
- Avatars: 32px in tables, 40px in header, initials fallback on a tinted background. Customers have no photos; use initials.
- Illustrations only on sign-in and empty states; flat, one or two brand colours, decorative (`alt=""`).

---

## 6. Components

All components live in `client/src/components/` with a Storybook story per variant and state. Behaviour follows the WAI-ARIA Authoring Practices.

### 6.1 Core components

| Component | Specification |
|---|---|
| **Button** | Variants: primary (filled `--primary-600`), secondary (white, border), ghost, destructive (danger), link. Sizes sm/md/lg. States: default, hover, active, focus-visible, disabled, loading (spinner replaces icon, width stays fixed, `aria-busy`). One primary button per view region. Label is a verb: "Save changes", "Mark as shipped". |
| **Input / Textarea** | 40px, border `--border-input`, radius sm. Always a visible `<label>`; placeholder is a hint only. Error: danger border + icon + message linked with `aria-describedby`. Helper text below in Caption. |
| **Select / Combobox** | Radix-based. Combobox with async search for customers. Keyboard: arrows, type-ahead, Esc. |
| **Search field** | Top bar global search (customers, orders by number or email). `/` focuses it. Debounce 250ms. Shows recent results; empty result suggests clearing filters. |
| **Status pill** | 24px high, radius full, 12px/500 text, 6px dot or icon, colours from section 4.1. Never colour only: always text label. |
| **Badge / count** | Small numeric chip for tabs and nav (for example failed events). Caps at "99+". |
| **Card** | `--bg-surface`, 1px border, radius lg, shadow-sm, padding 20. Optional header (title H3 + action link "View all") and footer. |
| **KPI card** | Icon tile, label (Label), value (KPI value), delta chip, comparison caption ("vs last week", Caption at AA contrast), sparkline (decorative, `aria-hidden`). First card may use the solid primary treatment with white text; the delta must not rely on colour alone (arrow icon + sign + text, for example "+12.5%"). Whole card is a link when it drills down. |
| **Data table** | See 6.2. |
| **Tabs** | Underline style, Radix. Used on Customer 360 and Order detail. Tab panel content lazy-loaded. |
| **Dialog / Drawer** | Dialog for confirmations and short forms (max 560px). Right drawer (480px) for quick-view and filters. Focus trap, Esc closes, focus returns to trigger, scroll locked behind. |
| **Dropdown menu** | Row actions and user menu. Arrow-key navigation. Destructive items last, in danger colour, separated. |
| **Toast** | Bottom-right, 5s auto-dismiss (persist while hovered or focused), `aria-live="polite"`; errors use `assertive` and persist until dismissed. Max 3 stacked. |
| **Tooltip** | Supplementary only (never the sole carrier of information). 300ms delay, shows on focus too. |
| **Pagination** | "1 to 25 of 141", previous / next, numbered pages with ellipsis, page-size select (25, 50, 100). Server-side. |
| **Filter bar** | Search + filter chips + sort + "Clear all". Active filters shown as removable chips; state stored in the URL query string so views are shareable and survive refresh. |
| **Date range picker** | Presets (Today, 7 days, 30 days, This month, Custom). Shows absolute dates. Keyboard operable. |
| **Skeleton** | Matches final layout of the component; no spinner on full-page loads. |
| **Empty state** | Illustration (decorative), one-line explanation, one primary action ("Run full import"). |
| **Banner / Alert** | Inline, full-width within a region: info, success, warning, danger. Used for sync problems and disabled webhooks. `role="status"` or `role="alert"` by severity. |
| **Timeline** | Vertical list for order status history and message history: dot, label, source chip (`Woo` or `CRM`), actor, timestamp. |
| **Avatar** | Initials, 3 sizes, tinted by hash of name from the data-viz palette. |
| **Tag chip** | Customer tags; removable in edit mode. Neutral style; "VIP" uses Accent. |
| **Code / JSON viewer** | Read-only, monospaced, collapsible; for failed webhook payloads in Sync Center. Mask email and phone by default with "Reveal" toggle (privacy requirement). |

### 6.2 Data table standard

Applies to Customers, Orders, Messages, Workflow runs and Failed events.

- **Layout:** header row 44px, `--bg-subtle`, Label style, sticky on scroll. Body rows 52px (comfortable) or 40px (compact toggle, persisted per user). Row hover `--primary-50`. No zebra striping. 1px bottom borders.
- **Columns (Orders):** Order # (link) · Customer (name, email on second line) · Items (first item, "+N more") · Total (right-aligned, tabular, currency from the order) · Date · Payment · Status pill · row menu.
- **Columns (Customers):** Name (avatar + name) · Email · Orders · Lifetime value (right-aligned) · Last order · Tags · Marketing (opt-in icon + text) · row menu.
- **Sorting:** header buttons with `aria-sort`; one sort at a time; default Orders by date descending, Customers by last order descending.
- **Selection:** checkbox column only where a bulk action exists (for example CSV export).
- **Row click:** whole row navigates to detail, but the order number remains a real link for keyboard and screen readers. Row menu clicks do not trigger navigation.
- **Responsive:** below 768px, wrap in a horizontally scrollable region with the first column sticky, or switch to a stacked card list.
- **States:** loading (skeleton rows), empty (no data vs no results are different messages), error (inline banner with retry).
- **Realtime:** new rows from Realtime appear at the top of page 1 only when the sort is the default; otherwise show a "3 new orders, refresh" chip so the list does not reorder under the agent's cursor.
- **Accessibility:** semantic `<table>` with `<caption>` (visually hidden), `scope="col"`, and an `aria-live` region announcing result counts after filtering.

---

## 7. Layout and navigation

### 7.1 App shell

```
┌──────────┬──────────────────────────────────────────────────────┐
│ Logo     │  [ Search customers, orders…        ]   ●  Sync  🔔  👤│  64px top bar (sticky)
│          ├──────────────────────────────────────────────────────┤
│ Dashboard│  Page title                        [Primary action]  │
│ Customers│  Subtitle / date range                               │
│ Orders   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│ Workflows│  │  KPI   │ │  KPI   │ │  KPI   │ │  KPI   │         │
│ Messages │  └────────┘ └────────┘ └────────┘ └────────┘         │
│ Sync     │  Content cards on a 12-column grid, 24px gaps         │
│ Settings │                                                      │
│          │                                                      │
│ [avatar] │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
 240px (72px collapsed)        content max-width 1440px
```

- **Sidebar:** 240px with labels; collapsible to a 72px icon rail with tooltips; collapse state persisted. Active item: `--primary-600` fill with white text, or `--primary-50` with primary text and a 3px left bar (pick one and apply consistently). Group order follows daily use: Dashboard, Customers, Orders, Workflows, Messages, Sync Center, then Settings pinned to the bottom.
- **Role-aware navigation:** Settings is hidden for agents. Workflows is visible to agents as read-only (view runs). Disabled create / edit controls are removed, not merely greyed out, unless the reason is explained in a tooltip.
- **Top bar:** global search, **sync status indicator** (green "Synced 2 min ago", amber "Queue: 12", red "3 failed", links to Sync Center), notifications, user menu (profile, theme, sign out).
- **Breadcrumbs** on detail pages: `Orders / #5281`.
- **Grid:** 12 columns, 24px gutters, content padding 24px (16px under 768px).

### 7.2 Breakpoints and responsive behaviour

| Breakpoint | Width | Behaviour |
|---|---|---|
| sm | 640px | Single column, drawer navigation (hamburger) |
| md | 768px | Two-column KPI grid, tables scroll horizontally |
| lg | 1024px | Collapsed rail by default, 12-column grid |
| xl | 1280px | Full sidebar, 4-up KPI row |
| 2xl | 1536px | Content capped at 1440px, centred |

Desktop is the primary target. Tablet and phone must support reading, searching, viewing order and customer details, and changing an order's status and tracking; building workflows is desktop-only.

---

## 8. Page blueprints

### 8.1 Dashboard (PLT-2)

```
Good morning, Camille 👋                         [ This week ▾ ]
Here's an overview of your store today.

[ Revenue ◼ ] [ Orders ]  [ New customers ] [ Avg. order value ]   KPI row (4)
  82,340 €      128 ▼8.2%     42 ▲16.7%         246 € ▲5.5%        + sparklines

┌ Revenue, last 7 days (bar) ───────────────┐ ┌ Orders by status (donut) ─┐
│                                           │ │  legend with count and %   │
└───────────────────────────────────────────┘ └────────────────────────────┘

┌ Sync health ─────────┐ ┌ Queue depth ─────┐ ┌ Failed events ──┐ ┌ Email delivery ┐
│ ● Synced 2 min ago   │ │ 12 pending       │ │ 3  [Review]     │ │ 97%            │
└──────────────────────┘ └──────────────────┘ └─────────────────┘ └────────────────┘

┌ Recent orders (live) ─────────────────────────────────────────────────────┐
└───────────────────────────────────────────────────────────────────────────┘
```

Data from `GET /api/dashboard/summary`. The date range controls revenue, orders and new customers; sync health always reflects now. Deltas compare with the previous period of equal length and state that in the caption.

### 8.2 Orders list (ORD-1)

Summary cards (counts by status, clickable to apply the filter) → filter bar (search, status, date range, amount, customer) → data table → pagination. Primary action in the reference is "New order"; **the CRM does not create orders** (PRD non-goal), so the header has "Export" (P1) instead.

### 8.3 Order detail (ORD-2, ORD-3, ORD-4)

```
Orders / #5281            [Processing]                [Mark as shipped ▾]
Placed 21 May 2026, 14:02 · Card payment · EUR

┌ Items ─────────────────────────────┐ ┌ Customer ────────────────────┐
│ Suite Pro            1 × 980,00 €  │ │ Élodie Martin  [VIP]         │
│ Subtotal / Shipping / Tax / Total  │ │ elodie@…  · View profile     │
│ Refunded: −150,00 €  (ORD-6)       │ │ Billing / Shipping addresses │
└────────────────────────────────────┘ └──────────────────────────────┘
┌ Fulfilment ────────────────────────┐ ┌ Timeline ────────────────────┐
│ Carrier [ ▾ ]  Tracking [        ] │ │ ● Completed   CRM · Camille  │
│ Status  [ Processing ▾ ]  [Save]   │ │ ● Processing  Woo            │
│ ⓘ Marking as Shipped emails the    │ │ ● Pending     Woo            │
│   customer (Order shipped).        │ └──────────────────────────────┘
└────────────────────────────────────┘
┌ Internal notes (ORD-7) ────────────────────────────────────────────────┐
```

Write-back interaction (INT-8, INT-9): on Save the button shows loading, the status pill shows "Syncing to WooCommerce…", then success toast, or an inline danger banner with **Retry** if the push failed. The CRM value is never shown as final until the push resolves. Before saving a status that triggers an email, the form states which workflow will send what.

### 8.4 Customer list and Customer 360 (CUS-1, CUS-2)

List per 6.2. Profile header: avatar, name, tags, marketing opt-in state, lifetime value, order count, last order date. Tabs: **Orders · Messages · Notes · Details**. Segment chips (New, Repeat, VIP, Lapsed) are computed and read-only. Adding a note or tag is inline, with optimistic update.

### 8.5 Workflows (COM-1 to COM-7)

List: name, trigger, enabled switch (admin only), last run, success rate. Editor is a **linear stepper**, not a drag-and-drop canvas (non-goal in the PRD):

1. **Trigger** (event, optional delay)
2. **Conditions** (rows of field, operator, value; "all of" / "any of")
3. **Actions** (send email template, add tag, add note)
4. **Review** (plain-language summary, email preview with sample data, **Enable** switch)

A workflow that sends marketing email shows a persistent note: "Opted-out customers are skipped automatically." Run log: table with status pill, entity link, timestamp; row expands to step-by-step log and error detail.

### 8.6 Messages and templates (COM-6, COM-8)

Message history table (customer, template, subject, status, sent time). Template editor: left form (name, subject, body with variable picker), right live preview using sample data, with a toggle for desktop and mobile width. Unknown variables are highlighted with an error before save.

### 8.7 Sync Center (INT-11)

Top: status banner (healthy / degraded / failing). Cards: last full import, last backfill, queue depth, failed count, webhook health. Table of failed events (topic, delivery id, attempts, error, received) with **Retry** per row and "Retry all". Row expands to the payload (masked PII). **Run full import** is a secondary button behind a confirm dialog with a progress bar (determinate, with counts) once started.

### 8.8 Settings (PLT-4)

Tabs: **WooCommerce · Email · Team · Segments**. Secret fields are write-only: show "Saved" with a **Replace** action, never the stored value. Each integration has a **Test connection** button with inline result. Team tab: user list, role select (admin / agent), invite. Destructive or access-changing actions require confirmation.

### 8.9 Sign-in

Centred card on the pale background with the single permitted illustration. Email and password, clear error messages that do not reveal whether the email exists, "Forgot password" link.

---

## 9. Interaction patterns

### 9.1 System states

Every data region implements all five states: **loading** (skeleton), **empty** (first use, with the next action), **no results** (filters applied, with "Clear filters"), **error** (what happened, retry, no stack traces), **success/live**. Stale data is labelled ("Updated 3 min ago") when Realtime is disconnected, with a reconnect banner.

### 9.2 Forms and validation

- Validate on blur and on submit using the shared zod schema; show field-level errors and an error summary at the top for long forms that receives focus on failed submit.
- Required fields are marked in the label text ("Required" or "(optional)"), not by colour or asterisk alone.
- Preserve input on failure. Disable submit only while submitting, not while the form is invalid.
- Warn on navigation with unsaved changes.

### 9.3 Confirmation and destructive actions

| Action | Pattern |
|---|---|
| Change order status that triggers a customer email | Inline notice before save naming the email |
| Enable a workflow | Confirm dialog summarising trigger and action |
| Delete workflow / template | Confirm dialog naming the object; focus on Cancel |
| Run full import, Retry all failed | Confirm dialog with expected impact |
| Remove team member / change role | Confirm dialog |

Prefer **undo** (toast with "Undo" for 8s) over confirmation for reversible changes such as tags and notes.

### 9.4 Optimistic updates and conflicts

Use optimistic updates for tags and notes. Do **not** present order status or tracking as final until the Woo push returns (see 8.3). If Realtime delivers a change to the record the agent is editing, show an inline banner ("This order was updated by Woo. Reload to see changes") instead of overwriting their form.

### 9.5 Realtime

New orders animate into the Recent Orders list with the 2s highlight and a polite live-region announcement ("New order 5282 from Sophie Bernard"). Toasts for new orders are off by default, since volume can be high. Subscribe only to `orders`, `customers` and `order_events` (see database.md section 6).

### 9.6 Search, filter and sort

State lives in the URL (`?status=processing&from=2026-05-01&sort=-date&page=2`). Back and forward buttons work. Filters apply on change with debounce, no separate "Apply" button except in the mobile filter drawer.

### 9.7 Privacy in the UI

- Mask email and phone in raw payload viewers and error messages by default.
- Never put customer PII in toasts, page titles or URLs (use IDs).
- Show marketing opt-in state wherever a marketing message could be sent.

---

## 10. Content, localisation and formatting

- **Voice:** direct, plain, no jargon or exclamation marks. Errors say what happened and what to do: "Couldn't update WooCommerce. Check the store connection in Settings, then retry."
- **Greeting** uses the first name from `profiles.full_name`, falling back to no name.
- **Currency:** always `Intl.NumberFormat` with the **order's own currency code** (`orders.currency`); never assume a single store currency. Mixed-currency aggregates must be labelled or split.
- **Dates:** `Intl.DateTimeFormat`, user's locale. Tables show absolute dates; timelines show relative time with the full timestamp in a tooltip. Stored in UTC, displayed in the browser's timezone.
- **Numbers:** compact notation for KPIs above 9,999 (82.3K) with the full value in a tooltip and accessible label.
- **i18n:** all strings go through `t()`; no concatenated sentences; allow 30% text expansion. The reference mockup is French, so French is a likely second locale.
- **Status labels** are translated; the underlying Woo slug is never shown except for unknown statuses.

---

## 11. Accessibility (WCAG 2.2 AA)

| Area | Requirement |
|---|---|
| Contrast | Text 4.5:1 (3:1 for 18px+ or 14px bold+); UI boundaries, icons and focus indicators 3:1 |
| Keyboard | Every function reachable and operable by keyboard; logical tab order; no keyboard traps; skip-to-content link as first focusable element |
| Focus | Visible 2px ring with 2px offset on every focusable element; focus never hidden behind sticky headers (set `scroll-padding-top` to header height) |
| Target size | Minimum 32px for controls (WCAG 2.2 minimum is 24px) |
| Semantics | Landmarks (`header`, `nav`, `main`), one `h1` per page, heading order not skipped, real `<button>` and `<a>` elements |
| Forms | Programmatic labels, errors tied with `aria-describedby`, `autocomplete` attributes, no placeholder-only labels |
| Status | Not conveyed by colour alone (pills have text, deltas have arrows and signs) |
| Charts | Each chart has a text summary and an accessible data table alternative (visually hidden or toggle); decorative sparklines are `aria-hidden` |
| Live updates | `aria-live="polite"` for realtime and toasts; `assertive` only for failures |
| Motion | Respect `prefers-reduced-motion`; nothing flashes more than 3 times a second |
| Zoom / reflow | Usable at 200% zoom and 320px width without two-dimensional scrolling (tables excepted) |
| Authentication | No cognitive-test-only login; allow paste into password fields |
| Testing | `axe-core` in CI on every page and Storybook story, plus a manual keyboard and screen-reader pass (NVDA or VoiceOver) before release |

---

## 12. Performance budgets

| Metric | Budget |
|---|---|
| Largest Contentful Paint | under 2.5s on a mid-range laptop, cable connection |
| Interaction to Next Paint | under 200ms |
| Cumulative Layout Shift | under 0.1 (skeletons match final dimensions) |
| Initial JS per route | under 200KB gzipped; route-level code splitting; Recharts and the template editor lazy-loaded |
| List response | under 1s for 10k records (PRD), server-side pagination, 25 rows per page default |
| Fonts | Self-hosted, `font-display: swap`, Latin subset first |

Tables over 100 visible rows use virtualisation; the default pagination avoids this in practice.

---

## 13. Email design standard (workflow and transactional)

Emails are part of the product experience (COM-6).

- 600px max width, single column, table-based layout with inline CSS for client compatibility; web-safe font stack (system fonts), 16px body, 1.5 line height.
- One primary button (bulletproof, at least 44px high) per email; text link fallback underneath.
- Always include a **plain-text alternative** and a preheader.
- Marketing templates (`is_marketing = true`) include the footer with store identity, reason for receiving the message, and the unsubscribe link built from `customers.unsubscribe_token` (COM-11). Transactional templates (confirmation, shipped) do not include marketing content.
- Contrast and font-size rules from section 11 apply; do not use images for essential text; provide `alt` text.
- Variables render with safe fallbacks (`{{customer.first_name | default: "there"}}`); the preview flags any unresolved variable.
- Test in a sandbox inbox plus at least one dark-mode client before enabling a workflow.

---

## 14. Front-end code standards

### 14.1 Structure (extends PRD 4.4)

```
client/src/
├── api/            # typed API client + TanStack Query hooks per resource
├── auth/           # Supabase session, route guards, role helpers
├── components/
│   ├── ui/         # design-system primitives (Button, Input, StatusPill, ...)
│   └── domain/     # OrderTable, CustomerHeader, WorkflowStepper, ...
├── hooks/          # useRealtime, useUrlState, useDebounce
├── layouts/        # AppShell, AuthLayout
├── pages/          # Dashboard, Customers, Orders, Workflows, Messages, SyncCenter, Settings
├── i18n/           # locale files
├── lib/            # formatters (money, date), zod schemas shared with the API
└── styles/         # tokens.css, global.css
```

### 14.2 Rules

- Feature code uses `components/ui` and tokens only; no raw colours, pixel values outside the scale, or inline styles for design properties.
- Components are small, typed, and accept `className` for layout only. Variants via `class-variance-authority`.
- Server state in TanStack Query; URL state for filters; component state for ephemeral UI. No global store unless a need is shown.
- The browser talks to Supabase **only** for Auth and Realtime. All data goes through the Express API (PRD 4.2); never import the service-role key.
- Role checks in the UI are a convenience; the API is the enforcement point.
- Naming: components `PascalCase`, hooks `useThing`, files match the default export, tokens `kebab-case`.

### 14.3 Quality gates

ESLint (including `jsx-a11y`), Prettier, TypeScript strict, unit tests for formatters and status mapping, Storybook interaction tests for components, Playwright for the demo flows in PRD section 10, `axe-core` in CI, visual-regression snapshots for core components.

---

## 15. Definition of done (UI work)

- [ ] Uses only tokens and shared components; Storybook story added or updated
- [ ] All five states implemented (loading, empty, no results, error, success)
- [ ] Responsive at 320, 768, 1024 and 1440px
- [ ] Keyboard-only walkthrough passes; focus order and visible focus verified
- [ ] `axe-core` reports no violations; contrast verified for any new colour pair
- [ ] Strings externalised for i18n; money and dates use `Intl`
- [ ] No PII in logs, toasts, URLs or page titles
- [ ] Customer-facing side effects (emails, write-back) are stated in the UI before they happen
- [ ] Realtime behaviour does not reorder or overwrite what the user is working on
- [ ] Performance budgets met on the route (bundle size, CLS)

---

## 16. Assumptions and open items

1. **Brand identity.** The primary colour and Inter are derived from the references. Replace `--primary-*` values if the project has its own brand; contrast must be re-verified.
2. **Dark theme** is specified structurally but scheduled as P2.
3. **Default locale and second locale.** English is assumed as default; the French reference suggests French as the likely second language.
4. **Orders board view** (Kanban by status, inspired by the FlowTask reference) is optional (P2). If built, dragging a card changes status and therefore triggers a write-back; it must follow the confirmation and sync-state rules in 8.3 and 9.3.
5. **Mobile scope.** Workflow building is desktop-only in v1.
6. **Hi-fi mockups.** This document specifies the system; screen mockups should be produced in Figma (or equivalent) from sections 6 to 8 before the frontend phase (PRD milestone 5).