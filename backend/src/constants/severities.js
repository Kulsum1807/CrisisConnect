// Severity levels assigned by the backend.
// The client never sets severity — it sends inputs (category, checklist)
// and the server computes the level using severityRules.js.
export const SEVERITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const SEVERITY_VALUES = Object.values(SEVERITIES);

// Numeric weight for sorting (higher = more urgent)
export const SEVERITY_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};
