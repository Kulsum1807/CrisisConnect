# CrisisConnect: brain.md

> The running memory of the project. Read it at the start of every work session. Update it at the end of every session. If a decision, fix or lesson is not written here, it will be forgotten.

**Project name:** CrisisConnect (never "CrisisConnect 2.0"; that name was a mistake in an early draft)
**Last updated:** 2026-10-05

---

## 0. How to use this file

1. **Start of session:** read sections 1, 2 and 13 (status, rules, open questions). Read others as needed.
2. **During work:** when you decide something, add it to section 6. When a bug costs you more than 15 minutes, add it to section 11 straight away.
3. **End of session:** update section 1 (status), section 12 (progress tracker) and add an entry to section 14 (session log).
4. **Before interviews:** read sections 3, 4, 5, 6, 11 and 15.
5. **If using an AI assistant:** paste the prompt in section 16 at the start of a session.

Keep entries short. This file is a working memory, not a report.

---

## 1. Current status (update every session)

| Item | Value |
|---|---|
| Current phase | Phase 1 to 2 documentation complete; ready to start Phase 3 (database design) then Phase 4 (backend foundation) |
| Last completed | PRD, Design Document, Architecture and Tools Document, Testing and API Reference documents written |
| Working on now | (fill in) |
| Next action | Create repository and folder structure; set up Atlas; write Mongoose schemas from Design Document section 5 |
| Blockers | None |
| Branch | (fill in) |
| Last commit | (fill in) |

---

## 2. Ground rules (never break these)

1. **Name** is CrisisConnect. No "2.0".
2. **Backend decides** role, severity, status transitions, ownership. The client only sends inputs.
3. **Role is never accepted from the client.** Public register creates USER. Admin is created by seed script.
4. **All status changes go through one function** (`transitionIncident`) using the allowed-transition map and a conditional update.
5. **Database is the source of truth.** Socket events are hints. After reconnect, re-fetch via REST.
6. **Ownership checks** in the service layer for every incident read and write. Return 404 (not 403) for another user's incident.
7. **Never return** passwords, refresh token hashes or stack traces.
8. **AI is optional.** The core workflow works without it.
9. **GeoJSON order is [lng, lat]. Leaflet order is [lat, lng].** Convert in one utility.
10. **Understand every line.** If you cannot explain a piece of code, stop and learn it before moving on.
11. **Scope tiers:** MVP first, then Core+, then Stretch. Do not start Stretch before MVP is stable.
12. **Every fixed bug** gets a regression test (where possible) and a log entry in section 11.

---

## 3. Project snapshot

**One line:** A MERN real-time emergency response and incident management platform connecting citizens, verified responders and admins through SOS and manual reports, live status, incident-specific chat and live responder location.

**30-second explanation:** CrisisConnect lets a user trigger an SOS or report an incident with their location. Nearby verified responders are alerted over Socket.IO; exactly one accepts (atomic claim). The user then tracks the responder and chats with them until the incident is resolved. Admins verify responders, assign incidents and see analytics. The core is a backend-controlled incident state machine with role-based access.

**Why v1 (Flask prototype) was replaced:** in-memory alerts, no real auth, role sent by the client, global chat, no incident lifecycle, no responder management.

**Roles:** USER (citizen), RESPONDER (verified), ADMIN.

**Categories:** MEDICAL, FIRE, ACCIDENT, CRIME_SECURITY, NATURAL_DISASTER, MISSING_PERSON, OTHER.

**Severity:** LOW, MEDIUM, HIGH, CRITICAL (computed by backend).

**Out of scope (v1):** mobile app, payments, SMS gateway, complex AI prediction, hospital/government integrations, microservices, Kubernetes.

**Disclaimer to show in app:** prototype only; in a real emergency call the local emergency number (112 in India).

### Documents

| Document | File | Purpose |
|---|---|---|
| Project Requirement Document | CrisisConnect_PRD.docx | What the system must do (FR, NFR, user stories, business rules) |
| Design Document | CrisisConnect_Design_Document.docx | Data model, state machine, API design, auth, UI/UX, security |
| Architecture and Tools | CrisisConnect_Architecture_and_Tools.docx | Layers, folders, real-time, deployment, tool choices |
| Testing and API Reference | CrisisConnect_Testing_and_API_Reference.docx | Test cases, example test code, endpoint contracts |
| brain.md | this file | Running memory, decisions, bugs, status |
| Phase Document | (to be created) | Task-level plan for phases 0 to 16 |
| Code Explanation Guide | (to be created as you build) | File-by-file explanations |
| Interview Preparation | (to be created) | Question banks and explanations |

