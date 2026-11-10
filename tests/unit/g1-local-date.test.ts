import { describe, expect, it, vi } from 'vitest';
import { asLocalDate, isLeapYear, isLocalDate, isSupportedProjectTimeZone } from '@group9/shared';

describe('G1-T04 strict Gregorian LocalDate primitives', () => {
  it.each(['0001-01-01', '9999-12-31', '2000-02-29', '2024-02-29', '2026-10-30', '2400-02-29'])(
    'accepts and preserves valid calendar-only source %s',
    (value) => {
      expect(isLocalDate(value)).toBe(true);
      expect(asLocalDate(value)).toBe(value);
    },
  );

  it.each([
    undefined,
    null,
    20261030,
    new Date('2026-10-30T00:00:00Z'),
    '',
    '0000-01-01',
    '10000-01-01',
    '1900-02-29',
    '2100-02-29',
    '2026-02-29',
    '2026-04-31',
    '2026-06-31',
    '2026-00-10',
    '2026-13-10',
    '2026-10-00',
    '2026-10-32',
    '2026-1-01',
    '2026-01-1',
    '2026/10/30',
    '2026-10-30T00:00:00Z',
    '2026-10-30+08:00',
    ' 2026-10-30',
    '2026-10-30 ',
    '2026-10-30\n',
  ])('rejects invalid dates and implicit timestamp coercion: %j', (value) => {
    expect(isLocalDate(value)).toBe(false);
    expect(() => asLocalDate(value)).toThrow(TypeError);
  });

  it('applies the Gregorian century rule and a complete 400-year leap cycle', () => {
    const leapYears = Array.from({ length: 400 }, (_, index) => index + 1600).filter(isLeapYear);
    expect(leapYears).toHaveLength(97);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2400)).toBe(true);
    expect(isLeapYear(0)).toBe(false);
    expect(isLeapYear(10000)).toBe(false);
    expect(isLeapYear(2024.5)).toBe(false);
  });

  it('validates calendar-only dates without consulting the runtime timezone', () => {
    const formatter = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Calendar validation must not infer a runtime timezone.');
    });
    try {
      expect(asLocalDate('2026-10-30')).toBe('2026-10-30');
      expect(isLocalDate('2026-02-29')).toBe(false);
      expect(formatter).not.toHaveBeenCalled();
    } finally {
      formatter.mockRestore();
    }
  });
});

describe('G1-T04 candidate explicit project-timezone selection guard', () => {
  it.each(['UTC', 'Asia/Shanghai', 'America/Los_Angeles'])(
    'accepts an explicitly supplied supported zone: %s',
    (value) => {
      expect(isSupportedProjectTimeZone(value)).toBe(true);
    },
  );

  it.each([undefined, null, '', ' ', 'CST', '+08:00', 'UTC+8', 'Asia/No_Such_Zone', 8])(
    'does not infer a missing or invalid project timezone: %j',
    (value) => {
      expect(isSupportedProjectTimeZone(value)).toBe(false);
    },
  );
});
