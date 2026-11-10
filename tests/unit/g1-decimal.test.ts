import { describe, expect, it } from 'vitest';
import {
  addExact,
  ceilExact,
  compareExact,
  DecimalValidationError,
  formatExactDecimal,
  isPositiveDuration,
  normalizeExact,
  parseExactDecimal,
  parsePositiveDuration,
  subtractExact,
} from '@group9/shared';

function expectDecimalError(value: unknown, code: DecimalValidationError['code']): void {
  try {
    parsePositiveDuration(value);
    expect.fail('The invalid duration was accepted.');
  } catch (error) {
    expect(error).toBeInstanceOf(DecimalValidationError);
    expect((error as DecimalValidationError).code).toBe(code);
  }
}

describe('G1-T02 decimal input validation and source precision', () => {
  it.each(['1', '0.1', '0.10', '123456.123456789123456789', '0.000000000000000001'])(
    'preserves valid positive source digits exactly: %s',
    (source) => {
      expect(parsePositiveDuration(source)).toBe(source);
      expect(isPositiveDuration(source)).toBe(true);
    },
  );

  it.each([
    undefined,
    null,
    0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '',
    ' ',
    ' 0.1',
    '0.1 ',
    '\n1',
    '1\n',
    '+1',
    '-1',
    '-0.0',
    '1e-12',
    '1E3',
    'NaN',
    'Infinity',
    '01',
    '00.1',
    '.1',
    '1.',
    '1,000',
    '1_000',
    '１',
    {},
  ])('rejects noncanonical decimal input without coercion: %j', (value) => {
    expectDecimalError(value, 'INVALID_DECIMAL');
    expect(isPositiveDuration(value)).toBe(false);
  });

  it.each(['0', '0.0', '0.000000000000000000'])(
    'permits arithmetic zero but rejects zero as a duration: %s',
    (value) => {
      expect(parseExactDecimal(value).coefficient).toBe(0n);
      expectDecimalError(value, 'NON_POSITIVE');
    },
  );

  it('rejects inputs above either candidate limit visibly, without rounding', () => {
    expect(parsePositiveDuration('999999999999999999999999')).toBe('999999999999999999999999');
    expectDecimalError('9999999999999999999999999', 'LIMIT_EXCEEDED');
    expectDecimalError('0.0000000000000000001', 'LIMIT_EXCEEDED');
    expect(() =>
      parsePositiveDuration('1.230', { maxSignificantDigits: 3, maxFractionDigits: 3 }),
    ).toThrow(DecimalValidationError);
    expect(() =>
      parsePositiveDuration('1.230', { maxSignificantDigits: 4, maxFractionDigits: 2 }),
    ).toThrow(DecimalValidationError);
    expect(parsePositiveDuration('1.230', { maxSignificantDigits: 4, maxFractionDigits: 3 })).toBe(
      '1.230',
    );
  });

  it('rejects invalid technical parser limit configurations', () => {
    for (const limits of [
      { maxSignificantDigits: 0, maxFractionDigits: 18 },
      { maxSignificantDigits: 1.5, maxFractionDigits: 18 },
      { maxSignificantDigits: 24, maxFractionDigits: -1 },
      { maxSignificantDigits: 24, maxFractionDigits: 1.5 },
      { maxSignificantDigits: 24, maxFractionDigits: 10_001 },
    ]) {
      expect(() => parseExactDecimal('1', limits)).toThrow(TypeError);
    }
  });
});

describe('G1-T03 exact scaled-BigInt arithmetic primitives, not a CPM engine', () => {
  it('adds 0.1 and 0.2 exactly and keeps the submitted 0.10 token distinct from formatting', () => {
    const source = parsePositiveDuration('0.10');
    const sum = addExact(parseExactDecimal(source), parseExactDecimal('0.2'));
    expect(sum).toEqual({ coefficient: 30n, scale: 2 });
    expect(formatExactDecimal(sum)).toBe('0.3');
    expect(source).toBe('0.10');
    expect(formatExactDecimal(parseExactDecimal(source))).toBe('0.1');
  });

  it('accumulates thirty 0.1 quantities to exactly 3', () => {
    let total = parseExactDecimal('0');
    for (let index = 0; index < 30; index += 1) {
      total = addExact(total, parseExactDecimal('0.1'));
    }
    expect(total).toEqual({ coefficient: 30n, scale: 1 });
    expect(formatExactDecimal(total)).toBe('3');
    expect(compareExact(total, parseExactDecimal('3.000'))).toBe(0);
  });

  it('keeps a 10^-12 difference positive and distinct from mathematical zero', () => {
    const difference = subtractExact(parseExactDecimal('0.3'), parseExactDecimal('0.299999999999'));
    expect(difference).toEqual({ coefficient: 1n, scale: 12 });
    expect(formatExactDecimal(difference)).toBe('0.000000000001');
    expect(compareExact(difference, parseExactDecimal('0'))).toBe(1);
    expect(compareExact(parseExactDecimal('0'), difference)).toBe(-1);
    expect(formatExactDecimal(subtractExact(difference, difference))).toBe('0');
  });

  it('supports exact derived sums beyond the proposed input significant-digit ceiling', () => {
    const maximumInput = parseExactDecimal('999999999999999999999999');
    expect(formatExactDecimal(addExact(maximumInput, parseExactDecimal('1')))).toBe(
      '1000000000000000000000000',
    );
  });

  it.each([
    ['0', 0n],
    ['0.000000000001', 1n],
    ['2', 2n],
    ['2.000', 2n],
    ['2.000000000001', 3n],
    ['999999999999999999999999', 999999999999999999999999n],
  ] as const)('computes the exact mathematical ceiling of %s', (source, expected) => {
    expect(ceilExact(parseExactDecimal(source))).toBe(expected);
  });

  it('handles subtraction and normalization without a negative-zero representation', () => {
    const negative = subtractExact(parseExactDecimal('0.1'), parseExactDecimal('2.30'));
    expect(formatExactDecimal(negative)).toBe('-2.2');
    expect(ceilExact(negative)).toBe(-2n);
    expect(ceilExact({ coefficient: -200n, scale: 2 })).toBe(-2n);
    expect(normalizeExact({ coefficient: 0n, scale: 18 })).toEqual({ coefficient: 0n, scale: 0 });
    expect(formatExactDecimal({ coefficient: 0n, scale: 18 })).toBe('0');
  });

  it('round-trips mixed scales, large coefficients, and source tokens through exact formatting', () => {
    for (const source of [
      '0',
      '0.10',
      '0.000000000000000001',
      '123456.123456789123456789',
      '999999999999999999999999',
    ]) {
      const parsed = parseExactDecimal(source);
      const reparsed = parseExactDecimal(formatExactDecimal(parsed));
      expect(compareExact(parsed, reparsed)).toBe(0);
      expect(Object.isFrozen(parsed)).toBe(true);
    }
  });

  it('rejects unsafe internal scale metadata before arithmetic', () => {
    for (const scale of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 10_001]) {
      const invalid = { coefficient: 1n, scale };
      expect(() => formatExactDecimal(invalid)).toThrow(TypeError);
      expect(() => addExact(invalid, parseExactDecimal('1'))).toThrow(TypeError);
      expect(() => ceilExact(invalid)).toThrow(TypeError);
    }
  });
});