---

## 4. Architecture cheat sheet

```
React SPA --(REST + cookies)--> Express --> middleware --> controllers --> SERVICES --> Mongoose --> MongoDB Atlas
React SPA --(WebSocket)-----> Socket.IO --> auth handshake --> socket handlers --> SERVICES
```

- **Layers:** routes (map) -> middleware (protect, authorize, validate) -> controllers (thin) -> services (business rules) -> models.
- **Sockets and controllers share services.** No duplicated rules.
- **app.js** builds the Express app (no listen). **server.js** starts HTTP + Socket.IO + DB.
- **Middleware order:** helmet, cors (exact origin, credentials), json (limit), cookie-parser, logger, sanitize, rate limit, routes, notFound, errorMiddleware.
- **Rooms:** `user:<id>`, `responders:online`, `admins`, `incident:<id>`.
- **Frontend:** pages -> components (props only) -> hooks (fetch + subscribe) -> services (Axios) ; contexts only for auth and socket.
- **Deployment (start):** one service; Express serves the built React app (same origin, no CORS or cross-site cookie problems).

---

## 5. Data model cheat sheet

**Collections:** users, incidents, messages, notifications, counters.

**users:** name, email (unique), phone, password (bcrypt, select:false), role, isActive, refreshTokenHash (select:false), responderProfile { verificationStatus PENDING|VERIFIED|REJECTED, verificationNote, availability ONLINE|OFFLINE|BUSY, specialization[], currentLocation GeoJSON (2dsphere), lastLocationAt }.

**incidents:** incidentNumber (CC-1001, unique), createdBy, assignedResponder, category, description, isSOS, severity, status, location GeoJSON (2dsphere), locationAvailable, address, checklist, evidence[], statusHistory[{status, changedBy, at, note}], declinedBy[], cancelReason, assignedAt/acceptedAt/resolvedAt, timestamps.

**messages:** incidentId, senderId, text (1 to 500), readAt, createdAt. Index {incidentId, createdAt}.

**notifications:** userId, type, title, message, relatedIncident, isRead, createdAt. Index {userId, isRead, createdAt}.

**counters:** { _id: "incident", seq }. Increment atomically with `$inc` + upsert.

**Key indexes:** users.email unique; incidents {status, severity, createdAt}; incidents {createdBy, createdAt}; incidents {assignedResponder, status}; 2dsphere on incident location and responder location.

**Embed vs reference:** embed small bounded data (statusHistory, location); reference unbounded data (messages, notifications).

---

## 6. Incident lifecycle and decisions

### Status transitions (who can do what)

| From | To | Actor | Guard |
|---|---|---|---|
| (new) | PENDING | system | valid input |
| PENDING | ASSIGNED | ADMIN | responder verified, ONLINE, not in declinedBy |
| PENDING | ACCEPTED | RESPONDER (claim) | verified, ONLINE; atomic on status = PENDING |
| ASSIGNED | ACCEPTED | assigned RESPONDER | caller is assignedResponder |
| ASSIGNED | PENDING | RESPONDER (decline) or ADMIN (reassign) | status ASSIGNED |
| ACCEPTED | IN_PROGRESS | assigned RESPONDER | |
| IN_PROGRESS | RESOLVED | assigned RESPONDER or ADMIN | |
| PENDING/ASSIGNED/ACCEPTED | CANCELLED | creator USER or ADMIN | USER not after IN_PROGRESS |
| IN_PROGRESS | CANCELLED | ADMIN | reason required |
| PENDING | REJECTED | ADMIN | reason required |

Terminal: RESOLVED, CANCELLED, REJECTED.

**Atomic claim (concept):**
```js
Incident.findOneAndUpdate(
  { _id: id, status: "PENDING" },
  { $set: { status: "ACCEPTED", assignedResponder: responderId },
    $push: { statusHistory: { status: "ACCEPTED", changedBy: responderId, at: now } } },
  { new: true }
); // null => already taken (409 ALREADY_TAKEN)
```

