# G1-A internal operation capabilities · 2026-11-11

The internal trusted dispatcher now enables five operations.

| Operation | Runtime capability methods | Bound mutation |
| --- | --- | --- |
| F2-03 | stageTargetRole() | One same-project active membership role |
| F2-07 | readTaskToUpdateFields(), stageTaskAllowedFields() | Existing task name only |
| F3-04 | stageDependencyInsert() | Bound dependency insertion |
| F3-05 | stageDependencyRemove() | Bound dependency removal |
| F3-06 | stageDependencyInsert(), stageDependencyRemove() | One bound atomic dependency batch |

The catalog retains 27 entries, including the internal bootstrap substep. Existing disabled catalog entries retain their gates.

## F2-03 internal command

```json
{"operationId":"F2-03","projectId":"P1","expectedRevision":1,"payload":{"memberId":"M2","role":"LEADER"}}
```

The command parser accepts only its exact fields. The role is LEADER or MEMBER. The composition root injects InternalAuthority. The dispatcher binds the target and role before issuing the frozen zero-argument stageTargetRole capability.

The coordinator validates the command shape, obtains the existing SQLite write lock, resolves the trusted caller, checks active membership and current Leader authority, verifies expectedRevision, and resolves the active target within that project. Same-role requests return INVALID_INPUT with No changes supplied. A demotion requires another active Leader in the same project.

A valid mutation updates the target role and member timestamp, then uses the existing project compare-and-swap to update the project timestamp and increment Revision once. Before COMMIT, the coordinator rechecks the same trusted caller, membership, exact target postimage and the Leader invariant. Authorized self-demotion requires the expected MEMBER postimage and another active Leader.

The committed value carries memberId, role and updatedAt. SavedChange uses changeKind F2-03, changedFields [role] and an empty affectedTaskIds list. The existing result adapter constructs the immutable result after confirmed COMMIT. Confirmed rollback preserves the prior state. An uncertain outcome retains UNKNOWN diagnostics and connection isolation.

## Boundaries and validation

Generic SourceUnitOfWork.run remains disabled. Request data cannot supply callbacks, MutationPlan, actor authority, repositories, SQL or transaction functions. Project-scoped reads and all writes stay in the existing coordinator. Public application entry points retain their existing route surface.

F2-03 is the internal role-change capability. Production EP07, production identity and F2-05 explicit handoff remain NOT_RUN. The [existing REST design](ROUND3_API_Contract.md) retains its public endpoint and handoff gates.

| Validation in each independent release workspace | Result |
| --- | --- |
| Full shared suite | 291/291 |
| F2-03 unit | 6/6 |
| F2-03 real temporary SQLite integration | 21/21 |
| Focused G1-A unit | 26/26 |
| Focused G1-A SQLite integration | 58/58 |
| Build, TypeScript and diff check | PASS |

Focused cases overlap the full suite. All runs had zero skipped or pending cases.

## Source and acceptance references

- [Capability registry and parser](../../src/backend/application/operation-capabilities.ts), [types](../../src/backend/application/unit-of-work.ts), [trusted dispatcher](../../src/backend/application/operation-dispatcher.ts), [receipt adapter](../../src/backend/application/mutation-result-adapter.ts), and [SQLite coordinator](../../src/backend/persistence/source-unit-of-work.ts).
- [F2-03 unit cases](../../tests/unit/g1-f203-role-command.test.ts), [F2-03 SQLite cases](../../tests/integration/g1-f203-member-role.test.ts), and [exact capability regression cases](../../tests/unit/g1-capability-dispatch.test.ts).
