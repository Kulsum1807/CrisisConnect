import { calculateSeverity } from '../src/services/severityService.js';
import { CATEGORIES } from '../src/constants/categories.js';
import { SEVERITIES } from '../src/constants/severities.js';

describe('Phase 6: Severity Calculation Rules', () => {
  describe('SOS Emergencies', () => {
    it('should assign HIGH severity to standard SOS by default', () => {
      const severity = calculateSeverity({ isSOS: true, category: CATEGORIES.MEDICAL });
      expect(severity).toBe(SEVERITIES.HIGH);
    });

    it('should assign CRITICAL severity to SOS when person is unconscious', () => {
      const severity = calculateSeverity({
        isSOS: true,
        category: CATEGORIES.MEDICAL,
        checklist: { conscious: false },
      });
      expect(severity).toBe(SEVERITIES.CRITICAL);
    });

    it('should assign CRITICAL severity to SOS when person is not breathing', () => {
      const severity = calculateSeverity({
        isSOS: true,
        category: CATEGORIES.MEDICAL,
        checklist: { breathing: false },
      });
      expect(severity).toBe(SEVERITIES.CRITICAL);
    });

    it('should assign CRITICAL severity to SOS when severe bleeding is reported', () => {
      const severity = calculateSeverity({
        isSOS: true,
        category: CATEGORIES.MEDICAL,
        checklist: { severeBleeding: true },
      });
      expect(severity).toBe(SEVERITIES.CRITICAL);
    });
  });

  describe('Medical Category', () => {
    it('should assign CRITICAL to medical emergencies with life-threat checklist', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.MEDICAL,
        checklist: { breathing: false },
      });
      expect(severity).toBe(SEVERITIES.CRITICAL);
    });

    it('should assign HIGH to medical emergencies when injuries are present without life threat', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.MEDICAL,
        checklist: { conscious: true, breathing: true, injuries: true },
      });
      expect(severity).toBe(SEVERITIES.HIGH);
    });

    it('should assign MEDIUM to standard medical emergencies with no severe indicators', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.MEDICAL,
        checklist: { conscious: true, breathing: true },
      });
      expect(severity).toBe(SEVERITIES.MEDIUM);
    });
  });

  describe('Fire and Natural Disaster Categories', () => {
    it('should always assign HIGH severity to FIRE', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.FIRE,
      });
      expect(severity).toBe(SEVERITIES.HIGH);
    });

    it('should always assign HIGH severity to NATURAL_DISASTER', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.NATURAL_DISASTER,
      });
      expect(severity).toBe(SEVERITIES.HIGH);
    });
  });

  describe('Crime / Security Category', () => {
    it('should assign HIGH severity when inDangerNow is true', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.CRIME_SECURITY,
        checklist: { inDangerNow: true },
      });
      expect(severity).toBe(SEVERITIES.HIGH);
    });

    it('should assign MEDIUM severity when not in immediate danger', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.CRIME_SECURITY,
        checklist: { inDangerNow: false },
      });
      expect(severity).toBe(SEVERITIES.MEDIUM);
    });
  });

  describe('Accident Category', () => {
    it('should assign HIGH severity when injuries are reported', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.ACCIDENT,
        checklist: { injuries: true },
      });
      expect(severity).toBe(SEVERITIES.HIGH);
    });

    it('should assign MEDIUM severity when no injuries are reported', () => {
      const severity = calculateSeverity({
        isSOS: false,
        category: CATEGORIES.ACCIDENT,
        checklist: { injuries: false },
      });
      expect(severity).toBe(SEVERITIES.MEDIUM);
    });
  });

  describe('Missing Person and Other Categories', () => {
    it('should assign MEDIUM severity by default', () => {
      expect(calculateSeverity({ isSOS: false, category: CATEGORIES.MISSING_PERSON })).toBe(
        SEVERITIES.MEDIUM
      );
      expect(calculateSeverity({ isSOS: false, category: CATEGORIES.OTHER })).toBe(
        SEVERITIES.MEDIUM
      );
    });
  });
});
