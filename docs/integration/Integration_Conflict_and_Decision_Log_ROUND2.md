# Integration Conflict and Decision Log ROUND2

Status: **DRAFT PENDING TEAM REVIEW**. Snapshot: 2026-10-25T22:18:38+08:00. This records editorial repairs and unresolved design decisions, not customer approval, implemented behavior or executed test outcomes. Issue IDs R2-Cxx are review identifiers, not new URS requirement IDs. Decision IDs are D-01 through D-10; references such as D01/D04 mean D-01/D-04.

Current weekly design-review scope dated26 October2026: the active plan now contains27 NOT RUN scenarios (IT25-IT27 added), centralized candidate precision/diagnostic/date rules and recommendations under every retained D-01..D-10. All ten remain PENDING. Earlier24-case/83-page/19-check statements below are dated history, not current case counts or approval.

Current targeted review state dated26 October2026: see R2-T01 through R2-T07 appended below. The25October83-page/19-check conclusions and output hashes are preserved historical snapshots; their earlier scope missed the specific reason-range, traceability and scenario-condition gaps now recorded. They are not evidence that these later targeted repairs were already verified. Formal owner/team/customer review remains pending.

## Source keys and evidence interpretation

Physical source PDF page numbers are used below. New ROUND2 pagination may differ after reconstruction/reflow. The source PDFs and dated22October artifacts remain unchanged. Existing repository line references identify the pre-round bytes preserved in the ROUND2 backup, not the edited current line numbering.

| Key | Actual retained source |
| --- | --- |
| URS | `Student_Project_Planning_and_Progress_Tracking_System_URS_REVISED.pdf` |
| MG | `01_Project_Task_Module_Design(1).pdf` |
| DS | `02_Dependency_Schedule_Module_Design_REVIEWED.pdf` |
| MON | `03_Progress_Risk_Module_Design(1).pdf` |
| SYS | `00_Preliminary_System_Design_REVIEWED.pdf` |
| COURSE | `SE_Chapter6-Structured Software Design-2026.10.22.pdf` |
| RA | `Student_Project_Planning_and_Progress_Tracking_System_Requirements_Analysis_REVISED.pdf` |
| PROPOSAL | `Student_Project_Planning_and_Progress_Tracking_System_Proposal(1).pdf` |

Source identifiers above refer to the original coursework inputs retained in the project archive. Original requirements, lecture slides and received source reports are not republished in this branch. Current edited reports and diagrams are listed in the [public document index](../README.md); original source-page coordinates below remain provenance, not coordinates in the edited reports.

MG is the14-page source by Zhang Weiyi; DS is Wei Mingrui's11-page REVIEWED source; MON is the31-page25October source by Zhang Yuyang; SYS is the8-page prior overall draft. URS is the verified24-page revised artifact. Its existence and hash do not prove customer approval.

## Issue classifications

- **URS-backed correction** restores an existing formal meaning/priority without approving open details.
- **Proposed protocol repaired** means the four editorial drafts now use one technical convention; owner/team review is still pending.
- **Pending decision** preserves a real choice that the editor cannot approve.
- **Verified safeguard** records valid source content or a scope boundary that should not be rewritten into a new feature.

The repair state below concerns the ROUND2 editorial contract. Actual output rendering/static verification is recorded separately in the Change Log and Evidence Index and must not be interpreted as application-test PASS.

## R2-C01 One owner for Blocked derivation

**Source locations:** MG PDF pp.2-3 §2.4, p.11 §7.3, pp.12-14 §8/A.2; MON pp.7/14/26 §3/6.5/10.11; URS p.13 FR-09.

**Conflict or evidence:** MG repeatedly assigns Blocked or its reasons to F3/F5 together, and its F6 feed points to F4/F3 for both critical and blocked facts. F34 already places valid links in F3 and derived warnings in F5.

**Impact:** Duplicate business rules can disagree after status or link changes, and ownership becomes circular.

**Repair:** F3 validates/writes/supplies links only. F5 alone derives direct incomplete prerequisite warnings from F2 statuses and known F3 links. F6 consumes F5 blockers and F4 criticality; monitoring never writes dependency/status records.

**Basis:** User-required boundary; URS FR-09 input/behavior retained.

**State:** Repaired in ROUND2 editorial contract; final artifact verification remains a separate step.

**Approval boundary:** No URS priority change. Functional owners must review the proposed boundary.

## R2-C02 Formal priorities versus an easy overdue computation

**Source locations:** MON pp.5-6 §2.2/2.4; URS pp.7-8 master list, p.15 FR-13, p.16 FR-15, p.20 priorities.

**Conflict or evidence:** MON promotes FR-09 to Must and treats some/all FR-15 warnings as Must because overdue facts are useful/basic. The URS keeps FR-09 Should and FR-15 Could.

**Impact:** Implementation scope and acceptance can be expanded without approval.

**Repair:** Restore FR-09 Should; FR-10/11/12 Could; FR-13/14 Must; FR-15 Could. MON-M5 supplies FR-13 basic overdue facts independently; optional warning composition retains FR-15 Could.

**Basis:** URS-backed correction.

**State:** Repaired priority/traceability rows and protocol; acceptance is NOT RUN.

**Approval boundary:** No approval needed to correct transcription. Scope choices remain D-01.

## R2-C03 Must dashboard depends on Should dependency capability

**Source locations:** URS pp.7-8/15/20; SYS pp.1/3-5; Group9_Scaffold/docs/REQUIREMENTS.md original line62.

**Conflict or evidence:** FR-13 Must presents Blocked work but FR-09/F3 is Should. Previous designs assume valid F3 links and the legacy first-version navigation says F1-F6 are included.

**Impact:** Missing F3 could be hidden as no blockers, or the design could falsely claim full FR-13 acceptance after silently promoting F3.

**Repair:** Keep base status/progress/assignment/overdue views available. Missing F3 yields NOT_ENABLED/UNAVAILABLE and unknown blocker fields; a valid empty edge set is distinct. Record the unresolved release-scope/priority decision.

**Basis:** Requirements dependency, not an automatically solvable editorial error.

**State:** Technical fallback proposed; formal scope decision remains PENDING (D-01).

**Approval boundary:** Team/customer approval required for release-scope or priority changes.

## R2-C04 NFR-05 misidentified as a design-quality bundle

**Source locations:** MON p.6 §2.3 and p.30 Appendix A; URS p.18 §8.5.

**Conflict or evidence:** MON labels NFR-05 Maintainability/Testability/Explainability; its official name is Reliability.

**Impact:** Required save/input/data-preservation/recovery behavior can lose its traceability.

**Repair:** Use NFR-05 Reliability everywhere. Preserve useful maintainability/testability/explainability discussion only as unnumbered design-quality goals. Trace visible save errors, input retention, valid saved data/plan preservation and recovery after temporary unavailability.

**Basis:** URS-backed correction.

**State:** Repaired formal mapping; recovery acceptance conditions remain open (D-06).

**Approval boundary:** Correct numbering directly; customer/team must agree measurable recovery criteria.

