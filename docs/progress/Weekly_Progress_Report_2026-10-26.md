# Group 9 — Weekly Design Integration Progress Report

Project: Student Project Planning and Progress Tracking System

Team: Group 9, 星芒 / Xingmang

Reporting snapshot: 26 October 2026; course design work reviewed from 22–26 October 2026

Stage: ROUND2 Preliminary System Design / Cross-Module Integration Review

Status: **DRAFT PENDING TEAM REVIEW**

Publication edition: current design/progress content with local audit inventories omitted.

## 1. Project Overview

The project supports coursework teams with shared projects, task assignments, dependencies, progress views and understandable schedule warnings. Wei Mingrui is team leader and the F3/F4 functional owner; Zhang Weiyi owns F1/F2; Zhang Yuyang owns F5/F6. These are the existing responsibility assignments, not claims about hours worked or approval of these editorial changes.

This reporting cycle refines the existing design package. It does not complete an implemented software product. Original received reports, the verified URS, editable diagrams, older evidence and the four component Git histories remain preserved. Changes were editorially integrated with AI assistance and await functional-owner, team and relevant customer review.

## 2. Objectives for This Week

Make the three module reports, overall design and shared contracts consistent; add a valid CPM-to-warning integration path; define a justified duration-precision policy; specify authorized invalid-duration diagnostics and safe degradation; state date candidates without inventing approval; extend real requirement traceability; and give all ten open decisions actionable recommendations. Deliver matching editable reports/PDFs and reproducible evidence.

## 3. Work Completed

The current official filenames were retained. Four existing Word reports were edited and their matching PDFs regenerated; five integration attachments and three directly related scaffold Markdown files were synchronized. Root navigation was updated, and this independent English report was created. The original algorithms, numerical tables, module cases, figures and formal requirement priorities were retained.

| Current design output | Editable source and review PDF | PDF pages |
| --- | --- | --- |
| F1/F2 Project, Member and Task Management | [Word](../design/modules/ZhangWeiyi/01_Project_Task_Module_Design_ROUND2.docx) / [PDF](../design/modules/ZhangWeiyi/01_Project_Task_Module_Design_ROUND2.pdf) | 21 |
| F3/F4 Dependency and Schedule Analysis | [Word](../design/modules/WeiMingrui/02_Dependency_Schedule_Module_Design_ROUND2.docx) / [PDF](../design/modules/WeiMingrui/02_Dependency_Schedule_Module_Design_ROUND2.pdf) | 15 |
| F5/F6 Progress Monitoring and Risk Warnings | [Word](../design/modules/ZhangYuyang/03_Progress_Risk_Module_Design_ROUND2.docx) / [PDF](../design/modules/ZhangYuyang/03_Progress_Risk_Module_Design_ROUND2.pdf) | 32 |
| Overall Preliminary System Design | [Word](../design/overall/00_Preliminary_System_Design_ROUND2.docx) / [PDF](../design/overall/00_Preliminary_System_Design_ROUND2.pdf) | 18 |

The package contains 86 current review pages. The F3/F4 report adds one related precision/diagnostic subsection; the overall report adds a policy page and the IT25–IT27 continuation table. Report receipt, source reconstruction, document checks and arithmetic verification do not establish author or customer approval.

## 4. F3/F4 Design Improvements

The existing CPM equations are unchanged: earliest start is the maximum predecessor finish; earliest finish adds duration; the backward pass uses the common project finish and minimum successor late start; total float is LS−ES. Disconnected components, parallel branches and all tied critical activities remain supported.

The proposed centralized NumericPolicy preserves canonical finite decimal input digits and avoids intermediate rounding. Exact base10 decimal or equivalent rational arithmetic is preferred. Certified mathematical zero float is critical; genuine positive float remains noncritical even if the display rounds to zero. No integer-only or fixed-scale business restriction was approved.

A binary backend must justify one central conversion/operation error policy using supported range, precision, language and graph propagation. Outward-rounded interval arithmetic encloses computed values; intervals containing zero or inconsistent negative float require canonical exact or higher-precision proof before classification. Unresolved timing or criticality yields whole `UNAVAILABLE/CALCULATION_FAILED`, not an approximate partial critical set. No arbitrary fixed epsilon was selected. Concrete backend, range, input scale and bounds remain D-03/D-07 PENDING.

Invalid durations make the complete analysis `UNAVAILABLE/INVALID_INPUT`, with null duration, timings, critical IDs and finish. Authorized `DurationInputDiagnostic` entries identify taskId, `durationDays`, issue and message. The four issues are MISSING, NON_NUMERIC, NON_FINITE and NON_POSITIVE. Denied access uses generic public errors before private diagnostics. F2 missing-duration save acceptance remains a separate pending policy; optional F4 failure alone cannot undo an otherwise valid saved source.

