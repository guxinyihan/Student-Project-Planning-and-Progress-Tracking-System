# Integration Test Matrix ROUND2

Status: DRAFT PENDING TEAM REVIEW. ROUND2 integration dated25 October2026; targeted consistency repair dated26 October2026. Every scenario below is **NOT RUN**. These are proposed validation plans, not successful application tests. No actual result, executor, environment or evidence of runtime execution is invented. Record those fields separately only after future execution.

The canonical fixture, version/error/availability protocol and candidate date assumptions are defined in Cross_Module_Interface_Contract_ROUND2.md. D-01 and D-04 refer to the open scope/date decisions in Integration_Conflict_and_Decision_Log_ROUND2.md. Original individual scenarios remain preserved; these27 cases add cross-module coverage. The weekly update adds IT25-IT27; all27 remain NOT RUN. NumericPolicy is a proposal under D-03/D-07 and absolute-date assertions are conditional under D-04, not approved business rules.


## IT01 Create project and task facts

**Preconditions:** Authorized actor; agreed creation policy; no existing project revision.

**Input:** Project name, optional plannedStartDate/projectDeadline, candidate task fields and same-project assigneeId.

**Operation:** Create project plus Leader membership, then createTask with expectedRevision=1.

**Expected design result:** Project revision starts at1; successful atomic task save advances it once. TaskSnapshot has projectId/taskId, canonical fields and proposed NOT_STARTED status; no BLOCKED field is persisted. Missing-duration task-save behavior follows agreed F2 policy, not F4 enablement.

**Modules:** SH-COORD; MG-M0/M1/M2/M3

**Requirement trace:** FR-01/03/06; NFR-04/05

**Execution status:** NOT RUN



## IT02 Accept valid dependency and refresh

**Preconditions:** Authorized editor; current coherent revision r; existing same-project tasks A and B; F3 enabled.

**Input:** A->B with expectedRevision=r.

**Operation:** Validate candidate, compare revision and atomically save the link.

**Expected design result:** F3 owns the saved edge; revision becomes r+1 once; SavedChange appears only after success. F5 refreshes from current statuses/links. Retained F4 recalculates or validly republishes; it never derives Blocked.

**Modules:** SH-COORD; DS-F3; DS-F4; MON-M3

**Requirement trace:** FR-07/09/12; NFR-05

**Execution status:** NOT RUN



## IT03 Reject cycle without replacing valid plan

**Preconditions:** Saved A->B and B->C at revision r with a valid schedule result.

**Input:** Proposed C->A, expectedRevision=r.

**Operation:** Examine the protected candidate graph before commit.

**Expected design result:** Reject A->B->C->A with an authorized explanation. Existing links, revision and valid prior schedule remain unchanged; no successful SavedChange or partial write.

**Modules:** SH-COORD; DS-F3.1/3.2/3.3

**Requirement trace:** FR-08/12; NFR-05

**Execution status:** NOT RUN



## IT04 Blocked is an independent warning

**Preconditions:** B unfinished; A unfinished; valid direct link A->B; both records in one authorized snapshot.

**Input:** TaskStatus NOT_STARTED or IN_PROGRESS for B.

**Operation:** MON-M3 derives the blocker view.

**Expected design result:** B isBlocked=true and names A plus A's raw status. B's stored status is unchanged. No transitive prerequisite is invented; COMPLETED dependents are absent from unfinished blocked work.

**Modules:** MG-M3; DS-F3 read port; MON-M3

**Requirement trace:** FR-04/09; DR-04

**Execution status:** NOT RUN



## IT05 Completing a prerequisite clears its reason

**Preconditions:** D unfinished and depends on B and C; B already completed; C unfinished; known valid dependencies.

**Input:** Authorized C status update to COMPLETED at expectedRevision=r.

**Operation:** Commit status, then refresh F5 from revision r+1.

**Expected design result:** C disappears from D's incomplete direct prerequisite list; D isBlocked=false when no incomplete direct prerequisites remain. Link records and entered durations remain unchanged.

**Modules:** SH-COORD; MG-M3; MON-M3

**Requirement trace:** FR-04/09/12; DR-04

**Execution status:** NOT RUN



## IT06 Status refresh does not shorten duration

**Preconditions:** Valid entered plan and coherent current source; actor allowed to update status despite a Blocked warning.

