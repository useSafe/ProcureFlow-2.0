# ProcureFlow — Procurement & Document Management System

> A full-stack web application for digitally tracking physical procurement files, storage locations, borrowing history, and procurement process milestones.

---

## 🌟 Overview

**ProcureFlow** is a dark-themed, role-based document management system built for procurement offices. It serves as a **digital twin of your physical filing room** — every drawer, cabinet, box, and folder in the real world has a corresponding digital record that can be searched, filtered, and updated in real time.

The system tracks the complete lifecycle of procurement files: from the moment a Purchase Request (PR) is received, through the bidding or SVP process, to archiving in physical storage — and back out again when borrowed for audit or review.

---

## 🎯 Problem & Solution

### The Problem
- Physical procurement folders get lost, misplaced, or borrowed without a clear return trail
- No real-time visibility into the status of active procurement projects
- Locating a specific file requires physically searching through cabinets
- No accountability for who borrowed a file and when it should be returned

### How ProcureFlow Solves It
1. **Digital Storage Map** — Every physical location (Drawer → Cabinet → Folder, or Box → Folder) has a digital record
2. **File Lifecycle Tracking** — Records transition from *Active/Borrowed* to *Archived (In Storage)* with full audit trail
3. **Procurement Progress Monitoring** — Date-based milestones for SVP and Regular Bidding processes are logged and tracked
4. **Document Checklist** — 22-item checklist (A–Q) ensures all required documents are present in each file
5. **Borrowing Ledger** — Logs borrower name, division, date borrowed, and expected return date
6. **Role-Based Access** — Four distinct roles limit what each user can see and do

---

## 📖 Pages & Features

### 🏠 Dashboard (`/dashboard`)
- Summary cards: Total Records, Borrowed Files, Archived Files, Critical Urgency count
- **Bar chart**: Storage hierarchy overview (Drawers, Cabinets, Folders, Files, Boxes)
- **Pie chart**: Breakdown by Procurement Type
- **Bar chart**: Records by Division
- **Line/Area chart**: Records added over time
- Quick search: redirect to All Records with search pre-filled
- Real-time connection status indicator (Online/Offline banner)

### ➕ Add Procurement (`/procurement/add`)
**Basic Information section:**
- PR Number (auto-format with year prefix)
- Procurement Type: `Regular Bidding` | `SVP` | `Attendance Sheets` | `Receipt` | `Others`
- Division (End User) — dropdown from Divisions database
- Urgency Level: `Low` | `Medium` | `High` | `Critical`
- Supplier name, ABC (Approved Budget for the Contract), Bid Amount
- Project Name / Particulars
- Description / Remarks
- Tags (free-form)
- Notes

**Storage Location section:**
- Two storage paths:
  - **Drawer-based**: Drawer → Cabinet → Folder (hierarchical)
  - **Box-based**: Box → Folder
- Status: `Archived (In Storage)` | `Borrowed (Out)`
- Borrowed By, Borrower Division, Date Borrowed, Return Date, Returned By

**Monitoring Dates — SVP:**
- Received PR Date, PR Deliberated Date, Published Date, RFQ/Canvass Date, RFQ Opening Date, BAC Resolution Date, Forwarded to GSD Date

**Monitoring Dates — Regular Bidding:**
- Pre-Bid Date, Bid Opening Date, Bid Evaluation Date, Post-Qualification Date, Post-Qual Report Date, Forwarded to OAPIA Date, NOA Date, Contract Date, NTP Date, Date Awarded

**Procurement Process Status:**
- `Not yet Acted` | `In Progress` | `Completed` | `Returned PR to EU` | `Failure` | `Cancelled`
- Date Status Updated

**Document Checklist (22 items, A–Q):**
- A. Notice to Proceed
- B. Contract of Agreement
- C. Notice of Award
- D. BAC Resolution to Award
- E. Post-Qual Evaluation Report
- F. Notice of Post-qualification
- G. BAC Resolution to Post-qualify
- H. Abstract of Bids as Evaluated
- I. TWG Bid Evaluation Report
- J. Minutes of Bid Opening
- K. Eligibility Check Results
- L. Bidders Technical and Financial Proposals
- M. Minutes of Pre-Bid Conference
- N. Bidding Documents
- O.1. Letter Invitation to Observers
- O.2. Official Receipt
- O.3. Board Resolution
- O.4. PhilGEPS Award Notice Abstract
- P.1. PhilGEPS Posting
- P.2. Website Posting
- P.3. Posting Certificate
- Q. CAF, PR, TOR & APP

