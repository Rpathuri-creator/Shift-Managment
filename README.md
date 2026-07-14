# Calder — Employee Shift Tracker

A React single-page application for managing employee work schedules, backed by Google Sheets via Google Apps Script.

---

## Features

### Authentication
- Login page with username/password — credentials are verified against the Google Sheets backend.
- Role-based access: **Employee** and **Admin** roles. Admin users get an additional **Pay Periods** tab.
- Logout button clears all local state and returns to the login screen.

### Add Shifts (Weekly Form)
- Pick any date and the app auto-calculates the Monday–Sunday week around it.
- One row per employee per day — multiple employees can be added to the same day.
- Smart time auto-fill: a new shift's start time defaults to where the last shift on that day ended.
- Per-day hour cap enforcement before submission: Mon–Sat max **13 hrs**, Sunday max **7 hrs**.
- Default shift times: weekdays 09:00–22:00, Sunday 11:00–18:00.
- Add new employees inline without leaving the form.

### Calendar & Reports
- Monthly calendar grid showing shift counts and employee names per day.
- Navigate between months; shift data is lazy-loaded per month and cached (no duplicate fetches).
- Click any day cell to open an **Edit Modal**: view all shifts for that date, edit times/notes, or delete individual shifts.
- **Shifts Report** table below the calendar: filter by employee name, date range, or keyword. Shows hours worked per shift and a running total.

### Pay Period Report (Admin only)
- Auto-calculates the current and previous half-month pay periods (1–14 and 15–end of month).
- Aggregates hours per employee for each period.
- Multiplies hours by each employee's hourly rate (stored in the Google Sheets Employee tab).
- Displays a totals row. Employees without a configured rate show `—` for pay columns.

---

## Flow Diagrams

### 1. Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ App loads
                           ▼
                   ┌───────────────┐
                   │  currentUser  │──── null ────► LoginPage
                   │   (state)     │                    │
                   └───────────────┘         username + password
                           ▲                            │
                           │                            ▼
                    setCurrentUser            authApi.login()
                  { username, role }               POST action=login
                           │                            │
                           │                            ▼
                           │               Google Apps Script
                           │               (verifies credentials
                           │                against Sheets)
                           │                            │
                           └────── success ─────────────┘
                                  { username, role }

  On success → App.jsx mounts main layout
             → useEffect fires:
               ├─ loadMonth(currentYear, currentMonth)
               └─ loadEmployees() → setEmployees + setEmployeeRates
```

---

### 2. High-Level Component Tree

```
App.jsx  (auth gate + global state)
│
├── [unauthenticated]
│   └── LoginPage
│
└── [authenticated]
    ├── TabBar (sidebar nav, role-aware)
    │
    └── Content area  (switches on activeTab)
        │
        ├── activeTab = 'form'
        │   └── WeeklyShiftForm
        │       ├── date picker → getWeekDates() → 7-day grid
        │       ├── DaySection × 7
        │       │   └── EmployeeSelect  (dropdown + add-new)
        │       └── Submit button
        │
        ├── activeTab = 'calendar'
        │   └── CalendarView
        │       ├── CalendarGrid
        │       │   └── CalendarCell × N  (clickable)
        │       └── EditModal  (shown on cell click)
        │
        ├── activeTab = 'reports'
        │   └── ShiftsReport
        │       └── filter inputs + shift table
        │
        └── activeTab = 'payperiod'  ← Admin only
            └── PayPeriodReport
                └── pay period hours + pay summary table
```

---

### 3. Data Flow — Shifts

```
Google Sheets
     │
     │  GET ?year=YYYY&month=MM
     ▼
shiftsApi.loadShifts()
     │
     │  { shifts: Shift[] }
     ▼
App.jsx  loadMonth()
  ├── checks loadedMonths cache (Set)
  ├── skips fetch if month already loaded
  └── setShifts(prev => [...prev, ...newShifts])
            │
            │  shifts[] prop
            ▼
  ┌─────────────────────────────────────────┐
  │  Consumed by all tabs via props         │
  │  WeeklyShiftForm  ──  read only         │
  │  CalendarView     ──  read + mutate     │
  │  ShiftsReport     ──  read only         │
  │  PayPeriodReport  ──  read only         │
  └─────────────────────────────────────────┘