## R2-C05 FR-04 and FR-05 reference drift

**Source locations:** MON pp.5-6 §2.2/2.5, p.14 §6.5, p.28 §11.4, p.30 Appendix A; URS pp.10-11.

**Conflict or evidence:** MON describes FR-04 as task records and FR-05 as status saving. FR-04 is Update Task Status; FR-05 is Task Comments and Progress Notes.

**Impact:** Ownership and verification rows point to the wrong source behavior.

**Repair:** Retain F2 source ownership but map saved status changes to FR-04 and notes to FR-05 across requirements, refresh description, validation and traceability.

**Basis:** URS-backed correction.

**State:** Repaired cross-references in ROUND2.

**Approval boundary:** No new requirement or approval implied.

## R2-C06 DR-04 is not the versioning requirement

**Source locations:** MON pp.5-6 §2.5, p.14 §6.5, p.30 Appendix A; URS p.19 §9.4.

**Conflict or evidence:** MON uses DR-04 for versioning/data integrity. The official domain rule is Blocked Work as a Warning Condition with authorized manual updates.

**Impact:** The warning-versus-lock rule and the proposed consistency protocol become conflated.

**Repair:** Map DR-04 to the warning/status behavior. Explain revision consistency as the proposed shared protocol supported by relevant FR refresh and NFR reliability requirements, without renaming a formal DR.

**Basis:** URS-backed correction.

**State:** Repaired traceability; protocol remains proposed.

**Approval boundary:** No approval needed for transcription repair; protocol is pending team review.

## R2-C07 Four exclusive display buckets hide raw status counts

**Source locations:** MON pp.11-16 §5-7, pp.19-21 §9, pp.23-25 §10, p.27 TC-01/03/04, p.29 §13 and p.31 glossary; URS pp.10/13/15.

**Conflict or evidence:** The source correctly has three stored TaskStatus values but applies four mutually exclusive display buckets (Completed/Blocked/In Progress/Not Started). A blocked NOT_STARTED task is removed from the raw Not Started count.

**Impact:** Raw statistics, UI, contracts and tests can disagree even if completion formula is otherwise correct.

**Repair:** Keep three raw stored-status counts partitioning tasks and add an independent Blocked overlay/count. Completion denominator contains each task once; Completed tasks are never unfinished blocked work. Do not accuse the source of storing four statuses—it is its display/count model that changes.

**Basis:** User-required integration rule and URS warning/status preservation.

**State:** Repaired active tables, pseudocode, wireframe and test expectations.

**Approval boundary:** Final status-transition vocabulary/exception policy still D-05; no stored BLOCKED introduced.

## R2-C08 Dashboard failure contradicts its own degraded behavior

**Source locations:** MON p.12 §5.4, p.14 §6.5, p.18 §8.6, pp.22/25 §10.9, p.27 TC-06; URS p.15 FR-13 and p.16 FR-15.

**Conflict or evidence:** The source promises basic progress/blocked/overdue rendering when schedule data is unavailable, but SCHEDULE_STALE or any required missing data can return a top-level dashboard error.

**Impact:** Optional F4 failure can disable Must Have progress unnecessarily.

**Repair:** Top-level failure is reserved for access/project resolution or unsafe/incoherent source reads. Safe source data returns a dashboard with explicit capability notices and only evaluable per-type warnings. Schedule-only stale/failure is a view reason, not a fatal dashboard error.

**Basis:** URS basic-versus-optional behavior plus proposed result envelope.

**State:** Repaired DashboardResult, orchestration, pseudocode and planned cases.

**Approval boundary:** No approval asserted; operational source-read mechanism deferred to D-07.

## R2-C09 Unavailable facts must not masquerade as false

**Source locations:** MON p.24 §10.6, p.25 §10.8 and p.31 glossary; DS p.6 §6; URS pp.13-16.

**Conflict or evidence:** MON assigns isCritical=false when schedule is unavailable and can return empty critical-warning lists without per-type evaluation status.

**Impact:** Consumers may treat missing criticality as noncritical or missing finish as no project conflict.

**Repair:** Use nullable isCritical/isBlocked where unknown; noncurrent schedule payloads are null and reasons explicit. ScheduleWarningResult has evaluationByType so a safely assembled partial list is not evidence that every risk type was evaluated.

**Basis:** Proposed data contract preserving URS no-unsupported-current-result behavior.

**State:** Repaired contract and degradation model.

**Approval boundary:** Team review of shape pending; no changed formal priority.

## R2-C10 One source revision protocol

**Source locations:** MG pp.7-11 §6/7; MON pp.12/23-26 §5.5/10; DS pp.5-7 §5-7; SYS p.5 §5.

**Conflict or evidence:** Sources use version, snapshotVersion, sourceSnapshotVersion, sourceVersion and revision, while write contracts omit expectedRevision or call values version-independent.

**Impact:** Lost updates, mixed snapshots and two individually valid edits jointly committing a cycle become possible design gaps.

**Repair:** SH-COORD obtains one coherent authorized ProjectSnapshot. Create at proposed revision1; existing-project writes take expectedRevision. Authorization, current-revision and invariant/cycle validation share the protected commit decision. Successful atomic writes advance once and publish SavedChange; failures/rejections do neither. Derived results use sourceRevision referencing that same counter.

**Basis:** Proposed protocol, not a new approved requirement or implementation claim.

**State:** Unified in reports and contracts; mechanism not implemented.

**Approval boundary:** Team review; locking/compare-save and storage choice are D-07.

## R2-C11 Availability and empty project mean different things

**Source locations:** DS p.6 calculate/recalculateSchedule and p.9 T11; MON pp.12/17-18/23-25 §5.5/8/10 and p.27 TC-02; SYS pp.4-5.

**Conflict or evidence:** NO_TASKS, EMPTY_PROJECT, AVAILABLE and VALID/UNAVAILABLE do not consistently distinguish empty input, feature disabled, invalid input, analysis failure and stale source.

**Impact:** Clients may fabricate0-day finish/0% progress or treat unknown arrays as known empty results.

**Repair:** Use VALID / NO_TASKS / NOT_ENABLED / UNAVAILABLE with reasonCode (INVALID_INPUT, CALCULATION_FAILED, STALE_RESULT and applicable dependency reason). Empty enabled schedule has null estimate/critical facts; empty progress has total0/completed0/percentage null. Optional feature off remains distinct.

**Basis:** Proposed technical state convention; customer-facing empty wording remains open.

**State:** Unified semantics and planned matrix; no runtime verification claimed.

**Approval boundary:** D-05 governs final empty presentation and status exceptions.

## R2-C12 Canonical project and task fields

**Source locations:** MG pp.7-11 §6/7; MON pp.23-26 §10; DS pp.6-7; SYS p.5; repository ARCHITECTURE original lines35-37.

**Conflict or evidence:** submissionDeadline, project.deadline and Task.deadline share ambiguous spellings; plannedStart/calculatedProjectFinish and several result names differ.

**Impact:** Task overdue and project submission conflict can compare the wrong date or read the wrong value.