### 📋 All Records (`/procurement/list`)
- Full paginated table with jump-to-page control
- **Columns**: Stack #, PR Number, Type, Project Name, Division, Location, Urgency, Status, Process Status, Borrower, Date Added, Actions
- **Filters**: Search (PR/Title), Type, Urgency, Process Status, Physical Status, Division, Month/Year
- **Row coloring** based on physical status (Archived = normal, Borrowed = highlighted)
- **View Modal**: Full read-only details with all fields, checklist, monitoring dates, borrower info, audit trail (created by / last edited by)
- **Edit Modal**: Full edit form mirroring Add Procurement, with controlled field visibility
- **Delete**: Soft confirmation, admin/archiver only
- **Export Modal** (CSV):
  - SVP Export — SVP-specific columns + borrower fields
  - Regular Bidding Export — bidding-specific columns + borrower fields
  - Storage Location filter (Drawer-based or Box-based)
  - Wider modal for better usability

### 📄 Small Value Procurement (`/procurement/svp`)
- Filtered view of All Records showing only `SVP` type records
- Inherits all filtering, viewing, and export features from All Records

### 📄 Regular Bidding (`/procurement/regular`)
- Filtered view of All Records showing only `Regular Bidding` type records
- Inherits all filtering, viewing, and export features from All Records

### 📊 Progress Tracking (`/procurement/progress`)
- Dedicated view monitoring procurement milestones across all active records
- Visual status per monitoring date stage
- Role-restricted to: `admin`, `bac-staff`, `viewer`

### 🗃️ Boxes (`/boxes`)
- Manage physical storage boxes (standalone or assigned to a Drawer/Cabinet)
- View folder count and file count per box
- Add / Edit / Delete with cascade protection (cannot delete if files exist)
- Role-restricted to: `admin`, `archiver`

### 🗄️ Storages (collapsible group in sidebar)

#### Drawers (`/shelves`)
- Top-level storage containers (displayed as "Drawers" in UI, stored as `cabinets` in DB)
- Add / Edit / Delete with cascade deletion of child Cabinets and Folders
- Role-restricted to: `admin`, `archiver`

#### Cabinets (`/cabinets`)
- Second-level containers inside Drawers (displayed as "Cabinets" in UI, stored as `shelves` in DB)
- Add / Edit / Delete with cascade deletion of child Folders
- Role-restricted to: `admin`, `archiver`

#### Folders (`/folders`)
- Terminal storage containers — can be inside a Cabinet (shelf) or inside a Box
- Custom color picker per folder (hex color code stored)
- Stack number auto-calculated per container
- Role-restricted to: `admin`, `archiver`

### 🗺️ Visual Map (`/visual-allocation`)
- Interactive visual layout of the physical storage room
- Click on any Drawer/Cabinet/Box to see its contents
- Folder color coding is reflected visually
- Capacity indicators per container
- Role: `admin`, `archiver`, `bac-staff`, `viewer`

### 🏢 Divisions (`/divisions`)
- Manage organizational divisions (abbreviation, name, end user/head)
- Used in procurement records and borrower tracking
- Role-restricted to: `admin`

### 👥 User Management (`/users`)
- View all registered users in a searchable, filterable table
- Add new users (name, email, password, role)
- Edit role or toggle active/inactive status
- Force-delete protection: if a user is deleted while logged in, they are automatically logged out via real-time listener
- Role-restricted to: `admin`

---

## 🔐 Role-Based Access Control

| Feature | admin | bac-staff | archiver | viewer |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| All Records (view) | ✅ | ✅ | ✅ | ✅ |
| Add Procurement | ✅ | ✅ | ❌ | ❌ |
| Edit Procurement | ✅ | ✅ | ✅ | ❌ |
| Delete Procurement | ✅ | ❌ | ✅ | ❌ |
| SVP / Regular Bidding views | ✅ | ✅ | ✅ | ✅ |
| Progress Tracking | ✅ | ✅ | ❌ | ✅ |
| Boxes | ✅ | ❌ | ✅ | ❌ |
| Storages (Drawers/Cabinets/Folders) | ✅ | ❌ | ✅ | ❌ |
| Visual Map | ✅ | ✅ | ✅ | ✅ |
| Divisions | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

---

## 🔄 Procurement Lifecycle

```
PR Received
    │
    ▼
Record Created in ProcureFlow (Add Procurement)
    │
    ├─ Type: SVP ──────────────────────────────────────────────────────────┐
    │    └─ Monitoring: RFQ Canvass → RFQ Opening → BAC Resolution → GSD  │
    │                                                                       │
    └─ Type: Regular Bidding ──────────────────────────────────────────────┘
         └─ Monitoring: Pre-Bid → Bid Opening → Evaluation → Post-Qual
                        → OAPIA → NOA → Contract → NTP → Awarded
    │
    ▼
Process Status Updated (Not yet Acted → In Progress → Completed)
    │
    ▼
Physical File Archived → Assigned to Location
    (Drawer → Cabinet → Folder)  OR  (Box → Folder)
    │
    ├─ Status: Archived (In Storage)  → Stack Number assigned
    │
    └─ Borrowed by someone?
         ├─ Status: Borrowed (Out) → Stack Number cleared
         └─ Returned → Status: Archived → Stack Number re-assigned
```

---

## 🏗️ Storage Hierarchy

