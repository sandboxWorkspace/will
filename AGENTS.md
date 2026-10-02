# Will Clinic Hub — Agent Guide

> For AI coding agents (Claude, opencode, Copilot, etc.). Read this first to understand project structure, conventions, and constraints.
>
> NOTE: This file is **local-only** (gitignored, untracked) — it never appears in git or deploys. `deploy.sh` preserves it across the gh-pages working-tree swap.

## One-Line Summary

Mobile-first clinic workflow app with two location-specific landing pages, three form types (maintenance/supply/wishlist), a Spot-It-style therapy matching game, Firebase backend, and Vite build.

## File Tree (Key Paths)

```
/
├── index.html                    # Southeast landing page
├── moursund.html                 # Moursund landing page
├── v2index.html                  # Experimental / dev tools
├── southeast-request*.html       # Southeast form pages (Supply, Maintenance, Wishlist)
├── moursund-request*.html        # Moursund form pages (same 3 types)
├── fesBike.html                  # FES Bike schedule tool
├── toolScanMatch.html            # Scan Match — Spot-It-style matching therapy game (2-device + 1-device modes)
├── toolQRGenerator.html          # QR code generator
├── toolQuickRestock.html         # Quick restock tool
├── equipment.html                # Equipment page
├── template.html                 # Starter template for new pages
│
├── src/
│   ├── scripts.js                # App entry — detectLocation(), init dispatch
│   ├── css/
│   │   ├── base.css              # Layout, variables, typography
│   │   ├── buttons.css           # Button color classes (.green-button, .pending-button, etc.)
│   │   ├── forms.css             # Form input styling
│   │   ├── responsive.css        # Mobile breakpoints
│   │   ├── scrollbar.css         # Custom scrollbar
│   │   └── recentItemsList.css   # Recent requests card styling
│   ├── js/
│   │   ├── requestBase.js        # BaseRequestHandler — shared form logic
│   │   ├── requestMaintenance.js # MaintenanceRequestHandler
│   │   ├── requestSupply.js      # SupplyRequestHandler (has autocomplete)
│   │   ├── requestWishlist.js    # WishlistRequestHandler
│   │   ├── scanMatchGame.js      # Scan Match engine + UI (Firebase rooms, local mode, undo, session stats)
│   │   ├── scanMatchLayout.js    # Scan Match paint-time layout engine (profiles, edge safety, optimizer) — pure module
│   │   ├── data/
│   │   │   ├── dataManager.js    # DataManager — location-scoped Firebase paths
│   │   │   └── formConfig.js     # Google Form URL config per location/form type
│   │   ├── database/
│   │   │   ├── databaseInterface.js  # Abstract interface
│   │   │   └── firebase/
│   │   │       ├── firebaseAdapter.js  # Firebase read/write/auth
│   │   │       └── firebaseConfig.js   # Firebase project config
│   │   └── ui/
│   │       ├── collapsibleSections.js  # data-default-open toggle logic
│   │       ├── scheduleTable.js        # FES Bike schedule table
│   │       ├── changeLogModal.js        # Schedule change log modal
│   │       ├── confirmationModal.js     # Confirmation dialog
│   │       └── recentItemsList.js       # Shared recent-requests renderer
│   └── utils/
│       └── utils.js             # escapeHtml(), toggleCollapse(), debounce()
│
├── public/
│   ├── data/supplyItems.json    # Autocomplete data for supply form
│   └── robots.txt               # Blocks all crawlers
│
├── assets/                      # SVGs, icons, logo
├── vite.config.js               # Vite config — entry points, /will/ base
├── deploy.sh                    # Deploy: builds, pushes main + gh-pages (preserves this file)
├── firebase-rules.json          # Firebase security/index rules
├── AGENTS.md                    # This file — AI agent context (local-only, gitignored)
└── manifest.json                # PWA manifest
```

## Critical Rules for Agents

### When adding a new HTML page:
1. Create the `.html` file in the root directory
2. Add it to `vite.config.js` → `rollupOptions.input`
3. Include all meta/SEO tags (use `template.html` as starter)
4. If it's a form page, add a `document.getElementById` check in `src/scripts.js`

### Firebase paths are location-prefixed:
- `southeastMaintenance`, `southeastSupply`, `southeastWishlist`
- `moursundMaintenance`, `moursundSupply`, `moursundWishlist`
- `scanMatchSessions/{pin}` — Scan Match rooms (ephemeral: auto-deleted on disconnect)
- `DataManager` constructor takes `location` string and builds paths automatically

### Form submission flow:
1. JS validates → Firebase save (with `firebaseTimestamp` + `clientTimestamp`)
2. Google Form POST (hidden, `no-cors` mode) — dual-write until Firebase takes over

### Scan Match architecture (src/js/scanMatchGame.js + scanMatchLayout.js):
- **Symbol sets are game state** (seed-synced from PIN/session); **sizes/positions are render state** (computed at paint time from the measured screen — per-device optimal, no cross-device sync needed)
- Deck uses projective planes over GF(q): N ∈ {3,4,5,6,8,9,10} symbols/card (N=7 mathematically impossible; GF(q) tables for q=4,8,9)
- Difficulty = declarative profile per N (`DIFFICULTY_PROFILES`): layout (grid/ring/scatter), base glyph size, tier variance, rotation
- Edge safety: all geometry uses visual glyph diameter (font-size × 1.3) with min-gap + edge-gap acceptance — nothing may touch card borders
- Modes: 2-device (Firebase rooms, 4-digit PINs, QR join) and 1-device (two players, one screen; desktop/large-display only, ≥700px viewport)
- Undo syncs both devices via room data; per-round find times exclude reveal/render time; stats are session-only (zero persistence)
- Future Twemoji swap point: `paintCard()` in scanMatchLayout.js (replace the `textContent` line only)

### Design conventions:
- **No location toggle** on landing pages — `index.html` = Southeast only, `moursund.html` = Moursund only
- **Recent requests** auto-display on form pages; form is hidden behind a collapse button (friction layer)
- **Button colors** are semantic: red=form section header, blue=start request, green=link, purple=experimental, grey=pending
- **Character limits** on inputs are guardrails, not arbitrary
- **All user data** rendered via `escapeHtml()` — never trust Firebase content
- **Scan Match CSS** lives inline in `toolScanMatch.html` (fluid clamp() tokens `--space-*`/`--font-*`, 44px touch targets, `--flip` rotation var for the face-to-face card)

### For vibe-coding (rapid iteration):
- Edit source files, run `npm run dev` to preview
- Build: `npm run build` → outputs to `dist/` (untracked)
- Deploy: `./deploy.sh` (pushes main + gh-pages; preserves this file)
- Repo tracks `node_modules/` (pre-existing condition — do not commit changes inside it)

## Known Issues / Blockers
- **Anonymous auth** is broken (Firebase Console toggle doesn't persist). `.validate` rules used instead.
- **Moursund Maintenance + Wishlist** pages exist but are greyed out in navigation — only Supply is active.
- **node_modules/ is tracked in git** (historical) — repo is heavier than it needs to be; cleanup would require a coordinated `git rm -r --cached` + .gitignore entry.