**Repair:** Use projectId/taskId/memberId/userId/noteId, plannedStartDate, projectDeadline, taskDeadline, estimatedProjectFinish and asOfDate. Use ScheduleResultView, DashboardResult/DashboardSummary, TaskDisplayView and the unified envelopes consistently. Old aliases remain only in labeled evidence/migration mappings.

**Basis:** Proposed naming normalization; underlying URS meanings unchanged.

**State:** Repaired active field tables, contracts, examples and pseudocode.

**Approval boundary:** Team review of contract naming pending, no customer approval inferred.

## R2-C13 MemberId and UserId are not interchangeable

**Source locations:** MG pp.8/10-11 §6.3/7.2 actorId/targetUserId and project membership; MON pp.23-25 ViewerContext/getAssignedTasks/buildDashboardSummary.

**Conflict or evidence:** Monitoring calls viewerId a MemberId and directly compares it with assigneeId; cross-module actors use user identity and membership is project-specific.

**Impact:** A global user identifier may be compared against a membership identifier, or a role from another project may leak into access decisions.

**Repair:** actorId/viewerId are UserId. MG-M2 resolves current viewerMemberId inside the project before matching assigneeId:MemberId|null. Preserve project-specific roles and reauthorize reused reads.

**Basis:** Proposed explicit identity typing preserving NFR-04.

**State:** Unified typed meanings; authentication mechanism unimplemented.

**Approval boundary:** D-08 covers actual identity/invitation/succession design.

## R2-C14 Module IDs collide and the facade is absent from the figure

**Source locations:** MG pp.5-7 §4/5; MON pp.7-10 §3/4, pp.23-26 interfaces, p.31 glossary.

**Conflict or evidence:** Both areas use M0/M1 etc. MG table defines M0 as root control/facade, but its source figure does not clearly show the same explicit facade node.

**Impact:** The integration hierarchy and responsibility/interface references can identify different modules with the same label.

**Repair:** Use MG-M0/M1–4, DS-F3.1–3/DS-F4.1–4, MON-M0/M1–7 and SH-COORD responsibility. Show explicit MG-M0 facade and MON-M0 facade. Monitoring contains seven functional modules plus one facade, not seven including M0. Lines remain decomposition.

**Basis:** Chapter6 clarity and proposed identifier normalization.

**State:** Native editable ROUND2 hierarchies rebuilt/updated for review.

**Approval boundary:** No new service or deployment approval implied.

## R2-C15 MG-M2 cannot both avoid tasks and own task lookup

**Source locations:** MG p.5 §4.3 and p.8 §6.3; p.11 manageMembership explanation.

**Conflict or evidence:** The M2 coupling description says it does not read task details but promises to return affected task IDs on departure.

**Impact:** Task query ownership is hidden inside membership logic despite the stated information-hiding boundary.

**Repair:** MG-M2 owns membership/role changes; MG-M0 coordinates the MG-M3 task lookup/unassignment in the same source transaction. The composite departure result/SavedChange carries affectedTaskIds after that coordination, not because MG-M2 owns task data.

**Basis:** Proposed cohesion/coupling repair supporting URS FR-02.

**State:** Repaired responsibility/contract descriptions; implementation deferred.

**Approval boundary:** Owner review pending; no business behavior changed.

## R2-C16 Task deletion exists in scope but not public contracts

**Source locations:** MG p.5 §4.1, p.7 hierarchy, p.9 §6.4 versus pp.10-11 §7.2.

**Conflict or evidence:** Delete Task is a defined MG-M3 subfunction, yet the facade claims only seven public operations and its interface table omits deleteTask.

**Impact:** The source has no complete public permission/version/reference/error boundary for a supported lifecycle action.

**Repair:** Retain the existing seven operations and add an explicit eighth deleteTask contract already within F2 scope: expectedRevision, source ownership, permission/ref checks and no successful write when policy unresolved. Do not imply an approved cascade policy.

**Basis:** Completeness repair; lifecycle choice remains unresolved.

**State:** Contract added in ROUND2; deletion behavior remains guarded by D-03.

**Approval boundary:** Team/customer deletion policy confirmation still needed.

## R2-C17 Orphaned references are not an acceptable deletion default

**Source locations:** MG p.13 OD-06 versus pp.5/9/12 invariants; DS p.9 T16.

**Conflict or evidence:** OD-06 lists retaining orphaned references as an option while the design says links must never dangle.

**Impact:** Deleting a task may invalidate the graph or retained notes.

**Repair:** Keep the decision between rejecting a referenced deletion and later approved coordinated cleanup; no active dangling references. Under the current proposal unresolved policy returns REFERENCE_POLICY_UNRESOLVED without changing task, links or notes.

**Basis:** Integrity safeguard plus unresolved lifecycle decision.

**State:** Interim safety repaired; final policy PENDING (D-03).

**Approval boundary:** Team/customer confirmation required for cleanup semantics.

## R2-C18 Early completion test cannot approve its own open rule

**Source locations:** MG p.13 T04 versus p.14 OD-08; URS pp.10/13/24.

**Conflict or evidence:** T04 expects a task with unfinished prerequisites to become Completed, while the exact completion-before-prerequisite policy remains open.

**Impact:** A planned test asserts acceptance of an unapproved transition.

**Repair:** Retain authorized manual status updates without a hard blocker lock; make early-completion branch conditional on the agreed transition policy. Completed tasks are excluded from unfinished Blocked derivation after any accepted completion.

**Basis:** URS DR-04 manual update rule with an unresolved exception.

**State:** Test plan repaired; policy PENDING (D-05).

**Approval boundary:** Customer/team status exception confirmation required.

## R2-C19 Nine open decisions were called eight

**Source locations:** MG p.2 Executive Summary and pp.13-14 §9 OD-01–OD-09.

**Conflict or evidence:** The summary says eight decisions but the actual table contains nine IDs.

**Impact:** Readers can overlook a real unresolved item.

**Repair:** State nine retained source open decisions; preserve all rows and map them to the cross-module decision register rather than silently removing one.

**Basis:** Editorial count correction.

**State:** Repaired.

**Approval boundary:** No approval needed; the actual decisions remain open.

## R2-C20 Verified source identity is not approval

**Source locations:** MG p.2 and §2.3 agreed-URS phrasing; MON pp.2/6/28-31 missing-source claims; SYS pp.1/7-8; actual recovered URS and course/analysis files.

**Conflict or evidence:** Some source text calls the URS agreed; other text says the URS/course/analysis is unavailable, though the verified artifacts are present.

**Impact:** Review can either invent approval or keep obsolete missing-source blockers.

**Repair:** Register actual available filenames/versions/hashes and use URS as primary requirements evidence. Preserve unapproved assumptions/acceptance decisions. No formal DFD derivation is claimed for the object-oriented project.

**Basis:** Evidence correction with approval boundary.

**State:** Available-source references repaired; customer/team sign-off remains PENDING.

**Approval boundary:** Approval cannot be inferred from file existence or SHA equality.

## R2-C21 Duplicate task IDs cannot be silently reconciled