**Input:** NOT_STARTED->IN_PROGRESS; a separate early-completion attempt follows the still-open transition policy.

**Operation:** Save authorized status at expectedRevision=r and rebuild relevant views.

**Expected design result:** Revision advances on accepted save; progress, assignment and blocker views refresh. Durations, links and resource assignments are not inferred or changed. Unsupported early-completion permission is not assumed.

**Modules:** MG-M2/M3; MON-M0/M1/M2/M3/M4; DS-F4 reuse gate

**Requirement trace:** FR-04/09/13/14; DR-01/04/05

**Execution status:** NOT RUN



## IT07 Two of four tasks means fifty percent

**Preconditions:** Canonical P9 revision 12: A/B COMPLETED, C IN_PROGRESS, D NOT_STARTED; D blocked by C.

**Input:** Four unique task IDs with the stated saved statuses.

**Operation:** Calculate completion and raw-status counts, then attach the blocked overlay.

**Expected design result:** Completed2, IN_PROGRESS1, NOT_STARTED1, total4, percentage50. Blocked overlay count1 does not subtract a raw count or add a fifth denominator entry.

**Modules:** MON-M1/M2/M3

**Requirement trace:** FR-09/13/14; DR-04

**Execution status:** NOT RUN



## IT08 Empty project is not zero-percent completion

**Preconditions:** Authorized coherent snapshot has no tasks; F4 enabled.

**Input:** tasks=[]; no fabricated durations or finish dates.

**Operation:** Build progress and schedule views.

**Expected design result:** Progress NO_TASKS with completed=0, total=0 and percentage=null. Enabled empty F4 returns NO_TASKS before the dependency-input gate, with duration, critical IDs and finish null and no failure reasonCode. No division by zero or misleading 0%/delivery guarantee. Exact no-work wording remains candidate.

**Modules:** DS-F4; MON-M0/M1/M2; MON-M6/M7

**Requirement trace:** FR-10/11/13/14; OQ-08

**Execution status:** NOT RUN



## IT09 F4 off keeps basic dashboard usable

**Preconditions:** Authorized coherent nonempty task snapshot and a complete valid same-revision F3 view; F4 not retained/enabled; F6 may also be off.

**Input:** Schedule availability NOT_ENABLED with reasonCode=FEATURE_NOT_ENABLED; raw task statuses, taskDeadline values and valid asOfDate.

**Operation:** BuildDashboardSummary and basic overdue facts.

**Expected design result:** Successful dashboard returns progress, raw statuses, assignments, known blockers and basic overdue facts. F4 is NOT_ENABLED with FEATURE_NOT_ENABLED and null schedule payload, not DEPENDENCY_INPUT_UNAVAILABLE or a calculation failure. isCritical=null; unsupported critical/finish warnings are unevaluated with a neutral capability notice. If F6 is off its warning composition is also NOT_ENABLED with null payload. FR-13 basic overdue does not depend on FR-15 warning enablement.

**Modules:** MON-M0 to M5; DS-F4 availability boundary

**Requirement trace:** FR-09/13/14; FR-10/11/12/15 Could scope

**Execution status:** NOT RUN



## IT10 Unavailable or failed analysis is partial degradation

**Preconditions:** Authorized safe coherent snapshot contains at least one task; taskDeadline values and asOfDate are valid; complete valid F3 dependencies match the current snapshot. F4 is enabled but duration input is invalid or calculation fails. Basic F5 remains operable; evaluate the stated F6-enabled and F6-off configurations separately. Current saved task statuses are valid.

**Input:** ScheduleResultView UNAVAILABLE with reasonCode=INVALID_INPUT or CALCULATION_FAILED and null schedule payload; current tasks and valid date context; explicit F6 configuration.

**Operation:** Assemble the current dashboard and independently evaluate MON-M5 overdue facts; compose only enabled and evaluable F6 warning types.

