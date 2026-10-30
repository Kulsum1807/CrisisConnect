// Barrel file — re-export all constants from one place
// Usage: import { ROLES, STATUSES, CATEGORIES, ... } from '../constants/index.js';

export { ROLES, ROLE_VALUES } from './roles.js';
export { STATUSES, STATUS_VALUES, TERMINAL_STATUSES, ACTIVE_STATUSES } from './statuses.js';
export { CATEGORIES, CATEGORY_VALUES } from './categories.js';
export { SEVERITIES, SEVERITY_VALUES, SEVERITY_WEIGHT } from './severities.js';
export { ALLOWED_TRANSITIONS } from './transitions.js';
export { computeSeverity } from './severityRules.js';
export {
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_VALUES,
  AVAILABILITY,
  AVAILABILITY_VALUES,
  RESPONDER_TYPES,
  RESPONDER_TYPE_VALUES,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_VALUES,
} from './responder.js';
export { RELATIONSHIPS, RELATIONSHIP_VALUES } from './contacts.js';