**Source locations:** MON pp.12-13 §5/invariants, p.23 calculateProgress and p.28 additional checks.

**Conflict or evidence:** The report alternately maps duplicate IDs/counts distinct IDs and returns a snapshot integrity error.

**Impact:** Arbitrary last-write-wins data can make counts and blockers disagree.

**Repair:** Require coherent unique-task-ID source snapshots. Reject unsafe conflicting source reads at the coordinator; no arbitrary deduplication of inconsistent task records. Once-only counting applies to valid unique tasks.

**Basis:** Proposed source-integrity contract.

**State:** Unified with safe-read failure boundary.

**Approval boundary:** Detailed integrity/recovery implementation pending D-07.

## R2-C22 Warning language contradicts permitted early work

**Source locations:** MON pp.15-16 §7.3 and p.20 Figure2; URS pp.10/13/19.

**Conflict or evidence:** The source says all prerequisites must be Completed before a task can start, despite separately allowing authorized manual updates.

**Impact:** A warning can be read as a forced execution lock.

**Repair:** Use planning/warning wording: a direct prerequisite remains unfinished; the entered plan assumes finish-to-start but authorized real-work status updates remain possible.

**Basis:** URS FR-04/09 and DR-01/04 correction.

**State:** Repaired reasoning text and native wireframe.

**Approval boundary:** Final early-completion transition remains D-05.

## R2-C23 The original wireframe arithmetic contradicts its rows

**Source locations:** MON p.20 Figure2, compared with pp.21 §9.4 and p.26 scenario data.

**Conflict or evidence:** Figure2 shows A Completed, B and C In Progress, D Blocked, yet claims2/4=50%. As-of25October, C is due22October but only B is listed overdue. The source scenario elsewhere sets A/B Completed.

**Impact:** The main visual teaches inconsistent status counts and overdue behavior.

**Repair:** Use one coherent illustrative four-task snapshot: A/B COMPLETED, C IN_PROGRESS, D NOT_STARTED with Blocked overlay; raw counts2/1/1, 50%, C3days overdue. The edited native figure identifies its C6 ten-day variant and candidate finish30October versus projectDeadline29October.

**Basis:** Static sample-arithmetic correction, not an executed test.

**State:** Native wireframe and its descriptive prose revised; final rendering/shape verification passed as recorded in the companion Change Log and Evidence Index. Post-reconstruction visual review also repaired obsolete dot/donut/stacked-bar descriptions to match the actual textual header and cards.

**Approval boundary:** Illustrative dates and layout remain proposals under D-04/D-05.

## R2-C24 Current date refresh belongs to basic F5 too

**Source locations:** DS p.7 refresh table; repository ARCHITECTURE original line51; URS p.15 FR-13 and p.16 FR-15.

**Conflict or evidence:** The refresh wording sends current-date changes only to F6 warnings although the Must dashboard independently shows overdue work.

**Impact:** Basic overdue facts can become stale when optional F6 is off.

**Repair:** asOfDate or taskDeadline refreshes MON-M5 basic overdue facts and optional warning composition; clock-only reads do not increment source revision or require CPM.

**Basis:** URS basic-versus-optional correction.

**State:** Refresh tables/contracts corrected.

**Approval boundary:** Date comparison convention still D-04.

## R2-C25 Schedule reuse must also refresh absolute dates

**Source locations:** DS p.7 and SYS p.5 reuse paragraphs; URS pp.6/13-14.

**Conflict or evidence:** Graph/duration equality is used for reuse proof while planned-start changes alter absolute finish independently.

**Impact:** An old absolute finish could be relabeled with a new sourceRevision.

**Repair:** Reuse relative timings only after proving task IDs/graph/durations unchanged; remap absolute finish when plannedStartDate changes, refresh labels/comparisons and publish a current result. If proof/refresh fails, return UNAVAILABLE/STALE_RESULT (code STALE_RESULT).

**Basis:** Proposed version/date consistency protocol.

**State:** Repaired without changing CPM formulas.

**Approval boundary:** Calendar mapping remains D-04; mechanism D-07.

## R2-C26 Member departure must retain tasks as unassigned

**Source locations:** URS p.9 FR-02; repository REQUIREMENTS original lines17/30/75/103, management README original lines5/9, backend README line7, tests README line23.

**Conflict or evidence:** Legacy navigation asks for reallocation checks on member removal without the URS-mandated retained/unassigned outcome. The MG personal source already correctly retains those tasks.

**Impact:** A future implementation may block departure until reassignment or delete task/relationship data.

**Repair:** Clear affected assigneeId to null and remove active membership access in one coordinated change; preserve tasks, dependencies, notes, durations and statuses. Keep historical note author identity resolvable and do not auto-reassign.

**Basis:** URS-backed clarification; MG correct design preserved.

**State:** Repository navigation synchronized; source behavior retained.

**Approval boundary:** Leader succession/invitation policy remains D-08; historical storage representation D-07/D-09.

## R2-C27 Duration analysis precondition is not a settled core-save policy

**Source locations:** DS p.4 and p.8 T10; MG pp.3/9-13; repository REQUIREMENTS original line31; URS p.10 FR-03 and p.24 OQ-05.

**Conflict or evidence:** F34 proposes positive integer durations and navigation rejects invalid task input, while URS mandatory fields/precision/save-validation policy remains open.

**Impact:** Optional F4 could unnecessarily block Must task creation or an integer restriction could become an invented requirement.

**Repair:** F4 requires finite positive durationDays for analysis. Missing/invalid analysis input yields UNAVAILABLE; F2 mandatory/precision/save policy is separately agreed. No approved integer-only rule is asserted.

**Basis:** URS open-detail preservation.

**State:** Wording corrected; final field policy PENDING (D-03).

**Approval boundary:** Team/customer confirmation required for actual field/validation policy.

## R2-C28 Personal high-priority wording does not define a new field

**Source locations:** URS p.15 FR-13, p.22 traceability; MON personal-assignment descriptions.

**Conflict or evidence:** The URS requests current-user high-priority assignments but explicitly establishes no ranking rule or new priority attribute.

**Impact:** An editorial sort or priority field could become unsupported scope.

**Repair:** Use authoritative member assignment for the personal view; describe any display ordering only as a proposed UI choice. Keep the meaning of high-priority assignments unresolved.

**Basis:** URS scope boundary.

**State:** No new priority field introduced; PENDING D-10.

**Approval boundary:** Customer clarification required for ranking/priority semantics.

## R2-C29 Task date and project date comparisons stay separate

**Source locations:** MON pp.17/25/27-28; SYS p.6; URS pp.15-16/24.

**Conflict or evidence:** Strict comparisons are reasonable source candidates, but timezone, inclusive end-of-day and Day0-to-date mapping are not approved. Task and project dates also have conflicting names.

**Impact:** Equal dates, absent dates and timezone rollover can create false overdue/project-conflict conclusions.

**Repair:** Candidate task rule: unfinished and known taskDeadline and asOfDate>taskDeadline. Candidate project rule: valid current estimatedProjectFinish>projectDeadline. Missing dates are not evaluated rather than declared safe; equality behavior remains a documented candidate.