**Expected design result:** Reliable progress, raw statuses, assignments and basic overdue tasks remain available. MON-M5 computes the basic FR-13 overdue list despite F4 failure. If F6 is enabled and current overdue facts are available, evaluate OVERDUE_TASK independently; BLOCKED_CRITICAL_TASK and PROJECT_DEADLINE_CONFLICT have evaluationByType=UNAVAILABLE because required current critical IDs/estimatedProjectFinish are unavailable. Unevaluated types are unknown, not no risk. If F6 is off, its warning result is NOT_ENABLED/FEATURE_NOT_ENABLED with null payload; the basic overdue list still works. No safe source/status/assignment/overdue data is discarded. When F4 schedule analysis is unavailable but the current F3 dependency view and task statuses remain valid, MON-M3 must continue to provide current Blocked facts and direct incomplete-prerequisite reasons. Only warnings requiring unavailable current critical-task or project-finish data remain unevaluated. MON-M3 publishes these facts with BlockedResult.sourceRevision equal to ProjectSnapshot.revision. This assertion depends on the stated valid current F3/status inputs; unavailable F3 inputs are handled by IT18, not assumed valid.

**Modules:** DS-F4; MON-M0 / MON-M1 / MON-M2 / MON-M3 / MON-M4 / MON-M5 / MON-M6 / MON-M7

**Requirement trace:** FR-10/11/13/15; NFR-05

**Execution status:** NOT RUN



## IT11 Reject stale schedule facts

**Preconditions:** Authorized safe coherent nonempty current snapshot is revision r+1; F4 is enabled, current schedule inputs are valid and the complete validated DependencyResultView.sourceRevision equals r+1. The supplied prior schedule has sourceRevision=r. Current saved task statuses are valid.

**Input:** Older criticalTaskIds and estimatedProjectFinish, plus current validated dependency/task/date context and any proof that relevant schedule inputs are unchanged.

**Operation:** Reauthorize and apply the current-revision gate; prove or coherently refresh dependency inputs before validating reuse or recalculating a current F4 result.

**Expected design result:** Do not show old criticality/finish as current. Publish a result at r+1 only after current dependency-view coherence and relevant schedule-input proof, or a fresh valid calculation; remap absolute dates and refresh context as needed. If the old schedule cannot be proved/refreshed current, return ScheduleResultView UNAVAILABLE with reasonCode=STALE_RESULT and null schedule payload; the basic dashboard still works. Unavailable required dependency input is the separate IT18 condition and maps to DEPENDENCY_INPUT_UNAVAILABLE, not this stale-schedule branch. If the current F3 dependency view and task statuses remain valid, Blocked facts and direct prerequisite reasons must remain available even when the prior schedule is stale or current F4 analysis is unavailable. Only schedule-dependent criticality and finish warnings remain unknown until a current valid schedule is available. Current Blocked facts use BlockedResult.sourceRevision equal to the verified current ProjectSnapshot.revision. If current dependency validity cannot be proved, the dependency/Blocked view is UNAVAILABLE with null blockedTaskIds/byTaskId payloads and an applicable reasonCode; never show stale Blocked details (IT18).

**Modules:** SH-COORD; DS-F3 read port; DS-F4.4; MON-M0/M6/M7; MON-M3

**Requirement trace:** FR-12/13/15; NFR-05

**Execution status:** NOT RUN



## IT12 Project-level deadline conflict uses valid finish

**Preconditions:** Candidate date mapping adopted for this paper scenario; F4 valid current result; projectDeadline=2026-10-29. The date assertions are conditional on explicit scenario adoption of the recommended D-04 PENDING calendar-day/Day0 policy: finish=plannedStartDate+ceil(T) using canonical unrounded NumericPolicy-resolved T, strict > comparisons and the agreed project calendar/date context; this is not customer approval.

**Input:** Base finish2026-10-28, then C6 valid save gives finish2026-10-30.

**Operation:** MON-M7 compares only F4 estimatedProjectFinish with projectDeadline.

**Expected design result:** Base no conflict; changed plan one-day project conflict. Do not compare this project warning against a taskDeadline or recalculate CPM in MON-M7. Equality is a separate candidate boundary case.

**Modules:** DS-F4; MON-M7

**Requirement trace:** FR-10/12/15; DR-02; date decision D-04

**Execution status:** NOT RUN



## IT13 Private project and task references do not leak

**Preconditions:** Nonmember or inaccessible project/task; a matched nonexistent reference is also tested.

**Input:** Dashboard query, direct task/dependency reference and private-note read.

**Operation:** Apply membership/project resolution before detailed error mapping.

