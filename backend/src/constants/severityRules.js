import { CATEGORIES } from './categories.js';
import { SEVERITIES } from './severities.js';

// Severity computation rules.
// The client sends only inputs (category, isSOS, checklist answers).
// The server uses this table to decide the severity level.
// Rules are kept in one file so they are easy to explain and change.

/**
 * Compute incident severity based on category, SOS flag, and checklist.
 *
 * @param {Object} params
 * @param {boolean} params.isSOS - Whether this is an SOS trigger
 * @param {string}  params.category - One of CATEGORY_VALUES
 * @param {Object}  [params.checklist] - Optional answers: { conscious, breathing, severeBleeding, inDangerNow, injuries }
 * @returns {string} One of SEVERITY_VALUES
 */
export function computeSeverity({ isSOS, category, checklist = {} }) {
  const { conscious, breathing, severeBleeding, inDangerNow, injuries } = checklist;

  // Life-threat indicators → CRITICAL
  const hasLifeThreat = breathing === false || conscious === false || severeBleeding === true;

  // SOS always starts at HIGH; CRITICAL if life-threat indicators
  if (isSOS) {
    return hasLifeThreat ? SEVERITIES.CRITICAL : SEVERITIES.HIGH;
  }

  // Category-specific rules
  switch (category) {
    case CATEGORIES.MEDICAL:
      if (hasLifeThreat) return SEVERITIES.CRITICAL;
      if (injuries === true) return SEVERITIES.HIGH;
      return SEVERITIES.MEDIUM;

    case CATEGORIES.FIRE:
    case CATEGORIES.NATURAL_DISASTER:
      return SEVERITIES.HIGH;

    case CATEGORIES.CRIME_SECURITY:
      return inDangerNow === true ? SEVERITIES.HIGH : SEVERITIES.MEDIUM;

    case CATEGORIES.ACCIDENT:
      return injuries === true ? SEVERITIES.HIGH : SEVERITIES.MEDIUM;

    case CATEGORIES.MISSING_PERSON:
    case CATEGORIES.OTHER:
    default:
      return SEVERITIES.MEDIUM;
  }
}
