# Group 9 F1–F6 integration readiness · 2026-11-11

The shared transaction foundation now includes the validated internal F2-03 member-role operation. INT-01 is partially implemented through this slice. The isolated F1/F2 management service still needs a reviewed mapping to the narrow shared operation.

## Current issue states

| Issue | Verified implementation | Remaining acceptance |
| --- | --- | --- |
| INT-01 | F2-03 is implemented through the trusted dispatcher and existing SQLite SourceUnitOfWork | Map the remaining F1/F2 operations and service boundaries |
| INT-06 | F2-03 rejects same-role requests after authorization and expectedRevision checks. The isolated Sprint 11 service patch is also verified | Connect the shared F1/F2 role service to F2-03 and rerun the service acceptance |
| INT-07 | The Sprint 11 in-memory adapter patch passed isolated module acceptance | Integrate the test adapter with explicit fixture ownership. Keep its evidence separate from SQLite transaction acceptance |
| INT-10 | The Sprint 11 domain and fixture-component patch passed isolated acceptance | Integrate the full monitoring source closure and preview, then validate shared composition |
| INT-02/03/04/05/08/09/11/12 | Existing open work | Follow the current scoped backlog and its dependencies |

## F2-03 evidence

The implementation enforces project-bound active membership, a current Leader caller, expectedRevision, the same-role error and the last-active-Leader invariant. A genuine role change writes the target role and timestamp together with one project Revision and timestamp in the existing transaction. Results are produced after confirmed COMMIT. Failure and UNKNOWN handling use the existing coordinator.

Both release workspaces passed 291 shared tests, including 6 F2-03 unit tests and 21 F2-03 SQLite integration tests. Existing G1-A focused suites passed 26 unit and 58 integration cases. The commands and code-level boundaries are summarized in the [capability document](../round3/G1_A_OPERATION_CAPABILITIES_2026-11-11.md).

## Next integration gates

The F1/F2 role service must pass its role intent to the narrow F2-03 dispatcher with trusted composition. Its old generic ManagementUnitOfWork callback remains outside the shared write path. The facade's MemberView and error mapping must be reviewed before implementation.

The monitoring package has a documented candidate location in src/domain/monitoring and a separate frontend monitoring preview. Integration requires the complete source, fixture and entry-point closure, including preservation of existing F3/F4 exports and the health application.

Production EP07, production identity, F2-05 handoff and authorized dashboard refresh are NOT_RUN. Production dashboard acceptance requires the applicable trusted-result, timezone and identity work. Full F1–F6, G1-B and G2 acceptance remains pending.

[Implementation backlog](../project-status/GROUP9_IMPLEMENTATION_BACKLOG_2026-11-11.csv) · [Sprint 11 integration plan](../roadmap/SPRINT11_INTEGRATION_PLAN_2026-11-11.md).
