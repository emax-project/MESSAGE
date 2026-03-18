import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dateKeyWithTime,
  daysInMonth,
  normalizeTimeRange,
  startOfMonth,
  toLocalDateKey,
  toLocalInputValue,
} from './date';

describe('main date utils', () => {
  it('toLocalInputValue returns yyyy-mm-ddThh:mm format', () => {
    expect(toLocalInputValue('2026-03-18T09:07:00')).toBe('2026-03-18T09:07');
  });

  it('toLocalInputValue returns empty string for invalid date', () => {
    expect(toLocalInputValue('not-a-date')).toBe('');
  });

  it('toLocalDateKey returns yyyy-mm-dd key', () => {
    expect(toLocalDateKey('2026-12-03T23:10:00')).toBe('2026-12-03');
  });

  it('toLocalDateKey returns empty string for invalid date', () => {
    expect(toLocalDateKey('invalid')).toBe('');
  });

  it('startOfMonth returns first day of month', () => {
    const start = startOfMonth(new Date('2026-08-22T15:30:00'));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
  });

  it('daysInMonth handles leap year correctly', () => {
    expect(daysInMonth(new Date('2024-02-10T00:00:00'))).toBe(29);
    expect(daysInMonth(new Date('2025-02-10T00:00:00'))).toBe(28);
  });

  it('addMonths moves month and normalizes to first day', () => {
    const next = addMonths(new Date('2026-01-25T10:10:00'), 2);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(2);
    expect(next.getDate()).toBe(1);
  });

  it('dateKeyWithTime combines key and time', () => {
    expect(dateKeyWithTime('2026-03-18', '09:00')).toBe('2026-03-18T09:00');
    expect(dateKeyWithTime('', '09:00')).toBe('');
  });

  it('normalizeTimeRange returns base range when input is invalid', () => {
    expect(normalizeTimeRange('2026-03-18', '', '')).toEqual({
      startAt: '2026-03-18T09:00',
      endAt: '2026-03-18T10:00',
    });

    expect(normalizeTimeRange('2026-03-18', '2026-03-18T11:00', '2026-03-18T10:00')).toEqual({
      startAt: '2026-03-18T09:00',
      endAt: '2026-03-18T10:00',
    });
  });

  it('normalizeTimeRange keeps times from valid range and applies selected date', () => {
    expect(normalizeTimeRange('2026-04-30', '2026-03-18T14:15', '2026-03-18T16:45')).toEqual({
      startAt: '2026-04-30T14:15',
      endAt: '2026-04-30T16:45',
    });
  });
});