**Basis:** Candidate rule retained, not promoted to formal approval.

**State:** Unified naming and assumptions; PENDING D-04.

**Approval boundary:** Team/customer date convention confirmation required.

## R2-C30 Received materials replace current Pending Input claims

**Source locations:** SYS pp.1/3/7; root README/index and22October weekly snapshot; actual received sources on25October.

**Conflict or evidence:** The previous current reports/navigation say teammate designs are missing and their folders empty. Two actual source PDFs have now been received.

**Impact:** The current contribution/material status is obsolete even if its22October historical claim was accurate.

**Repair:** Current ROUND2 material status becomes received and editorially integrated for review. Preserve dated historical reports unchanged. Do not infer owner acceptance, review meetings or customer approval.

**Basis:** Receipt evidence update.

**State:** Active repository status synchronized; final root navigation/weekly update by integration maintainer.

**Approval boundary:** Team/customer approval remains PENDING.

## R2-C31 Legacy evaluation numbers are not formal NFR acceptance

**Source locations:** URS pp.17-18/24; repository REQUIREMENTS original AC-17, tests README line30, ROADMAP line33.

**Conflict or evidence:** Historical proposal targets five participants/four successes and Week1 thresholds can look like a current approved acceptance baseline.

**Impact:** A sample target can be cited as a formal NFR condition or even measured result.

**Repair:** Label the numbers as historical proposed evaluation goals. Preserve formal NFR names and pending timing/devices/load/participants/pass criteria. Integration scenarios remain NOT RUN.

**Basis:** Evidence/approval boundary.

**State:** Navigation clarified; measurable acceptance PENDING D-06.

**Approval boundary:** Team/customer must agree actual acceptance conditions.

## R2-C32 Task cancellation is not a hidden fourth state

**Source locations:** URS pp.10-11/24; MG lifecycle/open-decision rows; DS p.9 T16.

**Conflict or evidence:** The requested lifecycle review includes cancellation, but the baseline defines no CANCELLED status or approved cancellation operation.

**Impact:** A new status or silent task exclusion would alter source scope, graph and completion denominator.

**Repair:** Record cancellation as unapproved scope. Do not invent a stored state or exclude tasks from counts/schedule. Treat member departure, task deletion and any future cancellation as distinct decisions.

**Basis:** Verified scope guard, not a new implemented operation.

**State:** No unsupported cancellation feature added; PENDING D-03 if requested.

**Approval boundary:** Team/customer scope decision required for any future cancellation.

## R2-C33 Private errors must not return saved source payloads

**Source locations:** MG pp.4/8/10-13 error rules; DS pp.3/5; MON p.25 top-level errors; URS p.18 NFR-04/05.

**Conflict or evidence:** MG has NOT_MEMBER/TARGET_NOT_FOUND outcomes and prior-valid-value return wording, while the unified boundary must not reveal existence or private records on denied/inaccessible requests.

**Impact:** A failure envelope can disclose private names, membership or stored values despite not committing a write.

**Repair:** Map inaccessible project/task references to generic public messages. Detailed permission/input/cycle errors require an established accessible context. Preserve entered input at the caller and saved data internally; no private successful saved payload accompanies failure.

**Basis:** NFR-04 privacy plus NFR-05 reliability clarification.

**State:** Unified error mapping and failed result shapes.

**Approval boundary:** Authentication/invitation mechanism remains D-08.

## R2-C34 Formal unranked additions remain unranked

**Source locations:** URS p.7 master list; current root requirement matrix and subsystem traceability.

**Conflict or evidence:** FR-05 comments/notes and FR-06 role control are individual customer additions without separate MoSCoW votes, even though F1/F2 groups are Must.

**Impact:** A group rating may be incorrectly copied into an individually unranked requirement.

**Repair:** Retain FR-05/06 as Unranked where individual priority is listed. The F1/F2 group priority and implemented scope remain distinct.

**Basis:** Verified source safeguard.

**State:** Traceability check; no new priority invented.

**Approval boundary:** Any formal reprioritization requires team/customer decision.

## Decision register

All decisions below remain **PENDING**. A proposed interim safeguard does not close the customer/team decision. No meeting, signature, vote, acceptance date or approval is fabricated.

### D-01 Formal scope and dependency priorities

Decision needed: FR-13 Must blocker subview depends on FR-09/F3 Should; decide retained F3 and F4/F6 release scope or an explicitly approved priority adjustment.

Current proposed treatment: Base source/status/completion/overdue/assignment continues with explicit unknown blocker/schedule states; fallback is not full FR-13 acceptance.

Decision owner: Team + customer; no recorded approval. State: **PENDING**.

Trace: URS pp.7-8/15-16/20; R2-C02/03; IT17/IT18

**Current Problem:** FR-13 Must blocker subview depends on FR-09/F3 Should; decide retained F3 and F4/F6 release scope or an explicitly approved priority adjustment.

**Recommended Option:** Retain usable basic Must Dashboard and, where feasible, retain Should F3 for the Blocked subview. If F3 is absent/unavailable, disclose the subview limitation and seek a release-scope decision; do not alter formal Must/Should/Could priorities.

**Rationale:** This respects the actual URS dependency instead of treating a fallback as full FR-13 acceptance.

**Affected Modules and Requirements:** MON-M0/M3, DS-F3/F4, F6; FR-09/10/11/12/13/14/15.

**Consequences:** Base work remains usable; a missing Blocked capability stays visible as unknown and still needs explicit release acceptance.

**Owner:** Team + customer; no recorded approval.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-02 Operation permissions and leader agreement

Decision needed: Finalize dependency-edit, task/assignment/deadline/note rights and whether leader agreement means a separate workflow or a leader performing the edit.

Current proposed treatment: MG-M2 returns policy outcomes; no approval workflow, voting or notification is invented.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS FR-06/OQ-06; MG OD-04/05/09

**Current Problem:** Finalize dependency-edit, task/assignment/deadline/note rights and whether leader agreement means a separate workflow or a leader performing the edit.

**Recommended Option:** Use one explicit project-role permission table through MG-M2/SH-COORD for task, dependency, membership and note actions; distinguish view and edit rights. Add no approval workflow unless formally required.

**Rationale:** A single authorization entry prevents rival module policies and does not invent a new business process.

**Affected Modules and Requirements:** MG-M0/M2/M3/M4, DS-F3 writers and monitoring read ports; FR-02/04/05/06/07/08; NFR-04.

**Consequences:** Detailed per-role permissions remain reviewable; denied access uses existing safe public errors.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-03 Required fields and task lifecycle

Decision needed: Set project/task required fields, positive-duration/precision/save policy, task-reference deletion behavior and any future cancellation scope.

Current proposed treatment: Do not invent approved integer/mandatory rules; F4 invalid input unavailable. Referenced deletion is rejected under current proposed safeguard until an approved atomic cleanup policy exists; no dangling links/CANCELLED state.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS FR-03/OQ-05; MG OD-03/04/06; R2-C16/17/27/32

