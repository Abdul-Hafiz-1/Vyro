# VYRO Reference Teardown & Design System Derivation

## Part 1: Measured Reference Teardowns

### 1. Linear (App & Inbox Architecture)
- **Content Max-Width**: 1120px in centered container views; full-bleed with min-360px list and flexible detail pane in split inbox view.
- **Nav / Top Bar Height**: 48px fixed height with 1px hairline border below (`#232528` in dark, `#E5E7EB` in light).
- **Typography**:
  - Headings: 20px / 28px line-height (Section), 28px / 34px (View Title).
  - Body: 14px–16px / 22px line-height.
  - Numbers: Tabular numerals throughout.
- **Border Radius**: 8px–10px for interactive controls (buttons, inputs, menus); 14px–16px for card containers and modal sheets.
- **Border & Dividers**: 1px solid hairline (`#262B28` equivalent), no thick outlines, zero blurred dropshadows.
- **Color Discipline**:
  - Dark base: `#0C0E0D` / `#141715` surface.
  - Text: `#F2F4F0` primary, `#A0A7A1` muted secondary.
  - Accent: High-contrast single accent (used exclusively for selection, active tabs, and primary triggers).
- **Row Heights in Lists**: 44px–48px per row, strict vertical cadence.
- **Button Heights**: 36px (sm), 42px (md), 48px (lg).
- **Hover / Selected States**:
  - Hover: subtle surface shift (`#1A1E1B`), 150ms transition.
  - Selected / Active: high-contrast fill or volt accent marker with distinct border.
- **Empty & Loading States**: Clean skeletal rows (16px height, rounded-md) with 1.5s pulse; empty states feature concise 2-sentence copy with inline SVG diagram.
- **Motion Timing**: 150ms–200ms ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **What makes it feel the way it does**:
  1. Low visual friction from razor-thin 1px borders and disciplined monochrome hierarchy.
  2. Keyboard-first speed where list navigation (J/K) and actions (A/D) provide instant mechanical certainty.
  3. Absolute absence of marketing fluff, gradients, or decorative noise in functional surfaces.

---

### 2. Stripe (Dashboard & Checkout)
- **Content Max-Width**: 1080px–1120px max-width, strictly centered.
- **Typography**:
  - Display / Giant Numerals: 56px–72px / 1.1 line-height for primary financial figures and total invoice amounts.
  - Page Titles: 32px–36px / 1.25 line-height.
  - Body: 16px / 24px line-height.
  - Captions / Meta: 14px / 20px line-height (never smaller than 14px).
- **Summary Panel**:
  - Dedicated right-hand sticky panel (380px–420px width) anchoring the payment terms, line-item breakdown, and checkout CTA.
- **Border Radius**: 10px on inputs and buttons, 16px on payment cards and summary sheets.
- **Border & Hairlines**: 1px subtle divider lines (`#E2E3DC` in light, `#262B28` in dark).
- **Button Heights**: 44px standard primary action height, full-width on transaction execution.
- **What makes it feel the way it does**:
  1. High-trust mathematical clarity anchored by oversized tabular numbers for prices.
  2. Unambiguous visual separation between agreement terms and payment execution.
  3. Calm confidence derived from deliberate white space and zero unnecessary iconography.

---

### 3. Fiverr (Marketplace Service Cards & Packages)
- **Card Structure**: 2-column and 3-column asymmetric grid; cards have 16px radius, 1px perimeter border.
- **Card Content Rhythm**:
  - Header: Merchant avatar (36px), display name, and verified tick icon.
  - Visual: Category geometric banner / service cover (160px height).
  - Title: 16px font-weight 600, clamped to 2 lines.
  - Footer: Delivery duration pill ("3 days") left-aligned, prominent "From $X" right-aligned in 18px bold.
- **What makes it feel the way it does**:
  1. Instant merchant comprehension: who is selling, what they do, and what it costs.
  2. Delivery duration and price are never hidden behind clicks.
  3. Predictable card anatomy that allows fast, effortless scanning.

---

### 4. Lovable (Hero Prompt & Contextual Agent States)
- **Prompt Container**:
  - Prominent centered hero card (56px–64px height single-line or expandable multiline) with 14px–16px border radius.
  - Integrated right-aligned submit button.
  - Suggestion chips arranged horizontally below with 8px gap.
- **Progressive Disclosure & State**:
  - Real-time agent status line ("Negotiating with 3 sellers…") placed directly in the workflow rather than hidden in logs.
- **What makes it feel the way it does**:
  1. Natural language as the primary input mechanism makes complex orchestration approachable.
  2. Human reassurance through conversational, transparent status updates.
  3. Clean separation between user intent (the prompt) and background AI execution.

---

### 5. Ramp (Approvals & Decision Exception Pattern)
- **Decision Architecture**:
  - Exception-driven workflow: transactions within auto-approval limits proceed silently; out-of-policy items route to an approvals inbox.
  - Decision Card: Highlights the exact deviation in plain words ("Pixel Studio asked for $155. Your limit is $150.") alongside recommendations.
  - Actions: Three primary triggers: Approve (accent), Counter (secondary), Decline (destructive). Keyboard shortcuts A, C, D mapped directly.