**Expected design result:** No private payload/names/titles/membership/existence. Unknown and inaccessible projects share Invalid or inaccessible project.; tasks share Invalid or inaccessible task. Accessible members without edit rights receive the agreed permission result without mutation.

**Modules:** SH-COORD; MG-M2; all public facades

**Requirement trace:** FR-06; NFR-04

**Execution status:** NOT RUN



## IT14 Failed save preserves input and valid source

**Preconditions:** Authorized valid request from revision r; simulate source persistence failure only when application tests are later implemented.

**Input:** Task edit or dependency edit plus caller-entered values.

**Operation:** Attempt atomic save.

**Expected design result:** SAVE_FAILED; caller retains entered input; prior valid records/revision/plan remain; no success fact. A later derived-analysis failure after a successful source save is IT10, not a rollback of an already valid source commit.

**Modules:** SH-COORD; MG/DS writers

**Requirement trace:** NFR-05; FR-08/12

**Execution status:** NOT RUN



## IT15 Concurrent dependency writes cannot jointly create cycle

**Preconditions:** Two authorized editors read revision r; initial graph permits each reverse link individually.

**Input:** Editor1 A->B and editor2 B->A with the same expectedRevision=r.

**Operation:** Commit through protected revision-and-cycle validation.

**Expected design result:** At most one commits without rereading. Other request conflicts or revalidates against the new graph and is rejected as a cycle. No mixed candidate or increment on rejected request.

**Modules:** SH-COORD; DS-F3

**Requirement trace:** FR-08/12; NFR-05

**Execution status:** NOT RUN



## IT16 Deadline changes refresh the correct facts

**Preconditions:** Authorized current snapshot, stable graph/durations; explicit asOfDate. Date comparisons are conditional on explicit scenario adoption of the recommended D-04 PENDING policy: distinct task/project dates, strict > (equality false), and canonical-unrounded plannedStartDate+ceil(T) mapping when finish is evaluable. Missing required dates remain unevaluated; no business approval is inferred.

**Input:** Separate taskDeadline and projectDeadline edits with expectedRevision.

**Operation:** Commit each valid edit and refresh the appropriate comparisons.

**Expected design result:** Task date refreshes MON-M5 basic overdue and optional FR-15 overdue warnings; project date refreshes MON-M7. Neither deadline constrains CPM or changes durations. Republish reused schedule only after current-input proof.

**Modules:** MG-M1/M3; SH-COORD; MON-M5/M7

**Requirement trace:** FR-01/03/12/13/15; date decision D-04

**Execution status:** NOT RUN



## IT17 Formal priorities are preserved

**Preconditions:** All ROUND2 reports, requirement matrix and optional-feature plans available.

**Input:** FR-09..15 and F3/F4/F5/F6 traceability rows.

**Operation:** Static design review, not an application test.

**Expected design result:** FR-09 Should; FR-10/11/12 Could; FR-13/14 Must; FR-15 Could. Distinguish basic overdue facts from optional warning composition. FR-13 blocker dependency on Should F3 is recorded, not silently resolved by changing priorities.

**Modules:** All design owners

**Requirement trace:** URS pp.7-8/15-16/20; decision D-01

**Execution status:** NOT RUN



## IT18 F3 disabled is unknown blockers, not no blockers

**Preconditions:** Authorized current task source is safe and ProjectSnapshot is coherent with at least one task. F4 is enabled. F3 is not enabled, or its complete dependency relationship view is unavailable/untrusted for the current snapshot. This is unknown dependency input, not a verified complete empty edge set.

**Input:** Current authorized project/revision context; DependencyResultView NOT_ENABLED with FEATURE_NOT_ENABLED or UNAVAILABLE with applicable DEPENDENCY_INPUT_UNAVAILABLE, INVALID_INPUT or STALE_RESULT; edges=null.

**Operation:** Build basic F5 views and attempt enabled F4 analysis of the nonempty task snapshot; apply the required complete valid same-revision dependency gate.

**Expected design result:** Basic progress, raw statuses, assignments and MON-M5 overdue facts remain available. Blocked fields/reasons remain unknown with a capability notice: NOT_ENABLED when F3 is off, UNAVAILABLE when its view is unavailable; nullable blocker payloads are not false/empty. F4 must not treat missing edges as independent tasks: ScheduleResultView is UNAVAILABLE with reasonCode=DEPENDENCY_INPUT_UNAVAILABLE and null schedule payload. A complete valid current dependency view with edges=[] is separately known no prerequisites; edges=null is unknown. F4-off and enabled empty tasks use the distinct IT09 and IT08 gates.

