import { describe, expect, it } from 'vitest';
import { displayNameFromEmail } from './display-name';

describe('displayNameFromEmail', () => {
  it('uses the local part of an email address', () => {
    expect(displayNameFromEmail('anna@example.com')).toBe('anna');
  });

  it('falls back when the email is missing or empty', () => {
    expect(displayNameFromEmail(null)).toBe('user');
    expect(displayNameFromEmail(undefined)).toBe('user');
    expect(displayNameFromEmail('')).toBe('user');
    expect(displayNameFromEmail('@example.com')).toBe('user');
  });

  it('truncates a very long local part', () => {
    const local = 'a'.repeat(100);
    expect(displayNameFromEmail(`${local}@example.com`)).toBe('a'.repeat(80));
  });
});