## 5. Cross-Module Integration Improvements

F1/F2 retain source records and project-role authorization; F3 owns dependency links; F4 owns schedule arithmetic and certified criticality; F5 alone derives direct incomplete-prerequisite Blocked facts and raw progress; F6 composes the retained warning types. Blocked remains separate from the three stored states NOT_STARTED, IN_PROGRESS and COMPLETED. A blocked task stays in its original status count, and authorized manual status updates are not automatically locked.

All derived results bind to one current project source revision. Successful atomic source changes advance it once; reads and failed analysis do not. Reuse needs current-input proof and refreshed authorization/date facts. No separate graph/schedule counter or implemented transaction mechanism is claimed.

Reliable F5 counts, completion, assignments and evaluable overdue facts survive F4 failure. Valid current F3/status inputs also preserve MON-M3 Blocked facts and direct reasons. F6 marks types requiring absent criticality/finish as unevaluated; an independently supported overdue warning may remain evaluable. Unknown is not false or no risk. F6 off remains explicit NOT_ENABLED without disabling basic F5.

D-04 recommends calendar days, Day0 at plannedStartDate, and conditional LocalDate finish `plannedStartDate + ceil(T)` from canonical unrounded precision-resolved T. Unfinished overdue and project-conflict candidates use strict `>` comparisons; equality triggers neither. Missing/unconfirmed dates are unevaluated. Project calendar/timezone still needs agreement; chat timezone does not define it. IT12/16/21/22 are explicitly conditional.

## 6. Test Plan Extensions

The [current integration matrix](../integration/Integration_Test_Matrix_ROUND2.md) contains **27 planned scenarios, all NOT RUN**. Earlier 24-case snapshots remain historical evidence.

| Added plan | Design oracle and purpose | Execution |
| --- | --- | --- |
| IT25 End-to-End Valid Schedule and Blocked-Critical Warning | P25/revision7; A2/B3/C6/D2 diamond; T10; critical A/C/D; B float3; raw counts2/1/1; completion50%; D blocked directly by C only; enabled F6 warns for blocked-critical D; all sourceRevision values match. Absolute planning/deadline dates are null. | NOT RUN |
| IT26 Duration Precision and Criticality | Four valid integer/decimal/tied/tiny-positive-slack fixtures with exact oracles; binary near-zero demonstration; eight invalid variants. True C slack0.000000000001 remains noncritical. | NOT RUN |
| IT27 Invalid Duration Diagnostics and Safe Degradation | Whole-analysis invalid input, authorized task/field diagnostics, generic denied-access behavior, F2 save-policy separation, preserved F5/MON-M3 and per-type F6 degradation. Under explicitly selected dates, 26Oct−22Oct is4 overdue days. | NOT RUN |

The independent numerical companion also demonstrates 30×0.1: exact T=3, while naive binary accumulation yields3.0000000000000013. Conditional ceil must use canonical T, avoiding a fabricated extra day. This is additional arithmetic evidence, not a new integration ID or executed application test.

## 7. Requirement Traceability Updates

The [RTM](../integration/Requirement_Traceability_and_Priority_Matrix_ROUND2.md) traces the new cases to existing FR/NFR/DR clauses. All15 FR,5 NFR and5 DR formal identities/names and existing formal priority/source columns remain unchanged. FR-09/F3 is Should; FR-10/11/12 and FR-15 are Could; FR-13/14 are Must; FR-05/06 remain individually Unranked. NFR-05 remains Reliability.

IT25 links FR-09/10/11/13/14/15 across real ownership boundaries. IT26 traces FR-10/11/12 and planning rules; IT27 traces task/access/dependency/schedule/progress requirements plus NFR-04/05 and DR-04. The Must Dashboard Blocked subview depends on Should F3; D-01 remains unresolved. A fallback does not constitute full acceptance of missing Blocked capability.

## 8. Design Decisions and Recommendations

The [decision log](../integration/Integration_Conflict_and_Decision_Log_ROUND2.md) preserves the original questions, owners and pending states. Each now includes Current Problem, Recommended Option, Rationale, Affected Modules and Requirements, Consequences, Owner, Approval Needed and Status.

