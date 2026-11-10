import { describe, expect, it } from 'vitest';
import {
  asDependencyId,
  asMemberId,
  asNoteId,
  asProjectId,
  asRevision,
  asTaskId,
  asUserId,
} from '@group9/shared';

describe('G1-T01 shared identifiers and revision boundary primitives', () => {
  it('preserves opaque wire identifiers without imposing a new identifier format', () => {
    const token = 'opaque:项目/9';
    for (const convert of [asUserId, asProjectId, asMemberId, asTaskId, asNoteId, asDependencyId]) {
      expect(convert(token)).toBe(token);
      expect(JSON.stringify(convert(token))).toBe(JSON.stringify(token));
    }
  });

  it.each([undefined, null, '', ' ', '\t\n', 9, {}, ['U1']])(
    'rejects a missing, blank, or non-string identifier: %j',
    (value) => {
      expect(() => asUserId(value)).toThrow(TypeError);
      expect(() => asMemberId(value)).toThrow(TypeError);
      expect(() => asTaskId(value)).toThrow(TypeError);
    },
  );

  it('accepts positive safe integer revisions through the exact upper boundary', () => {
    expect(asRevision(1)).toBe(1);
    expect(asRevision(7)).toBe(7);
    expect(asRevision(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([
    undefined,
    null,
    '7',
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    1n,
  ])('rejects invalid or unsafe revisions: %s', (value) => {
    expect(() => asRevision(value)).toThrow(TypeError);
  });
});
