# Build Tracker — Will Clinic Hub

> Running list of what's been built, what's in wireframe, and what's planned.

## ✅ Built & Deployed

| Feature | Page | Status |
|---------|------|--------|
| Southeast landing | `index.html` | Live |
| Moursund landing | `moursund.html` | Live |
| Maintenance Request | `*-requestMaintenance.html` | Live |
| Supply Request (w/ autocomplete) | `*-requestSupply.html` | Live |
| Wishlist Request | `*-requestWishlist.html` | Live |
| FES Bike Sign-Up | `fesBike.html` | Live |
| QR Code Generator | `toolQRGenerator.html` | Live |
| Visual Scan Trainer | `toolScanMatch.html` | Live |
| Experimental dev hub | `v2index.html` | Live |
| Theme toggle (sun/moon) | shared `toggleSwitch.css` | Live |
| Code-split module loader | `src/scripts.js` | Live |

## 🔧 Wireframes (static HTML, no backend)

| Feature | Page | Status |
|---------|------|--------|
| Equipment Reservation Hub | `equipment.html` | Wireframe draft |
| Quick Restock QR Generator | `toolQuickRestock.html` | Wireframe draft |

## 📋 Wireframe Specs

### Equipment Reservation System

**Concept:** A reusable sign-up board for reserving clinic equipment (FES Bike, Bertec, XCite, etc.). Each equipment type gets its own weekly schedule board.

**Pattern (already proven by FES Bike):**
```
equipment/{type}/schedule/{weekKey}/{day}/{timeSlot} → {patientName, therapist, notes}
```

**Shared class:** `EquipmentBoard` (generalization of `ScheduleTable`)
- Input: `equipmentType`, `timeSlots[]`, `days[]`, `slotDuration`, `maxPerSlot`
- Firebase path is auto-built from `equipmentType`
- Existing `ScheduleTable` already takes `scheduleType` param — minimal refactor needed

**To build:**
- [ ] Create `src/js/ui/equipmentBoard.js` (wrap existing `ScheduleTable` pattern)
- [ ] Create `equipment-bertec.html`
- [ ] Create `equipment-xcite.html`
- [ ] Add Firebase rules for `equipment/{type}/` paths

---

### Quick Restock QR

**Concept:** Generate scannable QR codes that pre-fill a supply request form. Post QR on supply cabinets or room doors. Staff scan → pre-filled form → tap submit.

**Flow:**
1. Pick item, room, quantity on `toolQuickRestock.html`
2. Tool builds URL: `southeast-requestSupply.html?item=Gloves&room=Room3&qty=1`
3. QR code encodes that URL (uses existing `qrcode` npm package)
4. On scan: supply form reads `URLSearchParams`, pre-fills fields

**Changes needed to `requestSupply.js`:**
- Read `item`, `room`, `qty` from `location.search`
- Set field values + trigger autocomplete if applicable

**To build:**
- [ ] Add param parsing to `requestSupply.js` (~6 lines)
- [ ] Wire up QR generation in `toolQuickRestock.html` (uses existing `qrcode` package)
- [ ] Print + post QR codes in clinic

---

### Metronome (Rebuilding)

**Status:** Removed from build. Placeholder buttons on landing pages.
**Plan:** Rebuild from scratch. Previous version had iOS AudioContext issues.
- [ ] Research Web Audio API + iOS compatibility
- [ ] Build minimal metronome (BPM slider, tap tempo, start/stop)
- [ ] Avoid overengineering (no color themes, no time signatures initially)

## 🗺️ Roadmap

- [ ] Metronome rebuild
- [ ] Equipment reservation pages (Bertec, XCite)
- [ ] Quick Restock QR (live QR generation)
- [ ] Visual Scan Trainer: more game modes
- [ ] Supply form: QR pre-fill integration
