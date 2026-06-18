import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '../../../src/utils/validators';

describe('validators', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@.com')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test@domain')).toBe(false);
      expect(validateEmail('test @domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for passwords meeting all criteria', () => {
      const result = validatePassword('Strong!Pass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for passwords less than 8 characters', () => {
      const result = validatePassword('S!p1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should return errors for missing uppercase letters', () => {
      const result = validatePassword('weak!pass123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should return errors for missing lowercase letters', () => {
      const result = validatePassword('WEAK!PASS123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should return errors for missing numbers', () => {
      const result = validatePassword('Strong!Pass');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('should return errors for missing special characters', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should return multiple errors for multiple missing criteria', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
