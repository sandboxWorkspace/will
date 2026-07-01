# Will Clinic Hub — Workflow & Design Decisions

> Internal reference. Anchor points (`#section-name`) are stable — link to them when reviewing or onboarding.

---

## Table of Contents

1. [Two Separate Landing Pages](#two-separate-landing-pages)
2. [Character Limits as Guardrails](#character-limits-as-guardrails)
3. [Friction Layer — Recent Requests vs. Form Access](#friction-layer)
4. [Dropdown Default States](#dropdown-default-states)
5. [Section Naming & Hierarchy](#section-naming--hierarchy)
6. [Button Colors and States](#button-colors-and-states)
7. [SEO & Anti-Phishing Meta Tags](#seo--anti-phishing-meta-tags)
8. [XSS Prevention](#xss-prevention)
9. [Firebase: Anonymous Auth vs. Validate Rules](#firebase-anonymous-auth-vs-validate-rules)
10. [Location Detection](#location-detection)
11. [Google Forms as Backend](#google-forms-as-backend)
12. [Build & Deploy](#build--deploy)
13. [Code Modularity: Request Handlers](#code-modularity-request-handlers)

---

## Two Separate Landing Pages

**What:** `index.html` serves Southeast only. `moursund.html` serves Moursund only. No toggle, no query-param routing, no homepage crossover.

**Why:** Each location scans a different QR code. A clinic worker scanning the QR on their wall should land directly on *their* location's page — no tapping, no dropdown, no confusion. Two separate URLs means:
- QR code → `/will/` → Southeast
- QR code → `/will/moursund.html` → Moursund
- No runtime routing to break, no `?loc=` to mistype.

**Trade-off:** More HTML files to maintain. The shared JS (Firebase adapter, formConfig, dataManager) keeps the actual logic DRY.

---

## Character Limits as Guardrails

<a name="character-limits-as-guardrails"></a>

| Location | Field | Limit | Why |
|----------|-------|-------|-----|
| HTML `maxlength` | `equipmentName` (both locations) | **28 chars** | Fits one line in the recent-items card. Prevents layout-breaking long names. Hard browser-enforced limit — user cannot type past it. |
| JS preview truncation | Supply items list | **100 chars** | A comma-joined list of items truncated to 100 chars keeps the card readable. `substring(0, 97) + '...'`. |
| JS preview truncation | `requestDetails` (all forms) | **100 chars** | Long descriptions are collapsed in the recent-items list; full text visible on hover/click. Same `substring(0, 100)` pattern everywhere. |
| JS preview truncation | `equipmentURL` (wishlist) | **30 chars** | URLs are long; 30 chars is enough to identify the link without breaking card layout. |
| JS validation | `equipmentURL` | **1024 chars** | Upper bound to prevent DB bloat or paste-bombs. Only checked in JS, not HTML. |
| Firebase query | Recent items fetch | **10 items** per DataManager default, UI displays up to **15** | Lean DB queries; the extra 5 in UI are for buffer if some get filtered. |
| Change log | Firebase load | **50 entries** | Only last 50 changes loaded — enough for audit trail without bandwidth waste. |
| Metronome | Tempo | **8–280 BPM** | Physical range of a metronome. Hard min/max on the input. |
| Metronome | Volume | **0–100%** | Standard audio range. |

**Principle:** Limits are layered — browser-enforced (`maxlength`), JS-enforced (`validateForm()`), and display-truncated (card previews). Each layer catches a different failure mode (fat-finger, paste-bomb, layout overflow).

---

## Friction Layer — Recent Requests vs. Form Access

<a name="friction-layer"></a>

**Pattern:** Every form page shows **recent requests immediately** (no click needed). The **form itself is behind a collapsed button** labeled "Start [Type] Request."

```
┌─────────────────────────────────────┐
│  Recent Maintenance Requests        │  ← Always visible, loads on page init
│  ┌───────────────────────────────┐  │
│  │ • Fan — Repair (Alex)        │  │
│  │ • Desk — Replace (Jordan)    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [ ▼ Start Maintenance Request ]    │  ← Click to expand form
│  ┌───────────────────────────────┐  │     (hidden by default)
│  │ Your Name: [____________]    │  │
│  │ ...                          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Why (three reasons):**

1. **Social proof** — Showing recent requests first ("other people have submitted, this is real") builds trust and signals the page is working.

2. **Answer-before-submit** — A user might find their question already answered in the recent list (e.g., "oh, someone already reported that broken fan") without duplicating work.

3. **Intentional friction** — The click to open the form is a tiny gate that makes the user self-select into "I want to submit" mode. It prevents accidental form openings, keeps the initial view clean, and reduces cognitive load on page load.

**Contrast with landing pages:** Landing pages (index.html, moursund.html) auto-open the Request Forms section because those are hub pages — the forms section *is* the primary action. The friction layer only applies on form *submission* pages where recent requests serve as context.

---

## Dropdown Default States

<a name="dropdown-default-states"></a>

**Mechanism:** `data-default-open="true"` on the collapse button triggers `toggleCollapse()` on init in `collapsibleSections.js`.

| Page | Section | Default | Why |
|------|---------|---------|-----|
| `index.html` (Southeast) | Request Forms | **Open** | Hub page — primary action visible immediately. |
| `index.html` (Southeast) | Therapy Tools | **Closed** | Secondary — tools are available but don't compete with forms. |
| `index.html` (Southeast) | Quick Links | **Closed** | Tertiary — reference links, not daily use. |
| `moursund.html` | Request Forms | **Open** | Same reasoning as Southeast hub. |
| `moursund.html` | Therapy Tools | **Closed** | Same as Southeast. |
| `moursund.html` | Quick Links | **Closed** | Same as Southeast. |
| `v2index.html` | Internal Dev Tools | **Open** | Experimental page — dev tools are the reason to visit. |
| All form pages | Start [Type] Request | **Closed** | The friction layer (see above). |

**Principle:** The first section on any page should auto-open if it's the page's *primary purpose*. Secondary and tertiary sections stay closed to avoid visual overload.

---

## Section Naming & Hierarchy

<a name="section-naming--hierarchy"></a>

| Old Name | New Name | Why |
|----------|----------|-----|
| Quick Tools | **Therapy Tools** | "Quick Tools" was vague. "Therapy Tools" tells the user exactly what's inside — clinical utilities. |
| NullTools | **Quick Links** | "NullTools" was the old experimental name. "Quick Links" is clear and user-friendly. |

The hierarchy on each hub page is: **Request Forms** (top, open) → **Therapy Tools** (middle, closed) → **Quick Links** (bottom, closed). Most important to least important, top to bottom.

---

## Button Colors and States

<a name="button-colors-and-states"></a>

| Color | CSS Class | Used For | Why |
|-------|-----------|----------|-----|
| Red | `red-button` | Collapse button for **Request Forms** | Red draws attention — forms are the primary action. |
| Blue | `blue-button` | Collapse button for "Start [Type] Request" | Blue signals "action" — the form submission gate. |
| Green | `green-button` | Individual form links (Supply, Maintenance, Wishlist) | Green means "go" — these are clickable destination links. |
| Purple | `purple-button` | Experimental, dev tools, utilities | Purple = secondary/experimental. Distinct from the main workflow. |
| Grey | `pending-button` | Unavailable features (Moursund Maintenance/Wishlist) | Grey = disabled. Visually indicates the feature exists but isn't active for this location. |

**Principle:** Color carries meaning consistently. Users learn that green is clickable, grey is pending, red is the primary section header.

---

## SEO & Anti-Phishing Meta Tags

<a name="seo--anti-phishing-meta-tags"></a>

Every HTML page includes:

- `<meta name="description">` — Page-specific, tells search engines what the page is about.
- `<meta name="application-name" content="Will Clinic Hub">` — Identifies the app context.
- `<meta name="author" content="Will">` — Personal project, not impersonating an organization.
- `<meta property="og:title">` + `og:description` — Social preview cards (Slack, text, etc.).
- `<meta name="twitter:card" content="summary">` — Clean link preview on X/Twitter.
- `<link rel="canonical">` — Prevents duplicate content issues.
- `<title>` — Descriptive format: "Page Purpose | Will Clinic Hub".

**Why anti-phishing matters:** This site handles clinic data. If it appears as a generic form page with no branding, a bad actor could create a convincing fake. Explicit branding + consistent metadata signals to users (and browsers) that this is the real site.

---

## XSS Prevention

<a name="xss-prevention"></a>

All data from Firebase (user-submitted content) is sanitized before rendering:

```js
export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
```

Used in every renderer:
- `recentItemsList.js` — maintenance item display
- `requestSupply.js` — supply item display
- `requestWishlist.js` — wishlist item display
- `changeLogModal.js` — change log display

**Why not use `textContent` instead of `innerHTML`?** Several renderers build HTML structures dynamically (e.g., comma-separated lists with spans). `escapeHtml` on user data + `innerHTML` on the safe template is the pragmatic middle ground.

---

## Firebase: Anonymous Auth vs. Validate Rules

<a name="firebase-anonymous-auth-vs-validate-rules"></a>

**Attempted:** Anonymous auth via `signInAnonymously()` in `firebaseAdapter.js`, wired in `scripts.js`.
**Result:** Failed — Firebase Console shows the toggle as enabled, but server returns `auth/admin-restricted-operation`. The Console toggle does not persist (known Firebase bug).
**Fallback:** `.validate` rules in the Firebase Realtime Database.

**Current approach:** The Firebase project (`willqrsite-default-rtdb`) uses `.validate` rules to enforce data shape server-side, checked on every write:

- Required fields: `clientTimestamp`, `submitterName`, `status`
- `.indexOn: ["firebaseTimestamp"]` for efficient queries
- Form-specific validations per path

**Why this matters:** Without auth, anyone with the database URL could write arbitrary data. `.validate` rules are the last line of defense. If anonymous auth ever starts working, it would be re-enabled as an additional layer.

**Rules are managed in Firebase Console, not in this repo.** There is no `database.rules.json` file checked in — they must be updated manually or via the Firebase CLI.

### Open Issue: `newData.hasChildren()` evaluates false incorrectly

`hasChildren()` in `.write` rules mysteriously rejects writes even when all required children exist. This was encountered on `southeastSupply` — the rule `"newData.hasChildren(['clientTimestamp', 'submitterName', 'status'])"` returned `permission_denied` despite all three fields being present in the data. Setting `".write": true` (no condition) resolved it immediately, confirming the data shape was correct.

**Root cause unknown.** Suspected:
- Conflict with `push()` + `set()` writing at auto-generated child keys (`southeastSupply/-PUSH_KEY`)
- Firebase rules engine version quirk
- Some child value (empty string, array, object) being interpreted as absent

**Temporary workaround:** Root `.write: true` — wide open. Re-tighten once the cause is found. See `firebase-rules.json` in repo root for the current deployed state.

---

## Location Detection

<a name="location-detection"></a>

In `scripts.js`:

```js
function detectLocation() {
    const path = window.location.pathname;
    if (path.includes('moursund')) return 'moursund';
    return 'southeast';
}
```

**Simple, intentional:** The string `moursund` in the URL path determines the location. Everything else defaults to Southeast. No query params, no cookies, no localStorage. A page either *is* Moursund or it isn't.

This feeds into `DataManager` which builds Firebase paths:
- `southeastMaintenance`, `southeastSupply`, `southeastWishlist`
- `moursundMaintenance`, `moursundSupply`, `moursundWishlist`

---

## Google Forms as Backend

<a name="google-forms-as-backend"></a>

**Current state:** All form submissions still POST to Google Forms via hidden `formConfig.js` URLs. Firebase stores the same data for the recent-requests display.

**Why dual-write:** Google Forms/Sheets is the existing workflow the clinic trusts. Firebase recent-requests display is the new UX layer on top. Until Firebase fully replaces Google Forms as the source of truth, both must be written.

**Form submission flow:**
1. User fills form → JS validates → data is saved to Firebase via adapter
2. Same data is POSTed to Google Form URL via hidden `action` attribute
3. Google Form submission uses `no-cors` mode — silent, no confirmation needed

**Long-term goal:** Migrate fully to Firebase + a custom admin dashboard, eliminating Google Forms entirely.

---

## Tech Stack — Fully Free, Modular by Design

<a name="tech-stack"></a>

The entire stack runs on free tiers:

| Layer | Service | Cost |
|-------|---------|------|
| Frontend hosting | GitHub Pages | Free |
| Database | Firebase Realtime Database (Spark plan) | Free |
| Form backend | Google Forms → Google Sheets | Free |
| Email notifications | Google Apps Script (triggered from Sheets) | Free |
| Build tool | Vite | Free / OSS |
| Domain | GitHub Pages (`sandboxworkspace.github.io/will/`) | Free |

### How Modularity Enables Future Upgrades

Each layer is abstracted behind an interface, so swapping in paid/scalable alternatives requires minimal changes:

| Current Layer | Abstraction | Swap Target |
|---------------|-------------|-------------|
| Firebase DB | `DatabaseInterface` (`databaseInterface.js`) + `DataManager` | Any NoSQL / SQL backend (replace `firebaseAdapter.js`) |
| GitHub Pages hosting | Static HTML output | Any static host (Netlify, Vercel, custom VPS) |
| Google Forms | `formConfig.js` — centralized URL map | Custom API endpoint |
| Google Sheets / Apps Script | (separate from this repo) | Custom email / notification service |
| Vite / static build | Standard `vite.config.js` | SSR framework (Next.js, Nuxt) if dynamic features needed |

**Key modular seams:**
- `DataManager` talks only to `DatabaseInterface` — switch databases by writing a new adapter.
- `vite.config.js` defines all entry points in one place — add/remove pages without touching build logic.
- `formConfig.js` keeps all external form endpoints in a single config map.
- `CollapsibleSections`, `RecentItemsList`, and the request handlers are self-contained classes with no global state.

This means you could migrate from "free Firebase + Google Forms" to "paid VPS + custom API" without rewriting the UI or form handlers — just the adapter layer.

---

## Build & Deploy

<a name="build--deploy"></a>

- **Build tool:** Vite (`vite.config.js` with `/will/` base)
- **Entry points** defined in `rollupOptions.input` — every HTML page must be listed there
- **Deploy:** `./deploy.sh` → builds, pushes to `main`, then copies `dist/*` to `gh-pages`
- **GitHub Pages** serves from `gh-pages` branch at `https://sandboxworkspace.github.io/will/`

**Important:** If you add a new HTML page, you must add it to `vite.config.js` `input` or it won't be built.

---

## Code Modularity: Request Handlers

<a name="code-modularity-request-handlers"></a>

Three form types, three handler files:

| File | Class | Form |
|------|-------|------|
| `requestMaintenance.js` | `MaintenanceRequestHandler` | Maintenance / Repair |
| `requestSupply.js` | `SupplyRequestHandler` | Supply Order |
| `requestWishlist.js` | `WishlistRequestHandler` | Equipment Wishlist |

Each extends `BaseRequestHandler` (`requestBase.js`) which provides:
- `getFormConfig()` → resolves `FORM_URLS[this.location][this.formType]`
- `showStatus()` / `clearStatus()` → status message display
- `initialize()` → wires up form submit, loads recent items

Why not one file? Each form type has unique fields, unique validation, and unique rendering. A single file would be a switch-statement mess. Per-type handlers keep each file focused.
