# Requirement Traceability and Priority Matrix ROUND2

Status: DRAFT PENDING TEAM REVIEW. ROUND2 integration dated25 October2026; targeted consistency repair dated26 October2026. Primary source: verified24-page URS_REVISED,10 October 2026, SHA-256 `bcc20201741e9d84ebd98ea59c52545a0d49097654dae13c9daaea803c932740`. All PDF page references are physical pages. No requirement priority or customer approval is changed by this editorial matrix. All IT scenarios remain NOT RUN.

## Functional requirement trace

URS pp.7-8 preserve feature-derived priorities; FR-05 and FR-06 are explicitly individually Unranked. Feature groups F1/F2/F5 are Must, F3 Should, F4/F6 Could; this does not invent individual ratings for customer additions.

| ID | Exact retained requirement | Formal priority | URS detail page | Design responsibility | Planned scenario | Dependencies and open boundary |
| --- | --- | --- | --- | --- | --- | --- |
| FR-01 | Create Project | Must Have (F1) | 9 | MG-M0/M1/M2 | IT01/16/21 | Planned start/date field requirements and validation remain candidate. |
| FR-02 | Manage Project Members | Must Have (F1) | 9 | MG-M0/M2/M3/M4 | IT19/23 | Retain tasks unassigned on departure; invitation/succession details pending. |
| FR-03 | Create and Edit Tasks | Must Have (F2) | 10 | MG-M0/M3 | IT01/16/20/27 | Six-field candidate/mandatory and precision/lifecycle rules need confirmation. F2 omitted-estimate save policy stays separate from F4 whole-duration validation (D-03 PENDING). |
| FR-04 | Update Task Status | Must Have (F2) | 10 | MG-M3; MON refresh | IT05/06/07 | Saved state changes, not notes or assignment data. Authorized updates despite Blocked. |
| FR-05 | Task Comments and Progress Notes | Unranked individual addition | 11 | MG-M4 | IT14/19/24 | Do not inherit an invented individual Must vote; note history/edit rights pending. |
| FR-06 | Role Based Permission Control | Unranked individual addition | 11 | MG-M2; SH-COORD | IT01/13/19/27 | Visibility differs from write rights; agreement workflow unresolved. |
| FR-07 | Create Task Dependencies | Should Have (F3) | 12 | DS-F3 | IT02/15/18 | Valid saved links supplied to F4/F5. Dependency edit permissions pending. |
| FR-08 | Detect Invalid Circular Dependencies | Should Have (F3) | 12 | DS-F3.1/3.2/3.3 | IT03/15 | Candidate rejection preserves valid source/plan; no successful change fact. |
| FR-09 | Display Blocked Tasks and Reasons | Should Have (F3) | 13 | F3 links; MON-M3 derivation | IT04/05/07/18/10/11/25/27 | Cross-owner responsibility; formal priority remains Should, not Must. |
| FR-10 | Calculate Estimated Project Duration | Could Have (F4) | 13 | DS-F4.1/4.2 | IT08/09/10/12/18/25/26/27 | Requires complete valid same-revision dependency input for nonempty tasks. F4 off -> NOT_ENABLED/FEATURE_NOT_ENABLED; enabled empty -> NO_TASKS; enabled nonempty with unavailable dependency input -> UNAVAILABLE/DEPENDENCY_INPUT_UNAVAILABLE. No delivery guarantee. The complete finite-positive duration set is required for analysis; authorized INVALID_INPUT diagnostics do not imply F2 must reject a core save. |
| FR-11 | Identify Schedule Critical Activities | Could Have (F4) | 14 | DS-F4.3 | IT10/11/12/25/26/27 | Every critical task, including tied branches; unavailable null, not empty known set. Criticality uses centralized NumericPolicy-certified raw slack, not display rounding or per-module epsilon; precision/backend remains D-03/D-07 PENDING. |
| FR-12 | Recalculate Schedule After Changes | Could Have (F4) | 14 | SH-COORD; DS-F4.4 | IT02/06/11/15/16/21/26 | Save-first refresh; date comparisons separate; prove current dependency-view coherence and unchanged schedule inputs before reuse or republication. Conditional D-04 LocalDate mapping uses plannedStartDate+ceil(T) from canonical unrounded certified T, not a binary/display artifact. |
| FR-13 | Display Project Progress Dashboard | Must Have (F5) | 15 | Basic Dashboard: MON-M0 / MON-M1 / MON-M2 / MON-M4 / MON-M5 + UI | IT04/07/08/09/10/18/22/23/11/25/27 | Basic progress/status/assignment/overdue facts remain available independently of FR-15. Blocked subview -> MON-M3; dependent on Should Have FR-09 / F3; release decision D-01 remains PENDING. |
| FR-14 | Show Task Completion Status | Must Have (F5) | 15 | MON-M1/M2 | IT07/08/25/27 | Each task once; Blocked overlay separate; empty percentage null, proposed wording pending. |
| FR-15 | Display Schedule Warnings | Could Have (F6) | 16 | F6 composer; MON-M5/M6/M7 | IT09/10/11/12/16/17/25/27 | Three conditions only. Ease of overdue calculation does not upgrade this requirement. |

## Formal nonfunctional requirements