**Modules:** SH-COORD; DS-F3/F4; MON-M0/M1/M2/M3/M4/M5

**Requirement trace:** FR-09/10/13; NFR-05; DR-04; release decision D-01 remains PENDING

**Execution status:** NOT RUN



## IT19 Member departure retains source work

**Preconditions:** Authorized non-sole-leader departure policy; member owns tasks and authored notes.

**Input:** manageMembership remove/leave at expectedRevision=r.

**Operation:** MG-M0 coordinates MG-M2 membership/access change and MG-M3 assignment clearing.

**Expected design result:** One commit/revision removes active access and sets affected assigneeId=null; tasks, links, statuses, durations and notes remain. Historical note author reference remains valid; no automatic reassignment or task cancellation. Sole-leader policy remains open.

**Modules:** SH-COORD; MG-M0/M2/M3/M4

**Requirement trace:** FR-02/06; NFR-04/05; DR-05

**Execution status:** NOT RUN



## IT20 Task deletion does not silently destroy references

**Preconditions:** Authorized deletion request for a task with dependencies/notes; reference cleanup policy not agreed.

**Input:** deleteTask taskId and expectedRevision.

**Operation:** Consult F3 and note-reference read ports before mutation.

**Expected design result:** REFERENCE_POLICY_UNRESOLVED and no deletion under current conservative proposal. Later agreed cleanup must atomically involve F3/notes and revalidate graph. Do not add CANCELLED status or silently exclude the task from the denominator.

**Modules:** MG-M0/M3/M4; DS-F3; SH-COORD

**Requirement trace:** FR-03/06/08/12; OQ-05

**Execution status:** NOT RUN



## IT21 Planned-start change remaps absolute finish

**Preconditions:** Current valid relative timings; graph/taskIDs/durations unchanged; candidate date mapping used. This remapping assertion is conditional on the recommended D-04 PENDING calendar-day/Day0 finish=plannedStartDate+ceil(T) policy using canonical unrounded NumericPolicy-resolved T and the project date context; not a recorded approval.

**Input:** plannedStartDate changes by2 calendar days at expectedRevision=r.

**Operation:** Validate source save and reuse relative timings only with a fresh absolute-date mapping.

**Expected design result:** Duration/critical set unchanged; estimatedProjectFinish shifts by2 days and new result sourceRevision matches current snapshot. Old absolute finish is not simply relabeled current; deadline comparison refreshes.

**Modules:** MG-M1; SH-COORD; DS-F4.4; MON-M7

**Requirement trace:** FR-01/12/15; DR-02; D-04

**Execution status:** NOT RUN



## IT22 Read-only current date refreshes basic overdue work

**Preconditions:** Same saved revision; F6 off; taskDeadline known and task unfinished. Equality/overdue assertions are conditional on the recommended D-04 PENDING project-LocalDate and strict > policy; no chat timezone or customer approval is assumed. No absolute-finish mapping is needed for this task-date-only comparison.

**Input:** asOfDate changes from equal to later than taskDeadline under the candidate boundary.

**Operation:** Rebuild basic dashboard overdue facts.

**Expected design result:** Equal date is not overdue under candidate rule; later date appears in FR-13 overdue list. No source revision increment, no CPM recomputation solely for clock progression, no dependency on F6 enablement. Missing taskDeadline is not evaluated rather than asserted on time.

**Modules:** MON-M0/M5

**Requirement trace:** FR-13; FR-15 scope; D-04

**Execution status:** NOT RUN



## IT23 Matching viewer membership and assignment IDs

**Preconditions:** Actor UserId U1 has current membership MemberId M1 in project P9.

**Input:** Task.assigneeId=M1 and actorId=U1.

**Operation:** Resolve authorized viewerMemberId before filtering assigned tasks.

**Expected design result:** Task appears for M1; do not compare a global user ID directly with project membership ID. Unassigned tasks remain in project completion totals and disappear only from this personal-assignment list.

**Modules:** MG-M2; MON-M0/M4

**Requirement trace:** FR-02/06/13; NFR-04

**Execution status:** NOT RUN



