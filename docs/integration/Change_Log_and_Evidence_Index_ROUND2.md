# ROUND2 Design Change Log and Verification Summary

Status: **DRAFT PENDING TEAM REVIEW**. Current design plan: **27 integration scenarios, all NOT RUN**. All D-01 through D-10 decisions remain **PENDING**.

This publication edition summarizes the retained design change record. Local machine paths, backup inventories, intermediate audit records and environment details are not part of the public package. The original full records remain preserved in the project archive.

## Design revision history

| Date and stage | Recorded changes | Boundary |
| --- | --- | --- |
| 25 October 2026, ROUND2 integration | Received F1/F2 and F5/F6 source reports; integrated them with F3/F4 and the overall design; normalized module ownership, fields, availability and source-version conventions; preserved original source provenance. The initial integration matrix contained24 cases. | Editorial integration, not owner/customer approval or application implementation. |
| 26 October 2026, targeted consistency repair | Scoped dependency/schedule reasons; FR-13 basic-versus-Blocked mapping; current dependency-view proof; IT10/IT11/IT18 preconditions and degraded views. | No revised formal priority, architecture replacement or runtime test claim. |
| 26 October 2026, Blocked coverage follow-up | IT10 and IT11 explicitly retain current MON-M3 Blocked facts and direct incomplete-prerequisite reasons when current F3/status facts are valid despite unavailable/stale F4. | Unknown dependencies remain the distinct IT18 case; stale Blocked data is never reused as current. |
| 26 October 2026, weekly integration | Added IT25 normal CPM-to-warning flow, IT26 precision oracles and IT27 authorized invalid-duration diagnostics/safe degradation; synchronized four editable reports and review PDFs; added ten decision recommendations. | Current27 cases remain NOT RUN; every decision remains PENDING. |
| 26 October 2026, evidence wording clarification | The prior matrix had24 cases:20 complete case blocks were unchanged, while IT12/16/21/22 only appended conditional date Preconditions. All prior titles, operations, expected results, modules, traces and execution states were retained. | A candidate date explanation does not approve D-04 or constitute a new software test result. |

## Current package

The [document index](../README.md) links four editable Word reports, their matching review PDFs and native diagrams. Report page counts are21/15/32/18 (86total). The public integration package contains the [shared contract](Cross_Module_Interface_Contract_ROUND2.md), [RTM](Requirement_Traceability_and_Priority_Matrix_ROUND2.md), [decision log](Integration_Conflict_and_Decision_Log_ROUND2.md) and [27-case matrix](Integration_Test_Matrix_ROUND2.md).

## Main design changes

- F1/F2 own source records, project membership/permissions and task status. Member departure preserves work and clears affected assignments; unresolved referenced deletion remains guarded.
- F3 owns validated links; F4 owns CPM and certified critical activity facts; F5 alone derives direct incomplete-prerequisite Blocked overlays and progress; F6 composes retained warnings.
- One project revision advances once per successful atomic source change; expectedRevision protects writes and sourceRevision binds derived results. Reuse requires coherent current-input proof.
- Result states distinguish VALID, NO_TASKS, NOT_ENABLED and UNAVAILABLE. Reasons are scoped by result type. Reliable basic Dashboard data and current F3/status blockers survive F4 failure; absent critical/finish facts remain unevaluated.
- Proposed NumericPolicy preserves canonical decimal input with no intermediate rounding, prefers exact decimal/rational arithmetic, and requires certified central error handling if binary arithmetic is chosen. Display rounding never determines criticality.
- Invalid complete-set duration input gives whole UNAVAILABLE/INVALID_INPUT and authorized task/field diagnostics; no partial schedule is published. F2 save policy remains separate and pending.
- D-04 recommends calendar-day Day0 and start+ceil(canonical unrounded T), strict date comparisons and missing facts unevaluated. Input limits, numeric backend, date/timezone rules and approval remain open.
- The15 FR,5 NFR and5 DR formal identities/names and priorities remain preserved. FR-09 is Should; FR-10/11/12 and FR-15 are Could; FR-13/14 are Must. The FR-13 blocker dependency on F3 remains D-01.

## Recorded verification

| Category | Recorded result | Limit |
| --- | --- | --- |
| Document/static checks | Case identity/fields/status, formal trace columns, decision fields, preserved case scope, links, tables and report structure were checked. | Document review does not execute application behavior. |
| Independent numerical verification | IT25: T10, critical A/C/D, B float3, raw2/1/1, completion50%, D blocked directly by C. Four valid precision fixtures, eight invalid classifications and conditional date examples were recomputed. | A design arithmetic oracle, not the F3/F4/F5/F6 implementation. |
| Word/PDF content | Four native report/PDF pairs were matched;2761 nonempty native text items and86 review pages were covered. | Any publication-specific file preparation is checked separately before upload. |
| Page layout | Existing final-page evidence recorded52 current direct page views and34 byte-identical earlier inspected pages. A later evidence-alignment check reopened4 key pages. | It did not claim a fresh visual reopening of all86 pages. |
| Export corrections | An initial management export lost T02/T03 despite intact native rows; the corrected export restores them. Scheduling prose was compacted to resolve sparse spill pages. | Failed attempts were retained; export success alone was not accepted as proof. |
| Application execution | All27 integration scenarios remain NOT RUN. Browser, performance, recovery, concurrency and authentication implementation tests were not executed. | No pass rate, measured SLA or implementation-completion claim. |

## Review and next stage

The ten recommendations in the decision log await genuine functional-owner/team/customer confirmation. Next steps are review, scope/permission/lifecycle/date decisions, detailed interfaces/data/consistency/numeric limits and measurable acceptance conditions, followed by separately planned implementation and real tests.

See the [weekly execution summary](../progress/Weekly_Integration_Execution_Report_2026-10-26.md) and [English weekly report](../progress/Weekly_Progress_Report_2026-10-26.md). Publication or a Git commit does not approve a business policy or execute an integration scenario.