**Current Problem:** Set project/task required fields, positive-duration/precision/save policy, task-reference deletion behavior and any future cancellation scope.

**Recommended Option:** Recommend permitting unestimated core tasks with durationDays=null only after explicit policy agreement; supplied estimates and F4 analysis use finite positive values with preserved canonical decimal precision. Do not impose an integer-only rule. Until a referenced-deletion policy is approved, reject deletion with unresolved dependency/note references; add no CANCELLED status.

**Rationale:** Task organization must not silently depend on optional schedule analysis, while analysis and referential integrity require trustworthy inputs.

**Affected Modules and Requirements:** MG-M1/M3/M4; DS-F3/F4; FR-01/03/08/10/11/12; NFR-05; IT26/27.

**Consequences:** Core-save mandatory fields and supported scale/range still need approval. Invalid F4 input returns whole UNAVAILABLE/INVALID_INPUT and authorized field diagnostics, without partial schedule facts or automatic source rollback.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-04 Date boundary and calendar mapping

Decision needed: Confirm LocalDate project timezone, whether deadline includes full day, Day0 elapsed mapping and exact task/project comparisons.

Current proposed treatment: Candidate strict > conditions, explicit asOfDate, separate taskDeadline/projectDeadline; absent dates are unevaluated. Chat timezone does not approve application timezone.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS FR-15/DR-02/OQ-08; MON Q2; IT12/IT16/IT21/IT22

**Current Problem:** Confirm LocalDate project timezone, whether deadline includes full day, Day0 elapsed mapping and exact task/project comparisons.

**Recommended Option:** Recommend elapsed calendar days including weekends/holidays; Day0 is plannedStartDate. Conditional LocalDate finish is plannedStartDate+ceil(T), using canonical unrounded NumericPolicy-resolved T. Use strict asOfDate>taskDeadline for unfinished overdue work and estimatedProjectFinish>projectDeadline for project conflict; equality triggers neither. Interpret dates in the agreed project calendar/timezone, never infer it from chat. Missing required dates/mapping remain unevaluated.

**Rationale:** This offers one conservative date-only convention without rounding computed criticality, conflating date fields or pretending the mapping was customer-ratified.

**Affected Modules and Requirements:** MG date fields; DS-F4; MON-M5/M7; FR-01/03/10/12/13/15; DR-02; conditional IT12/16/21/22.

**Consequences:** Relative CPM may remain VALID while absolute finish is null. An unresolved binary integer-boundary artifact must be resolved before ceil; missing start uses MISSING_PLANNED_START and unresolved mapping DATE_MAPPING_UNRESOLVED. Date tests stay conditional pending approval.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-05 Status exceptions and empty presentation

Decision needed: Confirm final transition vocabulary/early completion with unfinished prerequisites, rounding and empty-project display wording.

Current proposed treatment: Three canonical TaskStatus codes are the current design mapping; Blocked never locks authorized updates. Empty percentage=null and NO_TASKS; early-completion planned test conditional on agreed rule.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS FR-04/09/14/OQ-08; MG OD-08; MON Q4/Q6

**Current Problem:** Confirm final transition vocabulary/early completion with unfinished prerequisites, rounding and empty-project display wording.

**Recommended Option:** Keep three saved TaskStatus values, a separate Blocked overlay and empty-project percentage=null. Permit authorized manual status updates despite Blocked. Agree early-completion exceptions, display rounding and no-work wording separately.

**Rationale:** These choices preserve count-based completion and the URS warning-versus-lock distinction without adding a fourth status.

**Affected Modules and Requirements:** MG-M3; MON-M1/M2/M3; DS-F4 empty state; FR-04/09/13/14; DR-04.

**Consequences:** Each task remains in one raw count; rounding affects display only. Early-completion behavior and final empty wording remain unapproved.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-06 Capacity performance usability and recovery acceptance

Decision needed: Agree maximum/representative loads, timing boundaries, devices/network/concurrency/repetitions, recovery criteria and usability participant/pass targets.

Current proposed treatment: NFR-03 1-2seconds and typical15-40 tasks are expectations, not measured guarantee/capacity limit; no availability percentage is invented.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS NFR-01/03/05 and OQ-02/OQ-07; MON Q9

**Current Problem:** Agree maximum/representative loads, timing boundaries, devices/network/concurrency/repetitions, recovery criteria and usability participant/pass targets.

**Recommended Option:** Use the URS 1-2-second refresh expectation and typical15-40-task scale as initial future measurement references. Agree timing start/end, environment, device/network, load/concurrency, repetitions, usability tasks and failure/recovery scenarios before execution.

**Rationale:** A measurable test protocol is needed before performance or recovery claims; the existing figures are neither observed results nor a formal SLA/capacity limit.

**Affected Modules and Requirements:** All owners and UI/facades; NFR-01/02/03/05; OQ-02/OQ-07.

**Consequences:** No measured latency, availability percentage, recovery deadline or pass rate is asserted; eventual acceptance may require revised targets.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-07 Technology and detailed consistency mechanism

Decision needed: Choose language/framework/storage/deployment, atomic lock/compare-save mechanism, coherent-read strategy and integrity diagnostics.

Current proposed treatment: One revision/sourceRevision protocol is proposed now; no broker/microservice/distributed transaction is added or claimed implemented.

Decision owner: All owners; technical design review. State: **PENDING**.

Trace: Shared protocol; R2-C10/21/25

**Current Problem:** Choose language/framework/storage/deployment, atomic lock/compare-save mechanism, coherent-read strategy and integrity diagnostics.

**Recommended Option:** Use an ordinary modular monolith with one source revision, atomic source writes and coherent reads. Prefer centralized exact canonical base10/equivalent rational NumericPolicy; a binary backend needs centrally certified error intervals and exact/higher-precision resolution near zero or invariant conflicts. Select language, storage, limits and the concrete compare/save/read mechanism in detailed design.

**Rationale:** This is the smallest architecture matching current ownership and avoids arbitrary epsilon or multiple counters without claiming a deployed lock/transaction.

**Affected Modules and Requirements:** SH-COORD; MG facades/policy; DS-F3/F4; MON-M0; FR-08/10/11/12; NFR-04/05; IT26.

**Consequences:** The concrete runtime, input scale/range, derived tolerance bounds and storage mechanism require validation. Uncertifiable timing gives UNAVAILABLE/CALCULATION_FAILED; no guessed partial critical set.

**Owner:** All owners; technical design review.

**Approval Needed:** All functional owners must review the technical design; involve the customer if the proposal changes business scope or acceptance. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-08 Authentication invitation and leader succession

Decision needed: Determine authentication and invitation delivery/acceptance/authorized inviters and sole-leader departure or role succession.

Current proposed treatment: Project membership gates reads; viewing differs from editing. No automatic successor or invitation channel is invented; active departure retains source tasks.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS FR-02/06/NFR-04/OQ-06; MG OD-01/02

**Current Problem:** Determine authentication and invitation delivery/acceptance/authorized inviters and sole-leader departure or role succession.