### Severity rules (starting point)

| Situation | Severity |
|---|---|
| SOS | HIGH; CRITICAL if life-threat indicator |
| Medical | CRITICAL if not breathing / unconscious / severe bleeding; HIGH if in pain; else MEDIUM |
| Fire, Natural Disaster | HIGH |
| Crime/Security | HIGH if in danger now; else MEDIUM |
| Accident | HIGH if injuries; else MEDIUM |
| Missing Person, Other | MEDIUM |

### Decisions log

| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-01 | 2026-10-05 | Initial status is PENDING (no CREATED state) | CREATED and PENDING lasted milliseconds | Decided |
| D-02 | 2026-10-05 | Responders may self-claim; admins may also assign | Speed plus a safety net | Decided |
| D-03 | 2026-10-05 | Latest responder location stored on the user document | No extra collection; TTL trail is Stretch | Decided |
| D-04 | 2026-10-05 | Access token (about 15 min) + refresh token (about 7 days), httpOnly cookies | Safer than localStorage; real logout | Decided |
| D-05 | 2026-10-05 | GeoJSON points with 2dsphere index | Nearby-responder queries | Decided |
| D-06 | 2026-10-05 | Incident numbers CC-1001 via counters collection | Human-friendly; no duplicates | Decided |
| D-07 | 2026-10-05 | One API envelope: success, message, data / code, errors | Predictable frontend | Decided |
| D-08 | 2026-10-05 | Paginated lists (default 20, max 100) | Performance | Decided |
| ADR-01 | 2026-10-05 | Layered modular monolith | One developer; simpler | Decided |
| ADR-03 | 2026-10-05 | REST for commands, Socket.IO for pushes | Validation + low latency | Decided |
| ADR-10 | 2026-10-05 | Deploy as one service first | Avoid cross-site cookies and CORS | Proposed |

Add new decisions here with the same format (ID, date, decision, reason, status).

---

## 7. Conventions

**Naming**
- Files: backend `camelCase.js` for modules (`incidentService.js`); React components `PascalCase.jsx`; hooks `useThing.js`; constants `UPPER_SNAKE` values, `camelCase` file names.
- Enums stored as UPPER_SNAKE strings (`IN_PROGRESS`).
- Routes: plural nouns, kebab-case for multiword; action routes only for non-CRUD state changes (`/assign`, `/cancel`, `/accept`).
- Socket events: `resource:action` (`incident:updated`, `chat:send`).
- Collections: plural lowercase (`incidents`); Mongoose models singular PascalCase (`Incident`).

**API**
- Success: `{ success: true, message, data }`. Error: `{ success: false, message, code, errors? }`.
- Error codes: VALIDATION_ERROR, UNAUTHENTICATED, TOKEN_EXPIRED, FORBIDDEN, ACCOUNT_SUSPENDED, NOT_FOUND, DUPLICATE, INVALID_TRANSITION, ALREADY_TAKEN, RESPONDER_UNAVAILABLE, RATE_LIMITED, SERVER_ERROR.
- Controllers: thin, wrapped in `asyncHandler`. Services throw `AppError(message, status, code)`.

**Git**
- Branches: `main` (always working), `feature/<name>`, `fix/<name>`.
- Commit messages: imperative and specific ("Add JWT auth middleware", "Implement atomic incident claim").
- Pull request even when working alone. Never commit `.env`; commit `.env.example`.

**Code style**
- ESLint + Prettier. Prefer `async/await`. Validate input before controllers. No business logic in routes or components.
- Comments explain *why*, not *what*.

---

## 8. Environment variables

**Backend (.env):** NODE_ENV, PORT, MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, CLIENT_URL, COOKIE_SAMESITE, COOKIE_SECURE, ALERT_RADIUS_KM, CLAIM_TIMEOUT_SEC (Stretch: image storage keys).
**Frontend (.env):** VITE_API_URL, VITE_SOCKET_URL.
Rules: validate required variables at startup (fail fast); never put secrets in frontend variables; keep `.env.example` updated.

---

## 9. Commands (fill in the real ones as you create them)

