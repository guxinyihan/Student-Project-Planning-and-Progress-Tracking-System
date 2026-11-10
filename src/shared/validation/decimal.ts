import type { DecimalString } from '../contracts/identifiers.js';

export interface DecimalLimits {
  maxSignificantDigits: number;
  maxFractionDigits: number;
}
// Technical candidate limits, pending D-03/D-07 joint review; no production business policy.
export const CANDIDATE_DECIMAL_LIMITS: Readonly<DecimalLimits> = Object.freeze({
  maxSignificantDigits: 24,
  maxFractionDigits: 18,
});
export interface ExactDecimal {
  readonly coefficient: bigint;
  readonly scale: number;
}
export class DecimalValidationError extends Error {
  constructor(
    public readonly code: 'INVALID_DECIMAL' | 'NON_POSITIVE' | 'LIMIT_EXCEEDED',
    message: string,
  ) {
    super(message);
    this.name = 'DecimalValidationError';
  }
}
function validateScale(value: ExactDecimal): void {
  if (
    typeof value.coefficient !== 'bigint' ||
    !Number.isSafeInteger(value.scale) ||
    value.scale < 0 ||
    value.scale > 10_000
  ) {
    throw new TypeError('Invalid exact-decimal representation or unsupported internal scale.');
  }
}
export function parseExactDecimal(
  value: unknown,
  limits: Readonly<DecimalLimits> = CANDIDATE_DECIMAL_LIMITS,
): ExactDecimal {
  if (
    !Number.isSafeInteger(limits.maxSignificantDigits) ||
    limits.maxSignificantDigits < 1 ||
    !Number.isSafeInteger(limits.maxFractionDigits) ||
    limits.maxFractionDigits < 0 ||
    limits.maxFractionDigits > 10_000
  ) {
    throw new TypeError('Invalid decimal parser limits.');
  }
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)) {
    throw new DecimalValidationError(
      'INVALID_DECIMAL',
      'Use a plain decimal string without signs, exponent or whitespace.',
    );
  }
  const [whole = '', fraction = ''] = value.split('.');
  const coefficientDigits = whole + fraction;
  const significant = coefficientDigits.replace(/^0+/, '').length || 1;
  if (significant > limits.maxSignificantDigits || fraction.length > limits.maxFractionDigits) {
    throw new DecimalValidationError(
      'LIMIT_EXCEEDED',
      'Decimal input exceeds the selected candidate parser limits.',
    );
  }
  return Object.freeze({ coefficient: BigInt(coefficientDigits), scale: fraction.length });
}
export function parsePositiveDuration(
  value: unknown,
  limits?: Readonly<DecimalLimits>,
): DecimalString {
  const parsed = parseExactDecimal(value, limits);
  if (parsed.coefficient <= 0n)
    throw new DecimalValidationError('NON_POSITIVE', 'Duration must be strictly positive.');
  return value as string; // Original validated digits, including source trailing zeros.
}
export function isPositiveDuration(value: unknown): value is DecimalString {
  try {
    parsePositiveDuration(value);
    return true;
  } catch {
    return false;
  }
}
function aligned(left: ExactDecimal, right: ExactDecimal): readonly [bigint, bigint, number] {
  validateScale(left);
  validateScale(right);
  const scale = Math.max(left.scale, right.scale);
  return [
    left.coefficient * 10n ** BigInt(scale - left.scale),
    right.coefficient * 10n ** BigInt(scale - right.scale),
    scale,
  ];
}
export function addExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const [a, b, scale] = aligned(left, right);
  return Object.freeze({ coefficient: a + b, scale });
}
export function subtractExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const [a, b, scale] = aligned(left, right);
  return Object.freeze({ coefficient: a - b, scale });
}
export function compareExact(left: ExactDecimal, right: ExactDecimal): -1 | 0 | 1 {
  const [a, b] = aligned(left, right);
  return a < b ? -1 : a > b ? 1 : 0;
}
export function normalizeExact(value: ExactDecimal): ExactDecimal {
  validateScale(value);
  let { coefficient, scale } = value;
  if (coefficient === 0n) return Object.freeze({ coefficient: 0n, scale: 0 });
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale--;
  }
  return Object.freeze({ coefficient, scale });
}
export function formatExactDecimal(value: ExactDecimal): DecimalString {
  const normalized = normalizeExact(value);
  const negative = normalized.coefficient < 0n;
  const absolute = negative ? -normalized.coefficient : normalized.coefficient;
  const digits = absolute.toString().padStart(normalized.scale + 1, '0');
  const body =
    normalized.scale === 0
      ? digits
      : digits.slice(0, -normalized.scale) + '.' + digits.slice(-normalized.scale);
  return (negative ? '-' : '') + body;
}
export function ceilExact(value: ExactDecimal): bigint {
  validateScale(value);
  const denominator = 10n ** BigInt(value.scale);
  const integer = value.coefficient / denominator;
  return integer + (value.coefficient > 0n && value.coefficient % denominator !== 0n ? 1n : 0n);
}
