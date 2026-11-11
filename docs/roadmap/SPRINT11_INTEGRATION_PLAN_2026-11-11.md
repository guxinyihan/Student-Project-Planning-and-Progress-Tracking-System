# Sprint 11 shared integration plan · 2026-11-11

Status PREPARED_FOR_REVIEW.

The next goal is shared integration of the verified INT-06, INT-07 and INT-10 module fixes. The published F2-03 capability supplies a protected role-write primitive. The complete F1/F2 and monitoring service/UI integration is pending.

## Work packages

| Task | Documented responsibility | Objective and scope | Prerequisite |
| --- | --- | --- | --- |
| S11-I01 / INT-06 | Zhang Weiyi, with Wei Mingrui for shared transaction coordination | Confirm the role facade mapping, then route role intent through the trusted F2-03 dispatcher | Review the service interface, output and error mapping |
| S11-I02 / INT-07 | Zhang Weiyi | Carry the verified in-memory adapter ownership fix into the shared test architecture | Confirm fixture and module placement |
| S11-I03 / INT-10 | Zhang Yuyang, with Wei Mingrui for shared composition | Carry the verified partial-overdue explanation and prototype display into the complete monitoring closure | Confirm the source and preview entry-point manifest |
| S11-I04 / regression | The corresponding module owners and integration role | Validate the actual integrated source and record exact test scopes and counts | The preceding changes pass their own checks |

These are the module responsibilities already recorded in the project. Reviewer assignment and implementation authorization belong to the next scoped review.

## INT-06 role-service integration

The source mapping begins at the archived ManagementService.changeRole request and ends at the existing trusted F2-03 dispatcher. The service submits only projectId, target memberId, role and expectedRevision. Actor authority comes from trusted composition. The facade must use the dispatcher for the actual role write, with project authorization and result/error mapping explicitly reviewed.

The reviewed file plan must identify the management policy and service locations, the narrow role adapter, and service acceptance tests. Resolve the difference between the old MutationResult<MemberView> and the internal F2-03 result carrying memberId, role and updatedAt. Resolve module error names and the shared authorization-before-Revision ordering. The old generic ManagementUnitOfWork callback cannot be the shared role-write path.

Acceptance covers LEADER to LEADER and MEMBER to MEMBER with INVALID_INPUT and unchanged timestamps, Revision and SavedChange. It also covers valid promotions and demotions, last-Leader protection, unauthorized or inactive callers, missing or cross-project targets, stale Revision precedence, real SQLite rollback and one Revision per confirmed change.

## INT-07 memory-adapter integration

Use the verified Sprint 11 patch as the source of the candidate-state and result ownership changes. Preserve the test adapter's independent state and returned DTO graphs, including nested objects, arrays and earlier snapshots. Complete potentially failing clone work before publication.

The file plan must identify the in-memory adapter, its ports and its test-only construction path. Acceptance covers bootstrap and run results, cross-project state, clone failure, injected commit failure and a successful later operation. Keep the in-memory adapter acceptance distinct from the existing real SQLite transaction tests.

## INT-10 monitoring integration

Confirm the complete monitoring source closure before applying its five-file Sprint 11 diff. The documented candidate locations are src/domain/monitoring, the independent frontend monitoring preview and its assets, the domain export, and module unit/component tests. The preview requires its existing workspace domain reference and entry-point configuration. Preserve existing F3/F4 exports and the shared health application while reviewing those additions.

Compose dashboard facts from the same source snapshot. Test a future deadline with a missing deadline, all unfinished tasks unevaluable, fully evaluated tasks with no overdue dates, and confirmed overdue tasks with an unknown remainder. Retain completed-task exclusion, same-day behavior, empty/disabled/stale states and source immutability. Verify the domain explanation in the rendered preview.

Production authorized-data and refresh acceptance depends on the applicable INT-03 result binding, INT-04 trusted date context and INT-05 identity slice, followed by INT-12. Record NOT_RUN while those production paths are unavailable.

## Verification and completion

Use the current 291-case shared suite as the regression baseline. Run the integrated role-service, module and cross-module checks separately unless the actual runner collects them as one suite. Record actual totals rather than adding historic module counts to the shared total. Recheck build, TypeScript, exact file hashes and diff cleanliness.

Each work package is done when its approved mapping is implemented, its declared tests pass without skips, original functionality passes regression, and an independent review confirms the scoped contract. The integrated release follows a separate review of exact commits and remote baselines.

[Current status](../project-status/GROUP9_CURRENT_PROJECT_STATUS_2026-11-11.md) · [Backlog](../project-status/GROUP9_IMPLEMENTATION_BACKLOG_2026-11-11.csv) · [F2-03 contract](../round3/G1_A_OPERATION_CAPABILITIES_2026-11-11.md).