## IT24 Reliability trace and recovery remain honest

**Preconditions:** Approved future recovery simulation conditions still pending.

**Input:** NFR-01..05 mapping, save/reopen/recovery design scenarios and quality goals.

**Operation:** Static trace review; later implement approved failure/recovery scenarios separately.

**Expected design result:** NFR-05 maps to Reliability, retained input/source and recovery, not maintainability/testability/explainability. Browser/device, performance and usability acceptance conditions remain unmeasured/open. No executed-test or approved-SLA claim.

**Modules:** All owners; SH-COORD

**Requirement trace:** NFR-01/02/03/04/05; OQ-07

**Execution status:** NOT RUN


The existing IT08 and IT09 cases cover enabled empty-task and F4-off precedence. IT18 isolates enabled F4 with nonempty safe source and unknown dependency input; IT11 isolates a stale schedule while current dependency input is trustworthy. After note/role-only changes, unchanged edges may be republished at the current project revision only with coherent current-input proof; relevant task/edge changes require validation. No independent graph/schedule version or runtime transaction is claimed. All D-01 through D-10 decisions remain PENDING.

## IT25 End-to-End Valid Schedule and Blocked-Critical Warning

**Preconditions:** Synthetic project P25 at current committed revision7; all four task IDs and complete valid F3 edges belong to this authorized safely readable coherent project. F3/F4/F5/F6 are enabled; task statuses are valid; every duration is finite and strictly positive. Every dependency, schedule, progress, Blocked and warning view is proved current against ProjectSnapshot.revision=7. This relative-plan/Blocked-critical test does not depend on approving absolute-date mapping.

**Input:** Tasks A:durationDays=2,status=COMPLETED,no predecessor; B:3,COMPLETED,predecessor A; C:6,IN_PROGRESS,predecessor A; D:2,NOT_STARTED,predecessors B/C. Edges A->B,A->C,B->D,C->D. plannedStartDate=null, projectDeadline=null and taskDeadline=null for every task; explicit asOfDate=2026-10-26 is a synthetic LocalDate input, unused by the asserted relative/Blocked results, not an application-timezone decision.

**Operation:** SH-COORD obtains the authorized same-revision snapshot; F3 supplies complete validated edges; F4 performs the existing forward/backward calculation and certifies criticalTaskIds under NumericPolicy; F5 derives raw counts, completion and direct Blocked facts; enabled F6 composes evaluable warning types from those current facts without recomputing CPM.

**Expected design result:** Relative project duration T=10 days; A/C/D are critical, B totalFloat=3 days. Raw counts COMPLETED=2, IN_PROGRESS=1, NOT_STARTED=1 and completion=2/4*100=50%. Independent Blocked overlay contains D only; D remains counted once in NOT_STARTED and has only C as its direct incomplete prerequisite because B is completed. Current F4/F5/F6 results have sourceRevision=ProjectSnapshot.revision=7; F3 dependency view is also current. Enabled F6 evaluates BLOCKED_CRITICAL_TASK and emits that warning for D with reason C. Relative ScheduleResultView is VALID, but estimatedProjectFinish=null with finishReasonCode=MISSING_PLANNED_START; no absolute finish or project-deadline conflict is invented. Missing deadline comparisons are unevaluated, not known safe; independently unavailable date-warning types do not remove the valid Blocked-critical warning. No original task status/source record is modified.

**Modules:** SH-COORD; MG-M2/M3 read ports; DS-F3; DS-F4.1/4.2/4.3; MON-M0 / MON-M1 / MON-M2 / MON-M3 / MON-M4 / MON-M5 / MON-M6 / MON-M7; UI

**Requirement trace:** FR-09/10/11/13/14/15; DR-01/03/04. FR-09/F3 remains Should, FR-10/11/F4 and FR-15/F6 remain Could, FR-13/14/F5 remain Must; this enabled-fixture test does not resolve D-01 release scope.

**Execution status:** NOT RUN

## IT26 Duration Precision and Criticality

**Preconditions:** Authorized coherent nonempty versioned task snapshots with complete valid current dependency input; F4 enabled. The proposed centralized NumericPolicy under D-03/D-07 is explicitly selected as this paper oracle, not treated as approved implementation: preserve canonical finite-decimal input digits; use exact base10 decimal/equivalent rational calculations with no intermediate rounding. Binary backends must use certified centrally derived error intervals and exact/higher-precision recomputation for intervals containing zero or invariant conflicts, not a fixed arbitrary epsilon. Display rounding never determines criticality. Supported input limits, backend and display format remain pending.

