import { STATUSES } from './statuses.js';

// The allowed-transitions map is the heart of the incident state machine.
// Every status change goes through ONE function (transitionIncident) that
// checks this map. If the transition is not listed here, it is rejected.
//
// Format: { FROM_STATUS: [TO_STATUS, ...] }
// Actor guards and side effects are checked in the service, not here.
// This map only answers: "Is this move structurally allowed?"
export const ALLOWED_TRANSITIONS = {
  [STATUSES.PENDING]: [
    STATUSES.ASSIGNED,   // ADMIN assigns a responder
    STATUSES.ACCEPTED,   // RESPONDER self-claims (atomic)
    STATUSES.CANCELLED,  // Creator USER or ADMIN cancels
    STATUSES.REJECTED,   // ADMIN rejects (invalid / false report)
  ],
  [STATUSES.ASSIGNED]: [
    STATUSES.ACCEPTED,   // Assigned RESPONDER accepts
    STATUSES.PENDING,    // RESPONDER declines or ADMIN reassigns (back to pool)
    STATUSES.CANCELLED,  // Creator USER or ADMIN cancels
  ],
  [STATUSES.ACCEPTED]: [
    STATUSES.IN_PROGRESS, // Assigned RESPONDER starts work
    STATUSES.CANCELLED,   // Creator USER or ADMIN cancels
    STATUSES.PENDING,     // Creator reports unsafe responder (reset to pending)
  ],
  [STATUSES.IN_PROGRESS]: [
    STATUSES.RESOLVED,   // Assigned RESPONDER or ADMIN completes
    STATUSES.CANCELLED,  // ADMIN only (reason required)
    STATUSES.PENDING,     // Creator reports unsafe responder (reset to pending)
  ],
  // Terminal statuses — no transitions out
  [STATUSES.RESOLVED]: [],
  [STATUSES.CANCELLED]: [],
  [STATUSES.REJECTED]: [],
};