| ID | Formal name | URS page | Design response | Open acceptance boundary | Planned scenario |
| --- | --- | --- | --- | --- | --- |
| NFR-01 | Usability | 17 | Plain English labels, clear status/blocker explanations, simple forms and text with color. | Participant/pass thresholds not agreed. | IT04/07/09/24 |
| NFR-02 | Browser and Device Support | 17 | Chrome/Edge primary desktop; desirable mobile viewing/simple status; no native mobile scope. | Exact versions, viewports and retained mobile workflow open. | IT24 and future browser scenarios |
| NFR-03 | Performance | 18 | Target1-2-second refresh;15-40 tasks typical workload, not capacity or measured guarantee. | Devices/network/load/timing/repetition acceptance pending. | IT02/06/16/24 and future measured checks |
| NFR-04 | Security and Access Control | 18 | Specific project membership for source data/notes; view permission separate from edits; generic private-reference failures. | Authentication/invitation implementation and permissions pending. | IT13/19/23/27 |
| NFR-05 | Reliability | 18 | Visible save errors; retain entered input and valid source; preserve valid plan on rejected edits; recover saved data after temporary unavailability. | Recovery time/availability target not agreed. Maintainability/testability/explainability are unnumbered quality goals. | IT03/14/15/24/27 |

## Domain rules

All five detailed DR clauses are on URS p.19.

| ID | Formal rule | Preserved interpretation | Design/decision | Planned scenario |
| --- | --- | --- | --- | --- |
| DR-01 | Finish to Start Dependency Rule | Candidate computation, not real-work lock; authorized early status updates remain possible. | DS-F4; MG status policy; D-05 | IT06/12/21/25/26 |
| DR-02 | Calendar Day Durations | Elapsed calendar days including weekends/holidays; date mapping/timezone/inclusion still candidate. Recommended LocalDate mapping is start+ceil(T) under PENDING D-04; date-specific tests require explicit scenario adoption. | DS-F4; D-04 | IT12/16/21/22/25/26 |
| DR-03 | Parallel Task Support | Independent tasks can overlap, even for same assignee; no automatic serialization. | DS-F4 | Original F34 T05/T06/T07/T12; IT12; IT25; IT26 |
| DR-04 | Blocked Work as a Warning Condition | Unfinished task plus incomplete direct prerequisite; names, raw status and authorized updates retained. | F3 edges; MON-M3 | IT04/05/06/07/18/25/27 |
| DR-05 | Human Decisions for Workload Conflicts | No automatic reassignment or resource optimization; departing member leaves work unassigned. | MG lifecycle; DS/F5/F6 read-only analysis | IT06/19/20 |

## Must dashboard dependency on Should F3

FR-13 basic Must Have Dashboard maps to MON-M0 / MON-M1 / MON-M2 / MON-M4 / MON-M5 + UI: coordination, raw-status counts, completion, personal assignments, basic overdue facts and display. The Blocked subview maps separately to MON-M3 and requires valid current F3 links plus task statuses. FR-13 explicitly asks for blocked work, but the valid relationship input and FR-09 are Should Have. This is an unresolved release-dependency decision D-01, not an editorial authority to change URS. If F3 is disabled/unavailable, show reliable basic dashboard data plus Blocked availability NOT_ENABLED or UNAVAILABLE and a blocker-capability notice; do not report unknown blockers as none or claim full blocked-subview acceptance. If F3 is enabled and its complete edge set is validly empty, no-prerequisite results are known. F4 cannot assume that missing F3 data means a dependency-free plan.

The team/customer must decide whether to retain the Should dependency, alter release scope or formally approve a priority adjustment. The ROUND2 reports preserve original formal ratings while documenting the fallback and limitation. FR-13 high-priority assignment wording does not establish a new Task.priority field or approved ranking algorithm (D-10).

## Design protocol versus requirement approval

Uppercase TaskStatus codes, one revision/sourceRevision convention, four availability states and nullable unknown facts are the consistent proposed technical protocol. The strict greater-than date comparisons, initial NOT_STARTED policy, no-work wording and conservative referenced-deletion block remain candidates requiring agreement where URS is open. Document static/arithmetic checks are distinct from future software execution and acceptance.

Targeted contract boundaries dated26 October2026: ScheduleAvailability remains VALID | NO_TASKS | NOT_ENABLED | UNAVAILABLE. ScheduleResultView permits INVALID_INPUT, CALCULATION_FAILED, STALE_RESULT and DEPENDENCY_INPUT_UNAVAILABLE only for the corresponding UNAVAILABLE conditions; NOT_ENABLED uses FEATURE_NOT_ENABLED. DependencyResultView permits DEPENDENCY_INPUT_UNAVAILABLE, INVALID_INPUT or STALE_RESULT when unavailable, with FEATURE_NOT_ENABLED when F3 is off; it has no CALCULATION_FAILED reason. F3-enabled empty tasks use NO_TASKS and edges=[]; enabled nonempty tasks with a validated complete empty edge set use VALID and edges=[]; unknown input uses edges=null. ProgressResult/OverdueResult do not inherit F4 failures; F6 overdue evaluation may use current MON-M5 facts when F6 is enabled while critical/finish types remain unevaluated.

SH-COORD establishes one authorized project and committed revision context for tasks, members and complete F3 edges. DependencyResultView.sourceRevision must equal the supported ProjectSnapshot.revision. After note/role changes, prove the validated edge set and current task universe remain coherent, or read them coherently, before publishing at the current sourceRevision. Relevant task/edge changes require fresh validation; unproved old edges remain unavailable. F4 and F5/F6 use the same project counter and current-input proof; no dependencyRevision or scheduleRevision counter or implemented locking mechanism is introduced. All D-01 through D-10 decisions remain PENDING, including D-04 date rules.

Weekly design verification scope dated26 October2026: IT25 links current valid F4 CPM to MON-M3 and enabled F6 Blocked-critical warnings; IT26 conditionally checks the centralized exact-decimal/certified-binary NumericPolicy; IT27 checks authorized invalid-duration diagnostics and safe partial Dashboard behavior. All27 integration scenarios are NOT RUN. These planned traces preserve every formal FR/NFR/DR ID, name and priority; independent arithmetic does not establish application execution, NFR-03 performance or NFR-05 runtime reliability. D-01..D-10 remain PENDING.
