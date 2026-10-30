# CrisisConnect 🚨

> **Real-Time Emergency Response and Incident Management Platform**  
> *A production-grade MERN platform connecting citizens, verified first responders, and emergency dispatch administrators in real time.*

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68A063?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.2-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_2dsphere-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-156%20Passing-brightgreen?style=flat-square)](https://github.com/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

---

> [!IMPORTANT]
> **Emergency Notice:** CrisisConnect is an incident dispatch management platform built for demonstration and development purposes. In a real-world life-threatening emergency, always contact your local emergency authority directly (e.g., **112** in India or **911** in North America).

---

## 📌 Overview

During high-stress emergencies, fragmented communication between callers, dispatchers, and first responders leads to delayed response times and lack of visibility. 

**CrisisConnect** solves this with a streamlined, full-stack incident lifecycle engine:
1. **Citizens** can report emergencies with one-click SOS or structured incident reporting, automatically transmitting exact GPS coordinates and vital information.
2. **Responders** receive instantaneous, localized alerts via WebSockets, safely view anonymized details before acceptance, atomically claim incidents, and stream their live location.
3. **Dispatch Administrators** monitor city-wide operations on a real-time tactical map, vet and accredit responder credentials, reassign responders, and override severity levels.

---

## 🚀 Key Features Implemented

### 1. 🆘 One-Tap SOS & Incident Reporting
- **Instant SOS Button:** Triggers an immediate `HIGH` or `CRITICAL` priority emergency report with automatic browser geolocation capture (`[longitude, latitude]`).
- **Comprehensive Incident Categories:** Categorized reporting for `MEDICAL`, `FIRE`, `ACCIDENT`, `CRIME_SECURITY`, `NATURAL_DISASTER`, `MISSING_PERSON`, and `OTHER`.
- **Dynamic Threat Checklists:** Life-threat indicators (unconsciousness, breathing difficulty, severe bleeding, entrapment, active violence) dynamically calculate priority.

### 2. 🧠 Automated Server-Side Severity Engine
- Severity is strictly determined by the backend (never trusted from client input):
  - **CRITICAL:** Immediate life threat (unconscious, not breathing, severe bleeding, active armed danger).
  - **HIGH:** Active fires, natural disasters, accidents with injury, or uncontained hazards.
  - **MEDIUM / LOW:** Standard emergencies without immediate life endangerment.
- Admin override capability allows dispatchers to adjust severity with full audit logging.

### 3. ⚙️ Atomic State Machine & Incident Lifecycle
- All incident state updates pass through a single, strictly guarded function (`transitionIncident`):
  $$\text{PENDING} \longrightarrow \text{ASSIGNED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RESOLVED}$$
  *(With valid transitions to `CANCELLED` by creator or `REJECTED` by admin)*.
- **Atomic Single-Claim Guarantee:** MongoDB atomic conditional updates (`findOneAndUpdate`) guarantee that exactly one responder can claim an incident, eliminating race conditions when multiple responders tap "Accept" simultaneously.
- **Full Audit Trail:** Every transition appends to `statusHistory` with timestamp, actor ID, action note, and previous status.

### 4. ⚡ Real-Time Socket.IO Infrastructure
- **Authenticated Handshakes:** WebSockets authenticate using JWT access tokens with automatic account status verification.
- **Room-Based Access Control:** Isolated socket channels prevent data leaks:
  - `user:<id>`: Private notifications and personal incident updates.
  - `responders:online`: Broad-radius broadcasts of new incidents to active duty personnel.
  - `admins`: Multi-incident administrative oversight broadcasts.
  - `incident:<id>`: Collaborative incident room restricted to the creator, assigned responder, and admins.
- **Disconnect Grace Period:** Responders experiencing transient network drops are granted a reconnection window before being marked `OFFLINE`.

### 5. 🛡️ Responder Safety & Privacy Rules (Phase 7)
- **Least Information Disclosure Before Accept:**
  - Before a responder accepts an incident, personal identifiers (name, phone number, exact coordinates, full street address) are redacted.
  - Responders see only approximate coordinates (rounded to 2 decimal places, $\approx 1.1\text{ km}$ precision) and distance in km.
  - Exact coordinates, caller name, and direct contact details are unmasked only **after** the incident is accepted.
- **Responder Tiering (Professional vs. Volunteer):**
  - Responders declare accreditation: `PROFESSIONAL` (EMT, Police, Fire) or `VOLUNTEER`.
  - Volunteers cannot claim incidents from the open feed (403 Forbidden); they can only be assigned by an Admin.
  - Admins are programmatically barred from dispatching volunteers to `CRITICAL` life-threat emergencies.
- **"I Feel Unsafe" Immediate Protocol:**
  - If a citizen feels uncomfortable or unsafe with an assigned responder, a single tap immediately and atomically:
    1. Unassigns the responder and sets their account to `PENDING` verification and `OFFLINE`.
    2. Reverts the incident to `PENDING` and adds the responder to `declinedBy`.
    3. Re-broadcasts the emergency to other verified responders and alerts system administrators.

### 6. 🩺 Private Medical Info Card (Zero-Leak Health Profile)
- Users can securely store health details: Blood Group, Allergies, Pre-existing Conditions, Current Medications, and Emergency Notes.
- **Zero-Leak Access Control:**
  - `medicalInfo` is saved with `select: false` so it is never returned in general user queries, profile lookups, or incident documents.
  - Exposed via a dedicated endpoint (`GET /api/incidents/:id/medical-info`) accessible **only** to the currently assigned responder, **only** while the incident is `ACCEPTED` or `IN_PROGRESS`, and **only** if the citizen has explicitly enabled `shareWithResponders: true`.
  - Read directly on-demand with zero caching; turns off instantly if the citizen toggles off sharing or the incident is resolved.

### 7. 🏥 Nearby Emergency Services Directory (OpenStreetMap Overpass API)
- Real-time directory of hospitals and police stations within a configurable radius (up to 10 km) based on live GPS coordinates.
- Built without external backend dependencies using Node's native `fetch`.
- Features an 8-second timeout controller, multiple OSM mirror fallbacks (`overpass.openstreetmap.fr`, `overpass.kumi.systems`), and in-memory 10-minute caching.
- Custom accessible map markers and direct Google Maps navigation links.

### 8. 🚨 Emergency Contacts & Quick Alerts
- Storage of up to 5 trusted emergency contacts with primary designation.
- One-click emergency dispatch links pre-populated with live Google Maps coordinate links for SMS / WhatsApp sharing.

### 9. 🎛️ Admin Command Center & Accreditation Portal
- Dedicated admin portal restricted strictly to `ADMIN` role.
- **Accreditation Queue:** Review responder credentials, organization affiliations, and supervisor references.
- **Vetting Checklist:** Modal checklist covering ID verification, reference checks, and offline readiness evaluation before granting `VERIFIED` status.
- **Dispatcher Assignment Modal:** Filter verified professional vs. volunteer responders and assign emergencies directly.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer (React SPA)                      │
│      React 18 + Vite · Tailwind CSS · React-Leaflet · Socket.IO Client  │
└────────────────────┬───────────────────────────────┬────────────────────┘
                     │ REST (JSON / HttpOnly Cookie) │ WebSocket Events
                     ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API Gateway & Application Server                     │
│               Express 5 · Helmet · CORS · Rate Limiter · Zod            │
├─────────────────────────────────────────────────────────────────────────┤
│                               Middleware                                │
│        protect (JWT) · authorize (RBAC) · validate (Zod Schema)         │
├─────────────────────────────────────────────────────────────────────────┤
│                            Service Layer                                │
│  incidentService · authService · responderService · placesService ...   │
├────────────────────────────────────┬────────────────────────────────────┤
│         Persistence Layer          │        Real-Time Push Layer        │
│    Mongoose · 2dsphere Indexes     │       Socket.IO Room Emitter       │
└────────────────────┬───────────────┴──────────────────────┬─────────────┘
                     ▼                                      ▼
┌───────────────────────────────┐     ┌───────────────────────────────────┐
│     MongoDB Atlas Cluster     │     │      Connected Client Rooms       │
│  Users · Incidents · Places   │     │  user:<id> · incident:<id> · etc. │
└───────────────────────────────┘     └───────────────────────────────────┘
```

---

## 💻 Tech Stack

### Backend
- **Runtime & Framework:** Node.js (v20+, ES Modules) & Express.js v5
- **Database & ODM:** MongoDB Atlas with Mongoose ODM (GeoJSON 2dsphere indexing)
- **Real-Time Engine:** Socket.IO v4.8
- **Authentication:** Dual-token JWT (Access Token in memory/header, Refresh Token in `HttpOnly`, `SameSite` cookies)
- **Input Validation:** Zod schemas for all request bodies, queries, and parameters
- **Security:** Helmet (HTTP headers), bcrypt (password hashing), express-rate-limit, express-mongo-sanitize, CORS origin whitelist
- **Logging:** Pino & Morgan

### Frontend
- **Framework & Build:** React 18, Vite, React Router v6
- **Styling:** Tailwind CSS, PostCSS, Lucide React Icons
- **Mapping:** Leaflet & React-Leaflet with custom SVG/Canvas markers
- **HTTP & Sockets:** Axios (with automated refresh interceptors), Socket.IO Client
- **Testing:** Vitest, React Testing Library, jsdom

---

## 📁 Repository Structure

```text
CrisisConnect/
├── backend/
│   ├── scripts/               # DB seed scripts (seedAdmin.js, verifyModels.js)
│   ├── src/
│   │   ├── config/            # Environment variables and DB connection
│   │   ├── constants/         # Roles, statuses, severities, categories
│   │   ├── controllers/       # Thin HTTP route handlers
│   │   ├── middleware/        # Auth, RBAC, error handling, validation, rate limiting
│   │   ├── models/            # Mongoose schemas (User, Incident)
│   │   ├── routes/            # Express endpoint definitions
│   │   ├── services/          # Pure business logic and domain rules
│   │   ├── sockets/           # Socket.IO handlers, room management, emitters
│   │   └── utils/             # AppError, serializers, geo helpers
│   ├── tests/                 # Jest integration & unit test suites (107 tests)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/            # Static assets
│   │   ├── components/        # Reusable UI, layout, map, and form components
│   │   ├── constants/         # Synchronized frontend enums & labels
│   │   ├── context/           # AuthContext & SocketContext
│   │   ├── hooks/             # Custom hooks (useGeolocation, useIncidents, etc.)
│   │   ├── pages/             # Citizen, Responder, and Admin views
│   │   ├── routes/            # ProtectedRoute & RoleRoute guards
│   │   ├── services/          # Axios API clients
│   │   ├── tests/             # Vitest component & integration tests (49 tests)
│   │   ├── App.jsx            # Top-level route configuration
│   │   └── main.jsx           # React DOM root entry
│   └── package.json
│
├── Documents/                 # Architecture, PRD, and Master Build Plan specs
└── README.md
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/CrisisConnect.git
cd CrisisConnect
```

### 2. Backend Configuration & Setup
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file in `backend/` based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure your environment variables in `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:5173

   # MongoDB Atlas Connection
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/CrisisConnect

   # JWT Secrets
   JWT_ACCESS_SECRET=your_jwt_access_secret_key_minimum_32_chars
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_chars
   ACCESS_TOKEN_TTL=15m
   REFRESH_TOKEN_TTL=7d

   # OpenStreetMap Overpass API
   OVERPASS_URL=https://overpass.openstreetmap.fr/api/interpreter
   ```

4. Seed the initial Super Administrator account:
   ```bash
   npm run seed:admin
   ```
   *Default Admin Credentials:*
   - **Email:** `admin@crisisconnect.org`
   - **Password:** `Admin@12345`

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *Backend will run on [http://localhost:5000](http://localhost:5000).*

---

### 3. Frontend Setup
1. Open a new terminal, navigate to `frontend/`, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create a `.env` file in `frontend/`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend will launch on [http://localhost:5173](http://localhost:5173).*

---

## 🧪 Automated Testing Suite

The repository includes a comprehensive test suite across both the backend and frontend verifying auth, race conditions, geographic distance calculations, socket broadcasts, and security access controls.

### Backend Tests (Jest)
Runs 10 test suites covering 107 test cases against in-memory MongoDB:
```bash
cd backend
npm test
```
*Coverage includes:*
- `foundation.test.js`: Health checks, standard envelopes, AppError formatting.
- `auth.test.js`: User registration, login, refresh token rotation, logout.
- `incidents.test.js`: State transitions, atomic claim concurrency, cancel rules.
- `severity.test.js`: Heuristic rules across all incident categories.
- `responderSafety.test.js`: Pre-accept data sanitization, volunteer restrictions, "I feel unsafe" flow.
- `medicalInfo.test.js`: Zero-leak access control, live sharing rules, opt-in toggle.
- `nearbyPlaces.test.js`: OSM Overpass query mapping, Haversine sorting, 10-minute caching.
- `sockets.test.js`: Handshake authentication, room join permissions, disconnect grace period.
- `mapsAndLocation.test.js`: Location update throttling, GeoJSON queries.
- `emergencyContacts.test.js`: Contact CRUD, primary contact toggling, privacy isolation.

### Frontend Tests (Vitest)
Runs 8 test suites covering 49 component and integration tests:
```bash
cd frontend
npm test
```
*Coverage includes:*
- `routes.test.jsx`: Protected routes, role guards, unauthorized redirection.
- `medical.test.jsx`: Medical card rendering, tag inputs, responder lock state.
- `nearbyHelp.test.jsx`: Filter controls, directions links, 112 emergency alert banner.
- `maps.test.jsx`: Leaflet coordinate transformation, marker renders.
- `socket.test.jsx`: Socket connection status indicator, live updates.
- `badges.test.jsx`: Severity & status badge rendering.
- `common.test.jsx`: Buttons, inputs, modals, empty states.
- `contacts.test.jsx`: Emergency contact form, primary badge.

---

## 🛡️ Security & Privacy Guardrails

1. **Role Enforcement:** Client input can never set user roles. Public registration defaults to `USER`. Responder registration creates `RESPONDER` in a `PENDING` state. Admin accounts can only be created via the seed CLI.
2. **Strict Incident Ownership & IDOR Protection:** Services check caller identity on every read/write. Requests for incidents not owned by the requester return `404 Not Found` (rather than `403 Forbidden`) to eliminate incident ID enumeration.
3. **Coordinate Precision Truncation:** To safeguard vulnerable callers, responders cannot view exact GPS pins until their acceptance is committed to the database.
4. **Coordinate Integrity Utility:** GeoJSON standardizes on `[longitude, latitude]`; Leaflet requires `[latitude, longitude]`. All conversions are restricted to a single centralized utility function to prevent inversions.
5. **Sanitization:** All sensitive fields (`password`, `refreshTokenHash`, `medicalInfo`, `emergencyContacts`) default to `select: false` on Mongoose models.

---

## 🗺️ Project Roadmap & Current Progress

- [x] **Phase 1-3:** Requirements specification, system architecture, database design.
- [x] **Phase 4-5:** Backend foundation, secure JWT auth, refresh token rotation, RBAC.
- [x] **Phase 6:** Incident lifecycle state machine, atomic claim engine, computed severity.
- [x] **Phase 7:** React frontend, role-based dashboards, responder safety rules.
- [x] **Phase 8:** Real-time WebSockets, room segregation, disconnect grace period.
- [x] **Phase 9:** Live interactive Leaflet maps, geolocation, responder tracking.
- [x] **Pre-Phase 10 Enhancements:** 
  - Private Medical Info Card with zero-leak access control.
  - OpenStreetMap Overpass API integration for nearby hospitals & police stations.
  - Admin First Responder Accreditation & Vetting Portal.
- [ ] **Phase 10:** Private incident chat, message pagination, and in-app notification center.
- [ ] **Phase 11:** Jurisdiction management, dispatch heatmaps, and aggregate analytics.
- [ ] **Phase 12-14:** Production security hardening, Dockerization, and cloud deployment.

---

## 📄 License

This project is licensed under the ISC License.