```
Physical Room
├── Drawer (code: D1, D2...) [DB: Cabinet]
│   └── Cabinet (code: C1, C2...) [DB: Shelf]
│       └── Folder (code: F1, F2...) [color-coded]
│           └── Procurement Records (stack-ordered)
│
└── Box (code: B1, B2...)
    └── Folder (code: F1, F2...) [color-coded]
        └── Procurement Records (stack-ordered)
```

> **Note on naming:** The internal DB uses `cabinets` for Drawers and `shelves` for Cabinets to match an earlier schema. The UI labels are "Drawers" and "Cabinets" respectively.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Routing | React Router DOM v6 |
| UI Components | Shadcn UI (Radix UI primitives) |
| Styling | Tailwind CSS v3 + Custom CSS |
| Icons | Lucide React |
| Database | Firebase Realtime Database |
| Auth | Firebase Auth (custom session via localStorage + Firebase users node) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Toasts | Sonner |
| Export | XLSX library (CSV export) |
| PDF | jsPDF + jsPDF-AutoTable |
| State | React Context (AuthContext, DataContext) + TanStack Query |

---

## 📁 Project Structure

```
src/
├── App.tsx                  # Root router + providers
├── main.tsx                 # Entry point (imports index.css only)
├── index.css                # Global styles (Tailwind + custom)
├── App.css                  # Additional app-level styles (not imported — unused)
│
├── pages/
│   ├── Dashboard.tsx        # Main dashboard with charts and metrics
│   ├── AddProcurement.tsx   # Full procurement creation form
│   ├── ProcurementList.tsx  # All Records table + modals + export
│   ├── SVPList.tsx          # SVP-filtered procurement list
│   ├── RegularList.tsx      # Regular Bidding-filtered list
│   ├── ProgressTracking.tsx # Process milestone tracker
│   ├── Boxes.tsx            # Box storage management
│   ├── Shelves.tsx          # Drawer management
│   ├── Cabinets.tsx         # Cabinet management
│   ├── Folders.tsx          # Folder management (with color picker)
│   ├── VisualAllocation.tsx # Interactive storage room map
│   ├── Divisions.tsx        # Division management
│   ├── UserManagement.tsx   # User CRUD + role management
│   ├── Login.tsx            # Login page
│   └── NotFound.tsx         # 404 page
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    # Sidebar nav (collapsible) + mobile header
│   │   └── ProtectedRoute.tsx
│   └── ui/                  # Shadcn component library
│
├── contexts/
│   ├── AuthContext.tsx       # Auth state, login/logout, role
│   └── DataContext.tsx       # Global data subscriptions
│
├── lib/
│   ├── firebase.ts           # Firebase app initialization
│   ├── storage.ts            # All Firebase CRUD operations + stack logic
│   ├── constants.ts          # CHECKLIST_ITEMS (22 items A–Q)
│   ├── export-utils.ts       # CSV export helpers
│   ├── export.ts             # Export orchestration
│   ├── validation-utils.ts   # Form validation helpers
│   ├── pr-number-utils.ts    # PR number formatting
│   └── number-utils.ts       # Number formatting utilities
│
└── types/
    └── procurement.ts        # All TypeScript interfaces and types
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- A Firebase project with Realtime Database enabled

### 1. Clone the repository
```bash
git clone <repository-url>
cd ProcureFlow-main
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Seed the admin user
On first run, use the Firebase Console to manually add an admin user under the `users/` node:
```json
{
  "id": "your-uuid",
  "email": "admin@example.com",
  "name": "Administrator",
  "role": "admin",
  "status": "active"
}
```

### 5. Run the development server
```bash
npm run dev
```
App runs at `http://localhost:8080` by default.

### 6. Build for production
```bash
npm run build
```

### 7. Deploy (Vercel)
A `vercel.json` is included with SPA redirect rules. Simply connect the repository on [vercel.com](https://vercel.com) and deploy.

---

## 🔒 Firebase Security Notes

- The Firebase Realtime Database rules should restrict read/write to authenticated users
- User passwords are **not stored in Firebase Auth** — authentication is handled by matching credentials against the `users/` node in the Realtime Database
- Only non-sensitive user fields (no password, no role) are persisted in `localStorage`
- Real-time listeners in `AppLayout` detect if the logged-in user's account is deleted or deactivated and force a logout automatically

---

## 📝 Key Business Rules

1. **Stack Numbers** are auto-calculated per folder/box for archived files only. Borrowed files lose their stack position and are re-assigned to the end of the queue upon return.
2. **Cascade Deletion**: Deleting a Drawer deletes all its Cabinets and Folders. Deleting a Box deletes all its Folders. You cannot delete any container that has active procurement records inside.
3. **Procurement Type visibility**: The Procurement Type dropdown in Edit Modal is hidden for `Attendance Sheets`, `Receipt`, and `Others` types to prevent mis-categorization.
4. **Date inputs** across the app display a white calendar icon on dark backgrounds via `filter: brightness(10)` in `index.css`.
5. **Network status** is monitored globally — a toast notification fires when the connection to Firebase is lost or restored.
