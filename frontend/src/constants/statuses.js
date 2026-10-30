export const STATUSES = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

export const STATUS_LABELS = {
  PENDING: 'Pending Dispatch',
  ASSIGNED: 'Responder Assigned',
  ACCEPTED: 'Responder Accepted',
  IN_PROGRESS: 'In Progress / On Scene',
  RESOLVED: 'Resolved',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

export const TERMINAL_STATUSES = [
  STATUSES.RESOLVED,
  STATUSES.CANCELLED,
  STATUSES.REJECTED,
];