**Recommended Option:** Require authorized project membership, explicitly authorized invitations and an explicit acceptance step. Recommend completing a deliberate Leader handoff before the sole Leader leaves; do not guess an automatic successor.

**Rationale:** Privacy and project continuity need a visible policy rather than accidental privilege inheritance.

**Affected Modules and Requirements:** MG-M1/M2 and SH-COORD; FR-02/06; NFR-04.

**Consequences:** Invitation delivery/authentication and the exact handoff/blocked-departure rule remain pending; retained tasks and historical authors are not deleted.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-09 Progress note retention and editing

Decision needed: Agree note length, ownership, edits/deletion and whether multiple notes/history are retained; preserve resolvable historical author identity after departure.

Current proposed treatment: One short-note source contract remains; no retained-history/audit requirement is invented.

Decision owner: Team + customer. State: **PENDING**.

Trace: URS FR-05; MG OD-07

**Current Problem:** Agree note length, ownership, edits/deletion and whether multiple notes/history are retained; preserve resolvable historical author identity after departure.

**Recommended Option:** Keep the minimum short-note function with stable original-author references. Do not add complex editing/deletion/audit-history features without scope agreement; member departure must leave retained references resolvable.

**Rationale:** This preserves the requested context feature and source integrity while avoiding unrequested collaboration-history scope.

**Affected Modules and Requirements:** MG-M4 and membership lifecycle; FR-05; NFR-04/05.

**Consequences:** Note length, retention and edit/delete rights remain open; minimal preservation is not a claim that a full audit log exists.

**Owner:** Team + customer.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

### D-10 Meaning of high-priority personal assignments

Decision needed: Clarify FR-13 wording without inventing a priority field, score or ranking rule.

Current proposed treatment: Show authoritative assignments; proposed UI ordering is explicitly a design option only.

Decision owner: Customer with F1/F2 and F5 owners. State: **PENDING**.

Trace: URS p.15 FR-13 and p.22 traceability; R2-C28

**Current Problem:** Clarify FR-13 wording without inventing a priority field, score or ranking rule.

**Recommended Option:** Show real personal assignments using the resolved project MemberId; do not add a priority field, score or automatic ranking model before defining high-priority. Label any presentation ordering as a UI proposal.

**Rationale:** The URS requests important personal assignments but supplies no approved ranking meaning or new task data field.

**Affected Modules and Requirements:** MG assignment data; MON-M4 and UI; FR-13; NFR-01.

**Consequences:** The customer still defines high-priority semantics; a truthful task list does not claim that an unapproved ranking requirement is complete.

**Owner:** Customer with F1/F2 and F5 owners.

**Approval Needed:** The retained decision owner/team and customer must confirm the business policy or acceptance boundary; functional-owner review is still pending. No approval is recorded.

**Status:** PENDING. Recommendation only; the original question, owner and pending state above are retained.

## Valid design retained

The correct F3 cycle approach,8-day and10-day forward/backward tables, multiple-start/finish and tied-critical-path handling remain. MG's project-specific roles, thin facade, retained unassigned tasks on member departure, notes separated from completion and nine real open decisions remain. MON's read-only intent, direct incomplete-prerequisite reasoning,2/4=50% formula, empty null percentage, three supported warning types, explicit asOfDate and ten NOT RUN scenarios remain, with contradictory uses repaired rather than silently discarded. Chapter6 modularity and information hiding are applied to the existing object-oriented analysis; no nonexistent DFD transformation, new distributed architecture or automatic resource optimization is introduced.

## Completion boundary

The three source designs are received and their ROUND2 editorial integration is complete for pending owner/team review. No formal owner-review meeting or customer approval is recorded. Final rendering/static evidence belongs to the companion change/evidence index. All integration scenarios remain **NOT RUN**; detailed design, owner/customer decisions, implementation and actual software verification remain outstanding. No commit, push or publication is authorized for this round.

Final document-evidence update: 2026-10-25T23:37:02+08:00. The four reports contain 83 visually reviewed pages (MG21, DS14, MON32, SYS16). Independent static review found no material active contract inconsistency across the frozen four DOCXs and three contract/trace/test attachments (19 checks). These are document checks; all24 integration scenarios remain NOT RUN and every D-01 through D-10 decision remains PENDING. See the companion Change Log for evidence and current hashes.

## Targeted consistency repair dated26 October2026

Status: **DRAFT PENDING TEAM REVIEW**. These follow-up identifiers document technical/editorial repairs. They add no formal URS IDs and close no business decisions. Before coordinates refer to retained pre-repair source snapshots. DOCX paragraph/table/row numbers are one-based; PDF page references use those pre-repair outputs.

### R2-T01 Scoped availability reasons and precedence

**Before evidence:** ContractL56 omitted DEPENDENCY_INPUT_UNAVAILABLE although L60/L109 used it; L32/L60 did not define per-result reason ranges. MG AppendixB5 P158 (beforePDFp20) omitted explicit dependency-input reason. MON §10.2 P208 (beforePDFp23) omitted the dependency-input reason while §5.5 T19R7 (beforePDFp12) included it. ARCHITECTURE.md L58 omitted the code while L60 used it.

**Impact:** Consumers could reject or misinterpret a reason already published by F4 and confuse disabled/empty/unavailable states.

**Repair:** Use the four unchanged ScheduleAvailability states; scope schedule/dependency/blocked/overdue/warning reasons separately. F4-off, enabled-empty and enabled-nonempty/untrusted-dependency gates are ordered. F3 enabled empty tasks use NO_TASKS/[]; enabled nonempty known empty edges use VALID/[]; unknown edges remain null.

**Basis:** Explicit26October targeted repair; technical contract clarification, no URS priority change.

**Status:** Scoped editorial repair applied to the canonical contract and affected matrices; synchronized report and final verification evidence is recorded separately in this round's work directory and dated Change Log follow-up.

**Approval needed:** All existing D-01 through D-10 remain PENDING; no new owner/customer approval is inferred.

### R2-T02 FR-13 base Dashboard and dependent Blocked mapping

**Before evidence:** RTM L23 mapped FR-13 to MON-M0..M5, merging base and dependent responsibility. MON §2.5 T6R3 named only MON-M0; AppendixA T40R3 (beforePDFp31) omitted MON-M5. SYSTEM T11R6 distinguished capability but did not name the exact base/module split.

**Impact:** Basic Must Dashboard responsibility could omit overdue facts or imply the dependent blocker capability is always available.

**Repair:** FR-13 basic Dashboard -> MON-M0/M1/M2/M4/M5 + UI. Blocked subview -> MON-M3 with Should FR-09/F3 dependency; D-01 remains PENDING.

**Basis:** URS24-page verifiedPDFp15 FR-13 and explicit26October mapping instruction.

**Status:** Scoped editorial repair applied to the canonical contract and affected matrices; synchronized report and final verification evidence is recorded separately in this round's work directory and dated Change Log follow-up.

**Approval needed:** D-01 release dependency remains PENDING; FR-09/F3 stays Should and FR-13 stays Must. No formal priority adjustment is approved.