```

---

### 4. Add Shift Flow

```
WeeklyShiftForm
│
├─ User picks a date
│   └─ getWeekDates(date) → [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
│
├─ Per day: DaySection renders shift entry rows
│   └─ getNextShiftTimes() auto-fills start/end from prior shift
│
├─ User clicks "Submit Week"
│   ├─ validateHours()  (≤13 h/day Mon-Sat, ≤7 h Sunday)
│   │   └─ on error → setError() → Notifications banner
│   │
│   └─ for each valid form entry:
│       └─ shiftsApi.addShift(payload)
│               POST URLSearchParams to Google Apps Script
│                       │
│                       ▼
│               Google Sheets row appended
│
└─ onShiftAdded(shift) → App.jsx appends shift to state
                          (no full reload needed)
```

---

### 5. Calendar Edit Flow

```
CalendarView
│
├─ useEffect on currentDate change
│   └─ onLoadMonth(year, month)   ← lazy, cached
│
├─ CalendarGrid renders month cells
│   └─ CalendarCell (click)
│           │
│           ▼
│   handleCalendarCellClick(date, dayShifts)
│   ├─ maps existing shifts → editForms (isExisting: true)
│   ├─ appends empty new-shift form if hours < daily max
│   └─ setShowEditModal(true)
│
└─ EditModal
    ├─ User edits / removes / adds shift rows
    │
    └─ Save  →  handleSaveEdits()
                │
                ├─ validate: at least one filled row
                ├─ validate: total hours ≤ daily max
                │
                ├─ DELETE all existing shifts for that date
                │   └─ shiftsApi.deleteShift(rowIndex)  [per row]
                │
                ├─ POST each valid new/edited form entry
                │   └─ shiftsApi.addShift(payload)
                │
                └─ onReloadMonth(year, month)
                    └─ clears cache key → re-fetches fresh row indices
                       → setShifts() updated
```

---

### 6. API Layer

```
src/api/
│
├── authApi.js
│   └── login(username, password)
│         POST { action: 'login', username, password }
│         ← { success, username, role }
│
└── shiftsApi.js
    ├── isLocalMode()          checks GOOGLE_SCRIPT_URL
    │
    ├── loadShifts({ year, month })
    │     GET ?year=YYYY&month=MM
    │     ← { shifts: Shift[] }  (times normalised to HH:MM)
    │
    ├── loadEmployees()
    │     GET ?action=getEmployees
    │     ← { employees: [{ name, hourlyRate }] }
    │
    ├── addShift(payload)
    │     POST URLSearchParams(shift fields)
    │
    └── deleteShift(rowIndex)
          POST { method: 'DELETE', rowIndex }

All calls target: GOOGLE_SCRIPT_URL  (src/constants.js)
If URL does not contain "script.google.com" → local/offline mode,
all API calls are no-ops and the app renders with empty data.
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19.1.0 |
| Build tool | Vite 7.1.5 |
| Date utilities | date-fns 2.30.0 + custom utils |
| State management | Plain `useState` hooks — no Redux or Context |
| Routing | Tab-based navigation via state — no React Router |
| Backend | Google Apps Script → Google Sheets |
| Styling | Inline styles + CSS files |

---

## Project Structure

```
src/
├── main.jsx                               # React entry point
├── App.jsx                                # Root component — auth gate, global state, tab routing
├── constants.js                           # GOOGLE_SCRIPT_URL, MAX_HOURS_PER_DAY, SUNDAY_MAX_HOURS
│
├── api/
│   ├── authApi.js                         # login() — POST credentials to Google Apps Script
│   └── shiftsApi.js                       # loadShifts(), loadEmployees(), addShift(), deleteShift()
│
├── utils/
│   ├── dateUtils.js                       # normalizeTime, createSafeDate, formatDate,
│   │                                      #   getWeekDates, getDayConfig, addDays, startOfWeek
│   └── shiftUtils.js                      # calculateHours, formatTimeOnly, getNextShiftTimes
│
└── components/
    ├── LoginPage.jsx                      # Login form
    ├── Notifications.jsx                  # Error/success banners (auto-dismiss after 5 s)
    ├── TabBar.jsx                         # Tab navigation bar (role-aware)
    │
    ├── WeeklyShiftForm/
    │   ├── WeeklyShiftForm.jsx            # Date picker + Mon–Sun grid + submit
    │   ├── DaySection.jsx                 # One day's shift entry block
    │   └── EmployeeSelect.jsx             # Employee dropdown + add-new employee inline
    │
    ├── CalendarView/
    │   ├── CalendarView.jsx               # Orchestrates calendar + owns edit-modal state
    │   ├── CalendarGrid.jsx               # Month navigation + 7-column grid
    │   ├── CalendarCell.jsx               # Single calendar day cell
    │   ├── ShiftsReport.jsx               # Filter inputs + shift table (owns filter state)
    │   └── EditModal.jsx                  # Edit/delete modal (pure display, handlers via props)
    │
    └── PayPeriod/
        └── PayPeriodReport.jsx            # Pay period hours + pay summary table
```

---

## Backend API

All requests target the URL in `src/constants.js`:

```js
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/...";
```

| Operation | Method | Params | Response |
|-----------|--------|--------|----------|
| Login | POST | `action=login`, `username`, `password` | `{ success, username, role }` |
| Load shifts | GET | `?year=YYYY&month=MM` | `{ shifts: Shift[] }` |
| Load employees | GET | `?action=getEmployees` | `{ employees: [{ name, hourlyRate }] }` |
| Add shift | POST | URLSearchParams with shift fields | — |
| Delete shift | POST | `method=DELETE`, `rowIndex` | — |

### Shift data shape

```js
{
  employee:  string,   // "Jane Smith"
  date:      string,   // "YYYY-MM-DD"
  startTime: string,   // "HH:MM"
  endTime:   string,   // "HH:MM"
  notes:     string,
  rowIndex:  number,   // Google Sheets row number (used for deletes)
  isExisting: boolean
}
```

---

## Local / Offline Mode

If `GOOGLE_SCRIPT_URL` does not contain `script.google.com`, the app enters **local mode**: all API calls are skipped and the app renders with empty data. Useful for UI development without a live backend.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A deployed Google Apps Script connected to a Google Sheet

### Install & Run

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview    # preview the production build locally
```

### Configure the Backend

Open `src/constants.js` and replace the `GOOGLE_SCRIPT_URL` value with your own deployed Google Apps Script web app URL.

---

## Business Rules

| Rule | Value |
|------|-------|
| Max hours — Mon to Sat | 13 hrs/day |
| Max hours — Sunday | 7 hrs/day |
| Week definition | Monday → Sunday |
| Pay period boundaries | 1st–14th and 15th–end of month |
| Default shift — weekdays | 09:00–22:00 |
| Default shift — Sunday | 11:00–18:00 |

---

## Known Limitations

- No shift conflict detection (two employees can overlap on the same day without a warning).
- Session is not persisted — refreshing the page returns to the login screen.
- No local storage fallback — data is lost on refresh if the backend is unreachable.
- No CSV / export functionality.