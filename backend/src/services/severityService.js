import { computeSeverity } from '../constants/severityRules.js';
import { SEVERITY_VALUES } from '../constants/severities.js';

/**
 * Severity Service
 * Single source of truth for calculating incident severity based on rules.
 */
export const calculateSeverity = ({ isSOS, category, checklist }) => {
  return computeSeverity({ isSOS, category, checklist });
};

export const isValidSeverity = (severity) => {
  return SEVERITY_VALUES.includes(severity);
};

export default {
  calculateSeverity,
  isValidSeverity,
};