**Input:** Each subcase below is a separate synthetic analysis fixture with its own current snapshot context. Task labels A/B/C/D are same-project IDs. Durations are canonical decimal tokens, not pre-rounded binary values. Case E invalid values are F4-boundary/adapter fixtures, not claims that malformed values are valid JSON numbers or that F2 saves them.

**Operation:** Apply the unchanged CPM formulas ES=max predecessor EF, EF=ES+duration, T=max terminal EF, LF=min successor LS (T for terminals), LS=LF-duration and totalFloat=LS-ES without intermediate rounding. Classify criticality from the NumericPolicy-certified mathematical float. For policy-valid saved duration edits, use the existing recalculateSchedule refresh at the new project sourceRevision; invalid analysis fixtures neither imply an accepted F2 save nor advance revision. Independently demonstrate the binary residual from the tie fixture and recompute from canonical input before classifying it.

**Expected design result:** Each A-D subcase produces the exact duration, critical set and raw totalFloat listed below at the current sourceRevision. In exact canonical arithmetic, a mathematical zero float is critical and every genuinely positive float is noncritical. Case C binary residuals near zero are resolved by the one central proof/recomputation policy and yield all four mathematically critical tasks; they are not classified by display rounding or an unexplained float==0 check. Case D C has genuine positive float0.000000000001 and remains noncritical even if an illustrative two-decimal formatter displays0.00 (that formatter is not an approved UI rule). Case E is whole-schedule UNAVAILABLE/INVALID_INPUT with null schedule facts and authorized durationDays diagnostics; no partial/zero-day/old critical set is published. If timing/criticality cannot be reliably certified for an otherwise valid input, the whole result is UNAVAILABLE/CALCULATION_FAILED with an authorized explanation, not a guessed critical set. Concrete epsilon values are not frozen; D-03/D-07 remain PENDING.

| Subcase | Canonical durationDays A/B/C/D | Complete edges | Exact calculation and expected criticality |
| --- | --- | --- | --- |
| A Integer control | 2 / 3 / 6 / 2 | A->B,A->C,B->D,C->D | Branches A+B+D=7 and A+C+D=10; T=10; critical A/C/D; raw float A=0,B=3,C=0,D=0. |
| B Decimal unequal branches | 0.1 / 0.2 / 0.3 / 0.1 | A->B,A->C,B->D,C->D | Branches0.4 and0.5; T=0.5; critical A/C/D; B float=0.1 and all other floats0. |
| C Decimal exact tie with binary noise | 0.1 / 0.2 / 0.3 / 0.1 | A->B,B->D,C->D; A and C are separate sources | A+B+D=0.4=C+D exactly; T=0.4; all A/B/C/D critical; every mathematical float0. A naive binary execution can leave approximately2.7756e-17 on A/B and5.5511e-17 on C; these are demonstration artifacts, not a fixed tolerance or positive planned slack. |
| D Genuine tiny positive slack | 0.1 / 0.2 / 0.299999999999 / 0.1 | A->B,B->D,C->D; A and C are separate sources | A+B+D=0.4; C+D=0.399999999999; T=0.4; critical A/B/D; C float=0.000000000001>0, independent of a rounded display. |
| E Invalid analysis values | Replace C duration with -1;0;null;omitted;"abc";NaN;Infinity;-Infinity (separate variants) | Same complete valid graph as A | Negative/zero -> NON_POSITIVE; null/omitted -> MISSING; text -> NON_NUMERIC; NaN/infinities -> NON_FINITE. Each variant is UNAVAILABLE/INVALID_INPUT, diagnostics identify authorized C/durationDays and the corresponding issue, all schedule facts null. These are not assertions that F2 persists the variants. |

**Modules:** SH-COORD; MG-M3 canonical source/adapter boundary; DS-F3 read port; DS-F4.1/4.2/4.3/4.4 and centralized NumericPolicy; downstream MON consumes only certified F4 criticalTaskIds

**Requirement trace:** FR-10/11/12; DR-01/03; D-03 and D-07 precision/backend approval. This is a proposed numerical verification oracle, not a new formal integer-only, scale or epsilon requirement.

