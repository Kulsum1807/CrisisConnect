// Incident lifecycle statuses.
// An incident progresses through these states; RESOLVED, CANCELLED,
// and REJECTED are terminal — once reached, no further transitions.
export const STATUSES = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

export const STATUS_VALUES = Object.values(STATUSES);

// Terminal statuses — no transitions allowed out of these
export const TERMINAL_STATUSES = [
  STATUSES.RESOLVED,
  STATUSES.CANCELLED,
  STATUSES.REJECTED,
];

// Active statuses — incident is still in progress
export const ACTIVE_STATUSES = [
  STATUSES.PENDING,
  STATUSES.ASSIGNED,
  STATUSES.ACCEPTED,
  STATUSES.IN_PROGRESS,
];
