import type { LocalDate } from '../contracts/identifiers.js';
export function isLeapYear(year: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 9999 &&
    year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0)
  );
}
export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}
export function asLocalDate(value: unknown): LocalDate {
  if (!isLocalDate(value)) throw new TypeError('Expected a valid Gregorian YYYY-MM-DD LocalDate.');
  return value;
}
/** Candidate selection validator: canonical runtime-supported IANA zones plus explicit UTC.
 * It does not select a default, map an instant, or activate any project date business rule.
 * Acceptance of historical aliases is deferred to the D-04 joint review.
 */
export function isSupportedProjectTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  return value === 'UTC' || Intl.supportedValuesOf('timeZone').includes(value);
}