```text
# backend
npm install
npm run dev        # nodemon src/server.js          (to create)
npm test           # jest                           (to create)
npm run seed:admin # create the first admin         (to create)

# frontend
npm install
npm run dev        # vite dev server                (to create)
npm run build
npm test           # vitest                         (to create)
```

Useful checks: `node -v`, `npm -v`, Atlas IP allowlist set, Compass connected, `git status` clean before switching branches.

---

## 10. Test accounts and fixtures (development only)

| Account | Role / state | Purpose |
|---|---|---|
| admin@test.com | ADMIN | admin actions |
| asha@test.com | USER | main reporter |
| ravi@test.com | USER | IDOR tests |
| resp1@test.com | RESPONDER verified ONLINE | accept flow |
| resp2@test.com | RESPONDER verified ONLINE | race tests |
| resp3@test.com | RESPONDER verified OFFLINE | offline cases |
| resp4@test.com | RESPONDER pending | unverified cases |
| suspended@test.com | USER inactive | suspension cases |

Never use these in production. Use strong unique passwords and real seed values there.

---

## 11. Troubleshooting log

### How to write an entry

```text
### BUG-001: short title (date)
Symptom:    what you saw (error message, wrong behaviour)
Cause:      the real root cause
Diagnosis:  how you found it (what you checked, in order)
Fix:        what you changed
Why it works: one or two sentences
Prevention: test added / rule added / habit
Interview line: one sentence you could say in an interview
```

### Known pitfalls to watch for (anticipated, not yet encountered)

| Area | Pitfall | What to do |
|---|---|---|
| Location | Markers appear in the wrong country | GeoJSON is [lng, lat]; Leaflet is [lat, lng]; convert in one util |
| Leaflet | Default marker icons missing after bundling | Import and set icon URLs explicitly |
| Leaflet | Map shows as a thin strip | Give the map container a fixed height |
| Cookies | Login works in Postman but not in browser | `withCredentials: true` on Axios; `credentials: true` + exact origin in CORS; correct SameSite/Secure |
| Cookies | Works locally, fails after deploy on split domains | Third-party cookie rules; deploy as one service or use subdomains |
| Sockets | Messages appear twice | Listeners not removed on unmount; use `socket.off` in cleanup; one socket per session |
| Sockets | Stale UI after network drop | Re-fetch via REST after reconnect |
| Mongoose | 500 error on malformed id | Validate ObjectId in middleware, return 400 |
| Mongoose | `$near` fails | Needs 2dsphere index and valid [lng, lat] coordinates |
| Mongoose | Password appears in responses | `select: false`; never spread raw user documents |
| Express | Errors not caught in async handlers | Wrap with `asyncHandler` |
| Express | Tests open a port and hang | Test `app.js`, not `server.js`; close server and DB in afterAll |
| Auth | Token expires and user is kicked out | Axios interceptor: one silent refresh then retry |
| Auth | Suspended user keeps access | Check `isActive` in `protect` middleware and socket handshake |
| React | useEffect runs twice in development | Strict Mode behaviour; make effects idempotent with cleanup |
| Hosting | Real-time fails in production | Host must support WebSockets; check proxy settings |

### Bug entries

(none yet)

---

## 12. Progress tracker

Status: `[ ]` not started, `[~]` in progress, `[x]` done.

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Existing project analysis | [x] | Limitations listed in PRD section 2 |
| 1 | Requirements and feature specification | [x] | PRD v1.0 |
| 2 | System design and architecture | [x] | Design Document, Architecture and Tools |
| 3 | Database design | [ ] | Schemas from Design Document section 5 |
| 4 | Backend foundation | [ ] | Repo, structure, config, error handling |
| 5 | Authentication and authorization | [ ] | Cookies, refresh, RBAC, validation, rate limit |
| 6 | Incident management | [ ] | Lifecycle, severity, claim, assign, cancel |
| 7 | React frontend | [ ] | Layouts, routes, auth pages, dashboards |
| 8 | Real-time communication | [ ] | Socket auth, rooms, events |
| 9 | Maps and location | [ ] | Leaflet, geolocation, live responder marker |
| 10 | Chat and notifications | [ ] | Incident chat, persisted notifications |
| 11 | Admin and analytics | [ ] | Verification, assignment, dashboard, aggregates |
| 12 | Security hardening | [ ] | Review every route and socket event |
| 13 | Testing | [ ] | Fill gaps, E2E scenarios, non-functional |
| 14 | Deployment | [ ] | Hosting, env, production smoke test |
| 15 | Documentation | [ ] | Finalize docs, README with screenshots |
| 16 | Interview preparation | [ ] | Explanations, bug stories, question banks |