- **What makes it feel the way it does**:
  1. Zero administrative fatigue: humans only evaluate genuine anomalies.
  2. Context is front-and-center so decisions take less than 3 seconds.
  3. Reversible actions with clear audit trails.

---

### 6. Airbnb (Booking Stepper Flow)
- **Flow Rhythm**:
  - One primary question per view (Step 1: Scope → Step 2: Budget & Deadline → Step 3: Review).
  - Persistent thick progress indicator ("Step 2 of 3").
  - Large form inputs (min-height 52px) with generous 16px padding.
  - Non-destructive "Back" button always accessible in the top-left.
- **What makes it feel the way it does**:
  1. Mental focus from eliminating irrelevant inputs until the current decision is resolved.
  2. Transparent progress tracking prevents abandonment anxiety.
  3. Big tactile hit-targets that feel comfortable on both mobile and desktop.

---

### 7. Raycast & Linear (Command Palette)
- **Modal Dimensions**: 640px max-width, centered in viewport with 120px top offset.
- **Interactions**:
  - Global `⌘K` / `Ctrl+K` trigger.
  - Fast fuzzy filtering over navigation routes, active deals, marketplace listings, and system settings.
  - Section headers with count markers; right-aligned shortcut indicators.
- **What makes it feel the way it does**:
  1. Instant keyboard shortcut access gives power users maximum velocity.
  2. Unifies search, actions, and page navigation into one muscle memory shortcut.

---

## Part 2: Token Derivation Table

| Token Name | Token Value (Dark) | Token Value (Light) | Derived From Reference | Functional Application |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-base` | `#0C0E0D` | `#FAFAF7` | Linear & Stripe | Primary app background |
| `--surface-base` | `#141715` | `#FFFFFF` | Linear & Stripe | Cards, dialogs, modals, nav |
| `--surface-raised`| `#1A1E1B` | `#F3F3EE` | Linear | Hover states, active chips, dropdowns |
| `--border-hairline`| `#262B28` | `#E2E3DC` | Linear & Stripe | 1px consistent container borders |
| `--text-primary` | `#F2F4F0` | `#0E1210` | Linear & Stripe | Main headings, body, high-contrast labels |
| `--text-muted` | `#A0A7A1` | `#58605A` | Linear | Secondary metadata, dates, descriptions |
| `--accent-volt` | `#D4FF3A` | `#C6F51F` | Lovable & Linear | Primary CTA fill, active tab, focus rings |
| `--status-mint` | `#34D399` | `#0F9D6B` | Stripe Checkout | Paid, approved, completed deals |
| `--status-sun` | `#FFB020` | `#B45F06` | Ramp Approvals | Needs-you exceptions, pending review |
| `--status-rose` | `#FF6B6B` | `#C0392B` | Ramp Approvals | Declined, cancelled, over-budget |
| `--status-sky` | `#8FA3B8` | `#4A5D70` | Linear Statuses | In progress, negotiating with sellers |
| `--radius-control`| `10px` | `10px` | Stripe & Linear | Inputs, buttons, segmented controls |
| `--radius-surface`| `16px` | `16px` | Stripe & Fiverr | Cards, containers, modals, sheets |
| `--radius-pill` | `9999px` | `9999px` | Airbnb & Linear | Status badges, mode switcher only |
| `--font-display` | `Sora, sans-serif` | `Sora, sans-serif` | Product Specification | Bold, geometric headlines (600–700) |
| `--font-body` | `Hanken Grotesk, sans-serif` | `Hanken Grotesk, sans-serif` | Product Specification | Readable 16px body, tabular numbers |
| `--width-content`| `1120px` | `1120px` | Stripe Dashboard | Max container width |
| `--nav-height` | `56px` | `56px` | Linear & Stripe | Top bar height |

---

## Part 3: Reference Map by Screen

| Screen | Primary Reference | Secondary Reference | Core Behavior Borrowed |
| :--- | :--- | :--- | :--- |
| **Today (Inbox & Exception Cockpit)** | **Linear Inbox** | **Ramp Approvals** | Left-hand list + right-hand detail pane with decision card; J/K/A/D/C shortcuts; plain-word reason & suggestion. |
| **Deal Page (Contract & Negotiation)** | **Stripe Dashboard / Checkout** | **Upwork Contracts** | Left-hand chronological deal node stack + right-hand sticky summary panel with giant price numerals and Stepping Stones. |
| **Marketplace (Services)** | **Fiverr Service Cards** | **Airbnb Listings** | 2-column / 3-column cards with category geometric banners, verified badges, delivery times, and "from $X" prices. |
| **Hero Prompt Box** | **Lovable Hero** | **Linear Search** | Centered prompt box with integrated trigger and suggestion chips. |
| **New Request Stepper** | **Airbnb Booking Flow** | **Linear Forms** | Single question per step, thick progress bar, large inputs, non-destructive Back navigation. |
| **Command Palette** | **Raycast / Linear ⌘K** | **Stripe Quick Actions** | Instant global search, navigation, and quick switches. |
| **Landing Page** | **Stripe Typography** | **Lovable Hero & Fiverr Trust** | Bold typographic hierarchy, real interactive decision card preview, honest safety proof. |