### R2-T03 IT18 enabled nonempty unavailable-dependency preconditions

**Before evidence:** MatrixL316-326: safe source/F3-off-or-unavailable lacked explicit nonempty task universe, coherent ProjectSnapshot and F4 enabled; expected code lacked the complete schedule availability envelope. SYSTEM T14R3 (beforePDFp15) repeated the underqualified outcome.

**Impact:** The same underqualified scenario could legitimately return NOT_ENABLED or NO_TASKS instead of its intended dependency-input reason.

**Repair:** Require authorized safe coherent nonempty tasks, enabled F4 and absent/untrusted complete F3 input. Base facts remain; Blocked unknown; F4 UNAVAILABLE/DEPENDENCY_INPUT_UNAVAILABLE with null schedule payload. IT08/09 cover empty/off gates.

**Basis:** Explicit26October targeted repair; no duplicate cases or executed test.

**Status:** Scoped editorial repair applied to the canonical contract and affected matrices; synchronized report and final verification evidence is recorded separately in this round's work directory and dated Change Log follow-up.

**Approval needed:** D-01 release dependency remains PENDING; FR-09/F3 stays Should and FR-13 stays Must. No formal priority adjustment is approved.

### R2-T04 IT10 independent overdue facts and enabled F6 evaluation

**Before evidence:** MatrixL172-182 did not state valid date/asOfDate/current nonempty context; MON-M5 absent from modules; overdue-warning independence was not explicit. SYSTEM T13R3 (beforePDFp14) summarized the same incomplete expected result.

**Impact:** A schedule failure could incorrectly hide independently computable overdue facts or treat unevaluated critical/finish warnings as no risk.

**Repair:** Keep reliable base progress/status/assignments and MON-M5 overdue facts. With F6 enabled, OVERDUE_TASK remains independently evaluable; critical and project-finish types are unevaluated during F4 unavailability. F6-off remains NOT_ENABLED, FR-15 Could.

**Basis:** URS p15FR-13/p16FR-15 and explicit26October targeted repair.

**Status:** Scoped editorial repair applied to the canonical contract and affected matrices; synchronized report and final verification evidence is recorded separately in this round's work directory and dated Change Log follow-up.

**Approval needed:** All existing D-01 through D-10 remain PENDING; no new owner/customer approval is inferred.

### R2-T05 Current dependency-view proof and isolated IT11 stale schedule

**Before evidence:** ContractL39-47 and MG P154-155, DS P86/T11R6-7, MON P110/P201 and SYSTEM P44/T9R6-7 described schedule reuse but did not explicitly bind republished complete dependency views after note/role-only revisions. MatrixL190-200 did not isolate enabled F4/nonempty safe source/current trustworthy dependency view before asserting STALE_RESULT.

**Impact:** Unrelated source edits could discard valid edges unnecessarily or let an old unproved graph appear current; stale-schedule and missing-dependency causes could be conflated.

**Repair:** SH-COORD proves same project/current revision and complete valid task/edge context, or coherently rereads, before publishing current DependencyResultView. Relevant graph/task changes require validation. IT11 stale schedule is distinct from IT18 unavailable required dependency input. No second counter or implemented lock is claimed.

**Basis:** Explicit26October targeted repair; existing one-counter design retained.

**Status:** Scoped editorial repair applied to the canonical contract and affected matrices; synchronized report and final verification evidence is recorded separately in this round's work directory and dated Change Log follow-up.

**Approval needed:** All existing D-01 through D-10 remain PENDING; no new owner/customer approval is inferred.

### R2-T06 Historical check limitation and pending-decision safeguard

**Before evidence:** 25October final_cross_static_qa.json stated no material active inconsistency after19 checks; current snapshot still contained the specific omissions above. ConflictLog final evidence note and ChangeLog retained the83-page/19-check25October conclusion; those bytes/time/hashes must remain history rather than evidence of26October repair.

**Impact:** An old static PASS could be reused as current proof and technical repair could be mistaken for approval or test execution.

**Repair:** Preserve the dated historical records and add the26October findings/current verification separately. Keep all D-01..D-10 PENDING, D-04 dates candidate and all24 scenarios NOT RUN.

**Basis:** Explicit26October evidence and decision-preservation instructions; no customer/owner sign-off.

**Status:** Verified preservation guard; earlier evidence retained and all decisions/execution statuses remain pending or NOT RUN.

**Approval needed:** All existing D-01 through D-10 remain PENDING; no new owner/customer approval is inferred.

Current requirement basis checked directly: `00_Source_Materials/Task2_URS/Student_Project_Planning_and_Progress_Tracking_System_URS_REVISED.pdf`,24pages,SHA-256`bcc20201741e9d84ebd98ea59c52545a0d49097654dae13c9daaea803c932740`; FR-13p15,FR-15p16 and DR-04p19 retain their formal meanings. All24 integration scenarios remain **NOT RUN**. Document static checks, arithmetic checks and rendered-page review do not validate application NFR-03 performance or NFR-05 reliability.

### R2-T07 Historical case evidence alignment

**Before evidence:** Earlier cached case definitions differed in four fields from the actual saved pre-repair matrix: IT07 preconditions, IT08 expected result, IT17 expected result and IT24 expected result. Exact before/current wording is retained in the local audit archive. These are evidence-text differences, not four newly established application defects.

**Impact:** A check that assumes the old JSON exactly mirrors the saved matrix may give an incorrect baseline comparison or regenerate stale case text.

**Repair:** Preserve earlier cached definitions and matrix snapshots unchanged; derive current case records directly from the actual current matrix and compare unrelated cases against its real pre-repair snapshot. At that earlier repair snapshot all24 scenarios remained NOT RUN; the current weekly matrix contains27 NOT RUN scenarios. The initial checker-assumption failures and their corrections remain archived.

**Basis:** Explicit26 October requirement to verify actual local files, record other real inconsistencies and preserve historical evidence.

**Status:** Evidence alignment repaired for the current check/generation path; historical bytes retained, with no inferred runtime result.

**Approval needed:** No new business choice. All D-01 through D-10 remain PENDING; this correction approves no requirement, date, scope or acceptance decision.

## Weekly design integration update dated26 October2026

The current matrix has27 NOT RUN cases. IT25 makes the valid relative CPM -> current Blocked-critical warning path explicit; IT26 gives conditional reproducible integer/decimal/tie/near-zero/positive-slack/invalid-input oracles under the one NumericPolicy; IT27 covers authorized duration diagnostics, privacy and safe Dashboard degradation without approving F2 mandatory fields. Calendar-day/Day0/start+ceil(T) and strict-date comparisons are recommendations under PENDING D-04, with precision-resolved unrounded T. Each D-01..D-10 now includes a concrete recommendation, rationale, impact, consequence, owner, approval boundary and PENDING status while preserving its original problem and owner. No original URS, priority, owner responsibility, approval, source history or old hash was rewritten. Independent arithmetic and static/page checks are evidence categories distinct from unexecuted software tests.