### MVP checklist
- [ ] Register, login, logout; roles enforced on the server
- [ ] SOS and manual report create persistent incidents with computed severity
- [ ] Lifecycle enforced; statusHistory recorded
- [ ] Responders go ONLINE, see incidents, accept exactly once
- [ ] Admin verifies responders and assigns incidents
- [ ] Role-limited incident lists
- [ ] Real-time status updates without refresh
- [ ] Map shows incident and user locations
- [ ] Deployed and demonstrated end to end

---

## 13. Open questions

| Question | Options | Leaning | Needed by |
|---|---|---|---|
| Styling | Tailwind or plain CSS | Tailwind | Before Phase 7 |
| Validation library | Zod, Joi, express-validator | Zod | Phase 4 |
| Module system | CommonJS or ES modules | ES modules | Phase 4 |
| Language | JavaScript or TypeScript | JavaScript first | Phase 4 |
| Hosting | To be compared (must support WebSockets; check current free-tier limits) | One service first | Phase 14 |
| Image storage | Cloudinary or similar, or skip | Skip until Stretch | Phase 6 |
| Logger | morgan + pino or winston | morgan + pino | Phase 4 |
| Search radius and claim timeout | e.g. 5 km and 60 s | Start with these, make configurable | Phase 6 |

Move answered questions to the decisions log (section 6).

---

## 14. Session log

Newest first. One entry per session.

```text
### YYYY-MM-DD
Goal:
Done:
Learned:
Problems / bugs (BUG ids):
Decisions (D ids):
Next:
```

### 2026-10-05
Goal: finish planning documents before writing code.
Done: reviewed the original project summary; wrote PRD, Design Document, Architecture and Tools Document, Testing and API Reference; created this file.
Learned: scope tiers prevent endless growth; the incident state machine and atomic claim are the core of the project.
Problems / bugs: none.
Decisions: D-01 to D-08 and ADR-01 to ADR-10 recorded above.
Next: create repository, set up Atlas, write Mongoose schemas, start the backend foundation.

---

## 15. Interview notes

### Stories to be ready for
- **The hardest problem:** two responders accepting the same incident. Solution: one atomic conditional update; the loser gets 409 and the UI shows "already taken". Tested with parallel requests.
- **A security detail:** returning 404 instead of 403 for another user's incident so existence is not revealed; role never taken from the client.
- **A design choice:** database as source of truth, sockets as hints, re-fetch after reconnect.
- **A trade-off:** monolith instead of microservices; PostgreSQL would also have been reasonable.
- **A bug you fixed:** (add from the troubleshooting log)

### Quick answers
- REST vs Socket.IO: REST for commands with validation and status codes; sockets for pushing events without polling.
- Why services layer: reuse by REST and sockets; testable; one home for business rules.
- Why httpOnly cookies: JavaScript cannot read them, so XSS cannot steal tokens; refresh token enables real logout.
- Why embed statusHistory but reference messages: bounded and always read together vs unbounded growth.
- What is not built on purpose: mobile app, payments, SMS, hospital integrations, microservices.

### Lessons learned (fill in as you go)
-

---

## 16. Prompt to paste at the start of an AI-assisted session

```text
Project: CrisisConnect (MERN real-time emergency response and incident management platform).
The name is "CrisisConnect" only, never "2.0".
Read brain.md sections 1, 2, 6 and 13 first. Follow the ground rules in section 2.
Today's goal: <goal>.
Explain the "why" behind each piece of code in simple terms so I can defend it in interviews.
Do not add features outside the current scope tier. If something conflicts with the PRD or
Design Document, point it out instead of silently changing it.
At the end, give me: (1) what changed, (2) decisions to record, (3) bugs and lessons to log.
```

---

## 17. Reference links to keep handy (add yours)

- Repository: (add)
- Deployed URL: (add)
- Atlas project: (add)
- Postman collection: (add)
- Design inspiration / mockups: (add)
