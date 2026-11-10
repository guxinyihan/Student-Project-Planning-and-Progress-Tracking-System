// Wire values remain opaque strings; brands prevent UserId/MemberId mix-ups in code.
declare const identifierBrand: unique symbol;
type Identifier<Name extends string> = string & { readonly [identifierBrand]: Name };
export type UserId = Identifier<'UserId'>;
export type ProjectId = Identifier<'ProjectId'>;
export type MemberId = Identifier<'MemberId'>;
export type TaskId = Identifier<'TaskId'>;
export type NoteId = Identifier<'NoteId'>;
export type DependencyId = Identifier<'DependencyId'>;
export type DecimalString = string;
export type LocalDate = string;
export type Instant = string;
export type Revision = number;
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ProjectRole = 'LEADER' | 'MEMBER';
function opaqueId<Name extends string>(value: unknown): Identifier<Name> {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new TypeError('Expected a nonempty opaque identifier.');
  return value as Identifier<Name>;
}
export const asUserId = (value: unknown): UserId => opaqueId<'UserId'>(value);
export const asProjectId = (value: unknown): ProjectId => opaqueId<'ProjectId'>(value);
export const asMemberId = (value: unknown): MemberId => opaqueId<'MemberId'>(value);
export const asTaskId = (value: unknown): TaskId => opaqueId<'TaskId'>(value);
export const asNoteId = (value: unknown): NoteId => opaqueId<'NoteId'>(value);
export const asDependencyId = (value: unknown): DependencyId => opaqueId<'DependencyId'>(value);
export function asRevision(value: unknown): Revision {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new TypeError('Revision must be a positive safe integer.');
  return value;
}
