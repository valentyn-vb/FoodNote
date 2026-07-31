import { describe, it, expect } from 'vitest';
import { fullNameOf, initialsOf } from './user-display';

const user = (firstName: string, lastName: string) => ({ firstName, lastName });

describe('fullNameOf', () => {
  it('returns "First Last" for a normal user', () => {
    expect(fullNameOf(user('Jamie', 'Rivera'))).toBe('Jamie Rivera');
  });

  it('returns an empty string for null', () => {
    expect(fullNameOf(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(fullNameOf(undefined)).toBe('');
  });

  it('trims when lastName is empty', () => {
    expect(fullNameOf(user('Jamie', ''))).toBe('Jamie');
  });

  it('trims when firstName is empty', () => {
    expect(fullNameOf(user('', 'Rivera'))).toBe('Rivera');
  });
});

describe('initialsOf', () => {
  it('returns uppercase initials for a normal user', () => {
    expect(initialsOf(user('Jamie', 'Rivera'))).toBe('JR');
  });

  it('returns an empty string for null', () => {
    expect(initialsOf(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(initialsOf(undefined)).toBe('');
  });

  it('uppercases lowercase initials', () => {
    expect(initialsOf(user('jamie', 'rivera'))).toBe('JR');
  });

  it('handles single-character first name', () => {
    expect(initialsOf(user('J', 'Rivera'))).toBe('JR');
  });

  it('returns only the first initial when lastName is empty', () => {
    expect(initialsOf(user('Jamie', ''))).toBe('J');
  });

  it('returns only the last initial when firstName is empty', () => {
    expect(initialsOf(user('', 'Rivera'))).toBe('R');
  });
});