**Execution status:** NOT RUN

## IT27 Invalid Duration Diagnostics and Safe Degradation

**Preconditions:** Authorized safe coherent nonempty synthetic task snapshot with valid current stored statuses and complete same-revision F3 dependencies; F4 and basic F5 enabled. Use the IT25 four-task statuses/graph, current revision7 and explicit asOfDate=2026-10-26. For independently evaluable overdue facts, C.taskDeadline=2026-10-22 and D.taskDeadline=2026-10-29 under the conditionally selected D-04 strict > policy; project/finish mapping need not be available. Evaluate F6-enabled and F6-off branches separately. A separate denied/nonmember request is evaluated before reading any private record or diagnostic. F2 missing-duration-save and supplied-estimate policies remain D-03 PENDING; invalid adapter fixtures do not establish that F2 accepts malformed records.

**Input:** At the F4 analysis boundary replace C.durationDays with each invalid variant from IT26-E: -1,0,null,omitted,"abc",NaN,Infinity,-Infinity, with task identity/status/graph still safely known. Include a variant with several invalid duration fields to require all detectable authorized task/field diagnostics. For the access branch use matched unknown and inaccessible project/task references; do not expose private diagnostic content.

**Operation:** Reauthorize and obtain one coherent project revision; apply F4 off/empty/dependency gates before checking the entire duration set. Collect DurationInputDiagnostic entries for authorized INVALID_INPUT only. Assemble safe basic F5 data and current MON-M3 Blocked facts independently of F4 timing failure. If F6 is enabled, compose only warning types with valid inputs. Review a separate core-save branch only under the subsequently agreed D-03 policy: a valid F2 save cannot be rejected or rolled back solely because optional F4 is unavailable.

**Expected design result:** The whole nonempty ScheduleResultView is UNAVAILABLE with reasonCode=INVALID_INPUT, sourceRevision matching the attempted current snapshot, and durationDays/timings/criticalTaskIds/estimatedProjectFinish=null. diagnostics contains each detectable authorized {taskId,field:"durationDays",issue:MISSING|NON_NUMERIC|NON_FINITE|NON_POSITIVE,message}; the issue matches the invalid value. Diagnostics are not partial schedule facts or a new top-level reasonCode. No valid task subset, zero-day substitute or old criticality is published. Basic raw counts remain2/1/1, completion50%, assignments and safely evaluable overdue facts remain; under the conditional dates C is4days overdue and D is not overdue. With valid F3/statuses, MON-M3 retains current D Blocked by direct incomplete C and does not remove D from NOT_STARTED. Enabled F6 may evaluate OVERDUE_TASK for C; BLOCKED_CRITICAL_TASK and PROJECT_DEADLINE_CONFLICT are unevaluated because current F4 critical/finish facts are unavailable, not known risk-free. F6 off returns NOT_ENABLED/FEATURE_NOT_ENABLED with null warning payload while basic F5 still works. Denied/unknown access returns the existing generic INVALID_OR_INACCESSIBLE_PROJECT/TASK PublicError before analysis, with no task IDs/names/existence/membership/private values or diagnostics. Analysis-only failure does not advance source revision, publish SavedChange, alter statuses/links, reject an otherwise policy-valid core save or roll back committed source. If F3 is itself unavailable, use IT18 instead of assuming valid blockers.

**Modules:** SH-COORD; MG-M0 / MG-M2 / MG-M3; DS-F3 read port; DS-F4 whole-input validation and authorized diagnostics; MON-M0 / MON-M1 / MON-M2 / MON-M3 / MON-M4 / MON-M5 / MON-M6 / MON-M7; public error mapper and UI

**Requirement trace:** FR-03/06/09/10/11/13/14/15; NFR-04/05; DR-04; D-03 core-save policy and D-04 conditional date comparisons. No new required-field, status or runtime reliability acceptance is approved.

**Execution status:** NOT RUN

## Execution record boundary

Static review of this matrix and independent paper arithmetic may be recorded in the evidence index. They do not change any scenario status to Passed. Before implementation, split combined privacy/duration/permission/failure branches into atomic cases, agree date/field/lifecycle/acceptance policies, and choose reproducible environments. Only then create runtime test cases with real actual results and evidence.
