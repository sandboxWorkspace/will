# Will Clinic Hub — Agent Guide

> For AI coding agents (Claude, opencode, Copilot, etc.). Read this first to understand project structure, conventions, and constraints.

## One-Line Summary

Mobile-first clinic workflow app with two location-specific landing pages, three form types (maintenance/supply/wishlist), Firebase backend, and Vite build.

## File Tree (Key Paths)

```
/
├── index.html                    # Southeast landing page
├── moursund.html                 # Moursund landing page
├── v2index.html                  # Experimental / dev tools
├── southeast-request*.html       # Southeast form pages (Supply, Maintenance, Wishlist)
├── moursund-request*.html        # Moursund form pages (same 3 types)
├── fesBike.html                  # FES Bike schedule tool
├── toolMetronome.html            # Metronome tool
├── toolQRGenerator.html          # QR code generator
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
├── deploy.sh                    # Deploy: builds, pushes main + gh-pages
├── workflow.md                  # This project's design decisions (anchor points)
├── AGENTS.md                    # This file — AI agent context
└── README.md                    # Project overview
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
- `DataManager` constructor takes `location` string and builds paths automatically

### Form submission flow:
1. JS validates → Firebase save (with `firebaseTimestamp` + `clientTimestamp`)
2. Google Form POST (hidden, `no-cors` mode) — dual-write until Firebase takes over

### Design conventions:
- **No location toggle** on landing pages — `index.html` = Southeast only, `moursund.html` = Moursund only
- **Recent requests** auto-display on form pages; form is hidden behind a collapse button (friction layer)
- **Button colors** are semantic: red=form section header, blue=start request, green=link, purple=experimental, grey=pending
- **Character limits** on inputs are guardrails, not arbitrary (see `workflow.md#character-limits-as-guardrails`)
- **All user data** rendered via `escapeHtml()` — never trust Firebase content

### For vibe-coding (rapid iteration):
- Edit source files, run `npm run dev` to preview
- Build: `npm run build` → outputs to `dist/`
- Deploy: `./deploy.sh` (pushes to main + gh-pages)
- After `git rm -r --cached dist/`, the `dist/` folder is no longer tracked in git

## Known Issues / Blockers
- **Anonymous auth** is broken (Firebase Console toggle doesn't persist). `.validate` rules used instead.
- **Moursund Maintenance + Wishlist** pages exist but are greyed out in navigation — only Supply is active.
- **requestDashboard.html** and **toolOutcomemeasure.html** are 0-byte stale files — not in build, safe to delete.