| Decision | Recommended direction for review | Status |
| --- | --- | --- |
| D-01 Scope/priorities | Preserve formal priorities; retain F3 where feasible; explicitly disclose and decide missing Blocked scope. | PENDING |
| D-02 Permissions | One explicit project-role permission table; no invented approval workflow. | PENDING |
| D-03 Fields/duration/deletion | Consider unestimated core tasks after agreement; supplied analysis estimates finite/positive with canonical precision; guard unresolved referenced deletion; no CANCELLED state. | PENDING |
| D-04 Dates | Calendar-day Day0, start+ceil(canonical T), strict comparisons, unknown dates unevaluated; agree project calendar/timezone. | PENDING |
| D-05 Status/empty display | Three stored states plus Blocked overlay; empty percentage null; separately agree early-completion exceptions and display rounding. | PENDING |
| D-06 Acceptance | Agree devices, loads, timing boundaries, usability and recovery protocol before measurement; URS expectations are not measured SLA results. | PENDING |
| D-07 Technology/consistency | Modular monolith, one revision and atomic/coherent access; central exact numerical policy preferred; choose concrete stack/mechanism and validate bounds later. | PENDING |
| D-08 Identity/invitation/Leader | Authorized invitations with explicit acceptance; deliberate sole-Leader handoff; no automatic successor. | PENDING |
| D-09 Notes | Minimal short notes and stable original-author references; no unapproved complex history/edit/delete scope. | PENDING |
| D-10 High-priority assignments | Show real assignments; do not add priority fields, scoring or ranking before definition. | PENDING |

No decision was closed and no meeting, vote, signature or customer feedback was invented.

## 9. Verification Evidence

| Evidence category | Actual outcome and boundary |
| --- | --- |
| Document/static checks | Current IDs, case fields/statuses, formal trace columns, decision fields, original-case preservation, links, tables, native report structure and full native-text/PDF parity checked. Results are retained in the local verification record and summarized in the public Change Log. |
| Independent numerical checks | Exact Fraction calculation from canonical inputs passed IT25 arithmetic, four IT26 valid fixtures, eight invalid classifications and four conditional date calculations plus the30×0.1 boundary example. This is a design oracle. |
| Visual checks | 86 final page-image hashes checked.52 current final pages were actually opened;34 others are byte-identical to preserved prior actual inspection. All changed and affected adjacent pages have current visual evidence. |
| Actual software runtime tests | NOT RUN. The scaffold has documentation, placeholder paths and an unchanged JSON fixture; no runnable application/test harness was found. No implementation was added. |
| Planned integration execution | All27 remain NOT RUN; no pass rate is claimed. |
| Records | Source reports and internal preservation records remain archived. This branch contains current public design and progress documents. |

The retained local verification archive binds checks to actual source files and separates document, arithmetic, layout and application-execution evidence. Internal snapshots, scripts, intermediate outputs and environment inventories are not part of this public branch. The [public Change Log](../integration/Change_Log_and_Evidence_Index_ROUND2.md) records the design chronology and limitations.

Document QA corrected an initial management PDF that omitted T02/T03 despite intact native rows, and compacted scheduling prose to remove two sparse spill pages. Final text parity and page records were checked after correction. Earlier failed attempts were retained locally. Fixture/date and checker-assumption corrections were recorded as document-tool issues rather than application test failures.

## 10. Current Limitations and Risks

All outputs remain DRAFT PENDING TEAM REVIEW. The chosen numeric backend/range/scale/error bounds and date/timezone policy are unapproved. Permission details, core required fields, deletion, authentication, invitation, Leader succession, note scope and early completion still require decisions. Several combined test plans need atomic runtime subcases later. Source reconstruction of the two teammate reports remains editorial, not original-author endorsement.

No application behavior, concurrent save, authentication, persistence/recovery, browser support, usability or performance acceptance was measured. The URS1–2-second refresh expectation and typical15–40-task workload are references for future agreement, not measured results or approved capacity limits. Document checks cannot substitute for those later tests.

## 11. Work Remaining

Functional owners must review their changes and the shared contract; team/customer must record real decisions on D-01–D-10. Resolve release scope and permissions first, then required fields/deletion/status/date policies and measurable acceptance. Select the smallest justified implementation stack, numerical representation and consistency mechanism. Split combined scenarios into executable normal, boundary, invalid-input, privacy and concurrency cases with explicit actual-result fields.

## 12. Next Week's Plan

1. Review this package with the three functional owners and record actual approvals or requested corrections.
2. Decide scope/permissions and high-impact lifecycle/date policies; freeze the shared contract after agreement.
3. Complete detailed data/interface design, supported numeric limits, atomic save/coherent read mechanism and acceptance environments.
4. Only after that agreement and implementation authorization, build a minimal vertical slice and executable tests; then run the27 plans or their approved atomic subcases and record real outputs.

No implementation, meeting, hours or approval is recorded as already completed by this plan. Repository publication is separate from design approval and application execution.
