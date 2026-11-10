# ROUND3 Shared REST API Contract

Status: **RECOMMENDED DEVELOPMENT CONTRACT — PENDING TEAM REVIEW**. Prepared 30 October 2026. No endpoint exists yet and no application test has run. This is the proposed HTTP/TypeScript elaboration of the [ROUND2 contract](../integration/Cross_Module_Interface_Contract_ROUND2.md); that baseline, the [RTM](../integration/Requirement_Traceability_and_Priority_Matrix_ROUND2.md), and the original URS remain authoritative. D-01 through D-10 remain **PENDING**. Read this with the [domain model](ROUND3_Domain_Model_and_ERD.md) and [module interfaces](ROUND3_Module_Interface_Specification.md).

Revision 1 — Contract Consistency, 30 October 2026. See the [revision report](ROUND3_Contract_Consistency_Revision_Report_2026-10-30.md). This is a documentation correction, not software execution or approval.

## 1. Protocol and identifiers

Use one same-origin JSON REST application at `/api/v1`; UTF-8 and `Content-Type: application/json`. The proposed DTOs below are specifications to implement in `src/shared/contracts/`, not existing generated code. Opaque string IDs are server-generated; do not parse a prefix or accept an ID as proof of access. `actorId` is the authenticated global UserId obtained server-side, never a trusted request-body identity. Resolve its active project membership before using a MemberId.

Use `name`, `assigneeId`, `prerequisiteId`, and `dependentId` consistently. Candidate words `title`, `assigneeMemberId`, `predecessorTaskId`, `successorTaskId` are explanatory alternatives from the task brief, not additional accepted wire fields. Reject unexpected mutation fields rather than silently ignoring `status`, `revision`, or an alias. Stored status is exactly `NOT_STARTED | IN_PROGRESS | COMPLETED`.

Dates are strict valid Gregorian `YYYY-MM-DD` LocalDate strings or null, not instants. `createdAt`/`updatedAt` are server UTC ISO-8601 instants. All dated monitoring requests require an explicit `asOfDate`; no implicit chat timezone/browser timezone approval. Invalid dates return INVALID_INPUT in an already authorized context. When D-04 has not been selected/approved, mark date comparisons unevaluated; relative CPM remains usable. Candidate strict `>` comparison and start+ceil(T) mapping are allowed only in explicitly labelled policy fixtures or a subsequently agreed configuration.

### Exact decimal representation — explicit proposed transport mapping

ROUND2's conceptual `durationDays:number` expresses a numeric quantity, not a requirement to lose decimal digits in JSON/JavaScript. ROUND3 recommends the wire/storage refinement `DecimalString`: plain base10 digits, optional fractional part, no exponent, whitespace, separators, Infinity or NaN. Source grammar is `(?:0|[1-9][0-9]*)(?:\.[0-9]+)?`, with exact positivity validation; for example `"0.299999999999"`. Store and return a valid source token such as `"0.10"` with its submitted fractional digits preserved. Only **derived CPM outputs** normalize redundant fractional zeros (`"0.10"` becomes `"0.1"`); derived zero is `"0"`. Positive duration input must be greater than zero. Null represents an estimate not supplied, conditional on D-03 save policy; omitted PATCH fields mean unchanged. Never convert through JS Number, SQLite REAL, `parseFloat`, or a rounded display value.

Domain arithmetic uses exact scaled BigInt from the preserved digits. Mathematical zero float alone is critical; a real float `"0.000000000001"` is positive and noncritical. No intermediate rounding, arbitrary epsilon, or binary backend is recommended. A proposed defensive parser ceiling is 24 significant digits and 18 fractional digits per input: configurable, pending D-03/D-07, reject beyond-limit input visibly without rounding. This is not an approved business capacity/precision limit; output sums may exceed input digit limits and must serialize exactly. Empty/unavailable quantities remain null, not `"0"`. The team must review this transport refinement jointly before parallel API work; old ROUND2 documents remain unmodified.

## 2. Shared source DTOs

Illustrative TypeScript declarations (one canonical definition per type in the planned shared package):

```ts
type UserId = string; type ProjectId = string; type MemberId = string;
type TaskId = string; type NoteId = string; type DependencyId = string;
type DecimalString = string; type LocalDate = string; type Instant = string;
type Revision = number; // positive safe integer, server-generated; reject overflow
// Implement branded identifiers and runtime validators at the HTTP boundary.
type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
type ProjectRole = 'LEADER' | 'MEMBER'; // recommended D-02/D-08 role mapping
interface ProjectView {
  projectId: ProjectId; name: string; description: string | null;
  plannedStartDate: LocalDate | null; projectDeadline: LocalDate | null;
  revision: Revision; createdAt: Instant; updatedAt: Instant;
}
interface MembershipRecord {
  memberId: MemberId; projectId: ProjectId; userId: UserId;
  role: ProjectRole; active: boolean; createdAt: Instant; updatedAt: Instant;
  leftAt: Instant | null;
}
interface MemberView extends MembershipRecord {
  displayName: string; // authorized project-scoped read projection from User
}
interface TaskSnapshot {
  taskId: TaskId; projectId: ProjectId; name: string; description: string | null;
  assigneeId: MemberId | null; durationDays: DecimalString | null;
  taskDeadline: LocalDate | null; status: TaskStatus;
  createdAt: Instant; updatedAt: Instant;
}
interface DependencyEdge { prerequisiteId: TaskId; dependentId: TaskId; }
interface DependencyView extends DependencyEdge {
  dependencyId: DependencyId; projectId: ProjectId;
}
interface ProgressNoteView {
  noteId: NoteId; taskId: TaskId; authorMemberId: MemberId;
  text: string; createdAt: Instant;
}
interface SavedChange {
  projectId: ProjectId; revision: Revision; changeKind: string;
  affectedTaskIds: TaskId[]; changedFields: string[];
}
interface MutationResult<T> {
  ok: true; projectId: ProjectId; revision: Revision; value: T;
  savedChange: SavedChange;
}
interface ProjectReadResult<T> {
  ok: true; projectId: ProjectId; revision: Revision; value: T;
}
interface PublicError {
  code: string; message: string;
  fieldErrors?: { field: string; message: string }[];
}
interface Failure { ok: false; error: PublicError; }
interface ProjectSnapshot {
  projectId: ProjectId; name: string; description: string | null;
  plannedStartDate: LocalDate | null; projectDeadline: LocalDate | null;
  members: readonly MembershipRecord[]; tasks: readonly TaskSnapshot[];
  dependencySource: DependencySourceSnapshot; revision: Revision;
}
interface AuthorizedReadContext {
  actorId: UserId; viewerMemberId: MemberId;
  snapshot: Readonly<ProjectSnapshot>;
}
interface DatedReadContext extends AuthorizedReadContext { asOfDate: LocalDate; }
interface RuntimePolicy {
  f3Enabled: boolean; f4Enabled: boolean; f6Enabled: boolean;
  datePolicy: 'UNRESOLVED' | 'EXPLICIT_CANDIDATE_FIXTURE' | 'AGREED_POLICY';
}
interface DashboardInput {
  context: DatedReadContext;
  dependencies: DependencyResultView;
  schedule: ScheduleResultView;
}
interface ProjectListResult { ok: true; items: ProjectView[]; }
interface MemberDepartureValue {
  memberId: MemberId; active: false; unassignedTaskIds: TaskId[];
}
interface TaskDeletionValue { taskId: TaskId; deleted: true; }
interface DependencyRemovalValue { dependencyId: DependencyId; removed: true; }
interface DependencyListValue {
  dependencyView: DependencyResultView; links: readonly DependencyView[] | null;
}
interface DependencyValidationValue { valid: true; sourceRevision: Revision; }
interface ProgressSummaryValue {
  progress: ProgressResult; rawStatusCounts: Record<TaskStatus, number>;
}
```

Mutation success has exactly one committed revision, equal to `savedChange.revision`. `changeKind` is a technical label agreed in the module specification, not a task lifecycle/status. No success payload, SavedChange, or fabricated current revision is returned on failure. Reads below use `ProjectReadResult<T>` unless explicitly different; each nested derived `sourceRevision` equals this revision. Project lists use `{ok:true,items:ProjectView[]}` with each project's own revision, never a global revision counter. Responses must not include password/session data or inactive members' private unrelated data. Historical note authors stay resolvable within authorized project context. MemberView adds the user's displayName only for authorized project presentation (including retained note authors), so the UI need not invent a user-directory endpoint or display raw membership IDs as names; MembershipRecord remains the shared source record.

## 3. Derived DTOs and null rules

```ts
type Availability = 'VALID' | 'NO_TASKS' | 'NOT_ENABLED' | 'UNAVAILABLE';
type DependencyUnavailableReason =
  'DEPENDENCY_INPUT_UNAVAILABLE' | 'INVALID_INPUT' | 'STALE_RESULT';
type ScheduleUnavailableReason = DependencyUnavailableReason | 'CALCULATION_FAILED';
interface DependencySourceSnapshot {
  availability: Availability;
  links: readonly DependencyView[] | null;
  reasonCode?: DependencyUnavailableReason | 'FEATURE_NOT_ENABLED';
}
interface DependencyResultView {
  availability: Availability; sourceRevision: Revision;
  edges: DependencyEdge[] | null;
  reasonCode?: DependencyUnavailableReason | 'FEATURE_NOT_ENABLED';
}
interface TaskTiming {
  taskId: TaskId; ES: DecimalString; EF: DecimalString;
  LS: DecimalString; LF: DecimalString; totalFloat: DecimalString;
}
interface DurationInputDiagnostic {
  taskId: TaskId; field: 'durationDays';
  issue: 'MISSING' | 'NON_NUMERIC' | 'NON_FINITE' | 'NON_POSITIVE'; message: string;
}
interface ScheduleResultView {
  availability: Availability; sourceRevision: Revision;
  reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
  durationDays: DecimalString | null; timings: TaskTiming[] | null;
  criticalTaskIds: TaskId[] | null; estimatedProjectFinish: LocalDate | null;
  finishReasonCode?: 'MISSING_PLANNED_START' | 'DATE_MAPPING_UNRESOLVED';
  diagnostics: DurationInputDiagnostic[] | null;
}
interface ProgressResult {
  availability: 'VALID' | 'NO_TASKS'; sourceRevision: Revision;
  totalTasks: number; completedTasks: number; percentage: number | null;
}
interface IncompletePrerequisiteView {
  taskId: TaskId; name: string; rawStatus: TaskStatus;
}
interface BlockedResult {
  availability: Availability; sourceRevision: Revision;
  blockedTaskIds: TaskId[] | null;
  byTaskId: Record<TaskId, { incompletePrerequisites: IncompletePrerequisiteView[] }> | null;
  reasonCode?: DependencyUnavailableReason | 'FEATURE_NOT_ENABLED';
}
interface TaskDisplayView {
  task: TaskSnapshot; rawStatus: TaskStatus; isBlocked: boolean | null;
  incompletePrerequisites: IncompletePrerequisiteView[] | null;
  isCritical: boolean | null;
}
interface AssignedTasksResult {
  availability: 'VALID' | 'NO_TASKS'; sourceRevision: Revision;
  items: TaskDisplayView[];
}
interface OverdueResult {
  availability: 'VALID' | 'NO_TASKS'; sourceRevision: Revision; asOfDate: LocalDate;
  overdueTaskIds: TaskId[]; notEvaluatedTaskIds: TaskId[];
  items: { taskId: TaskId; daysOverdue: number }[];
  reasons: { taskId: TaskId; message: string }[];
}
type WarningType = 'OVERDUE_TASK' | 'BLOCKED_CRITICAL_TASK' | 'PROJECT_DEADLINE_CONFLICT';
interface WarningItem {
  type: WarningType; taskId: TaskId | null; message: string;
  prerequisiteIds: TaskId[] | null; daysOverdue: number | null;
}
interface WarningEvaluation {
  availability: Availability;
  reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
  explanation?: string; // missing dates/unconfirmed D-04, not a rival top-level error code
}
interface ScheduleWarningResult {
  availability: Availability; sourceRevision: Revision;
  items: WarningItem[] | null;
  evaluationByType: Record<WarningType, WarningEvaluation> | null;
  reasonCode?: 'FEATURE_NOT_ENABLED';
}
interface DashboardSummary {
  projectId: ProjectId; name: string; revision: Revision; asOfDate: LocalDate;
  progress: ProgressResult; rawStatusCounts: Record<TaskStatus, number>;
  blockedResult: BlockedResult; assignedTasks: AssignedTasksResult;
  overdueResult: OverdueResult; schedule: ScheduleResultView;
  warnings: ScheduleWarningResult;
  notices: { capability: string; message: string }[];
}
type DashboardResult = { ok: true; summary: DashboardSummary } | Failure;
interface CriticalPathsResult {
  availability: Availability; sourceRevision: Revision;
  paths: TaskId[][] | null; complete: boolean; nextCursor: string | null;
  reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
}
```

`percentage` is a presentation statistic, `completedTasks / totalTasks * 100`, never an input to schedule calculations. D-05 display rounding remains pending; retain counts for exact interpretation. `byTaskId` contains blocked tasks only; known unblocked tasks derive false with an empty direct-incomplete subset. With unknown dependencies all unfinished task flags/subsets are null; a safely known completed task is never unfinished Blocked. Unknown criticality is always null, never false. F5 alone computes overdue `items.daysOverdue` under the selected date policy; `overdueTaskIds` is exactly the set of item task IDs. F6 consumes those values rather than redoing date arithmetic. With NO_TASKS all overdue lists/items/reasons are empty; unresolved date comparisons have no item and an explicit not-evaluated reason.

| Capability | VALID | NO_TASKS | NOT_ENABLED / UNAVAILABLE |
| --- | --- | --- | --- |
| F3 dependencies | Complete validated edges, including `[]` for a nonempty independent task set | `edges=[]` | `edges=null`; dependency-scoped reasons only |
| F4 schedule | Whole timings and certified critical set, exact duration | All schedule quantities, timings, critical set and finish null | Same payload null; diagnostics only for authorized INVALID_INPUT |
| F5 progress | Counts and numeric percentage | Counts 0; percentage null | No F4 error propagation; unsafe source fails the overall query |
| F5 Blocked | Complete known blocked IDs/reasons, possibly empty | IDs `[]`, map `{}` when capability enabled | IDs/map null; no CALCULATION_FAILED from F4 |
| F5 assigned | Project has tasks; personal items may be empty | Project has no tasks; items `[]` | Unsafe access/source is Failure; no schedule-only failure |
| F5 overdue | Known source, evaluated IDs plus explicitly unevaluated tasks | Lists empty | Missing dates/unconfirmed policy go to per-task reasons; never assert on time |
| F6 warnings | May have some per-type UNAVAILABLE and reliable items | Neutral enabled no-work state, empty items; no no-risk assertion | F6 off has null items/evaluation and FEATURE_NOT_ENABLED |

F4 gates: off → NOT_ENABLED; enabled empty → NO_TASKS; enabled nonempty without complete valid current F3 → UNAVAILABLE/DEPENDENCY_INPUT_UNAVAILABLE; then validate every duration, then calculate. On authorized invalid duration input, collect every detectable task/field diagnostic and return whole UNAVAILABLE/INVALID_INPUT. On unprovable arithmetic, whole UNAVAILABLE/CALCULATION_FAILED. No partial timing subset. A valid relative plan may have null absolute finish with its separate finishReasonCode. Basic F5 and trusted current F3-derived blockers survive F4 failures. F6 consumes current certified critical IDs; it never calculates CPM/absolute finish itself.

### Canonical source and explicit composition — Revision 1

Sections 2–3 are the sole normative shared DTO declarations. Other documents reference them; the revision report quotes exact definitions for audit, not alternatives. ProjectSnapshot contains raw dependencySource, not a prevalidated dependencyView or a rival snapshot. The enclosing revision R binds all its immutable source records, including retained historical members and complete stored dependency links; no second counter exists.

| Raw dependencySource | Meaning and F3 action |
| --- | --- |
| VALID, links including [] | Complete readable same-revision source, **not yet graph-valid**. F3 checks endpoints/self-links/duplicates/cycles and projects each record to DependencyEdge. Stored DependencyId stays in the snapshot for management. Validated empty links with nonempty tasks become VALID/edges=[]. |
| NO_TASKS, links=[] | Safely known empty task universe and complete empty source. Enabled F3 returns NO_TASKS/edges=[]. Unexpected links are not hidden as empty. |
| NOT_ENABLED, links=null | FEATURE_NOT_ENABLED; F3 disabled output also has null edges. |
| UNAVAILABLE, links=null | Applicable DEPENDENCY_INPUT_UNAVAILABLE, INVALID_INPUT or STALE_RESULT; no conversion to known-empty input. |

A readable but invalid/cyclic raw set makes F3 UNAVAILABLE/INVALID_INPUT with edges=null; raw readability does not certify graph validity. Disabled F3 keeps its precedence; safely known enabled empty data stays NO_TASKS. Unavailable source is never evidence of emptiness. F4's own off/empty precedence is unchanged. RuntimePolicy is fixed for one request; inconsistent reader/engine feature settings are untrusted input, not permission to enable a feature.

The application authenticates, resolves/rechecks active viewerMemberId and reads one coherent snapshot plus its complete dependency source in one short transaction at R. It calls F3 getDependencyView(snapshot,enabled), F4 calculateSchedule(snapshot,dependencies,policy), then pure buildDashboard({context,dependencies,schedule},policy). The builder invokes F5 progress/direct Blocked/assignment/overdue and F6 supplied-fact composition, then verifies every sourceRevision=R. It performs no authentication, database/network read, F3 graph validation or CPM. Context includes explicit asOfDate and already-authorized actor/viewer identity.

Reject mismatched provenance/revisions before using payloads. A stale F3 view loses all old edges; emit an explanatory UNAVAILABLE/STALE_RESULT attempt at R, never old edges relabeled R. Nonempty enabled F4 maps untrusted F3 to DEPENDENCY_INPUT_UNAVAILABLE. A stale F4 view loses all timings/critical/finish facts and becomes UNAVAILABLE/STALE_RESULT for attempted R; current F3 still supports Blocked. A same-number VALID schedule cannot be accepted when its required F3 input is untrusted. Unavailable outputs explain a rejected attempt at R, not republished source. Unsafe source/viewer context returns the existing Failure. A later concurrent save does not invalidate the coherence of the read R; clients reject responses older than their known revision.

IncompletePrerequisiteView.rawStatus is exactly the direct prerequisite's stored status. Only NOT_STARTED/IN_PROGRESS belong in an incomplete subset. Exclude completed predecessors and transitive ancestors; completed dependents are not unfinished Blocked. Both BlockedResult and TaskDisplayView reuse the same type; no fourth status or local DTO.

## 4. Identity, authorization and HTTP failures

Every route below requires a verified IdentityPort principal and active membership, except creating a project/listing one's projects (identity still required). D-08 authentication/provisioning/invitation flow is not approved. A seeded identity adapter is for isolated explicit dev/test mode only, and must be impossible to enable accidentally in a live server; never trust a public `X-User-Id` header. Session/cookie transport, credential provisioning and invitation acceptance must be reviewed before a live MVP; the business routes below do not invent registration, password reset or email invitations.

Proposed access-policy matrix: active members read; leader performs project/member/task-structure/assignment/dependency edits; assigned members may update their task status and add notes. These are D-02/D-08 recommendations, not settled URS rights. Implement a common PolicyPort; operations whose exact policy is not selected remain disabled rather than granting extra rights. Blocked itself never denies an otherwise authorized update. Sole-leader departure/transfer and note edit/delete remain gated; do not invent an approval workflow. A disabled policy action maps to PERMISSION_DENIED with a clear already-authorized-context explanation, not a fabricated approval.

| HTTP | Public error code | Boundary |
| --- | --- | --- |
| 401 | AUTHENTICATION_REQUIRED (new HTTP-layer technical code) | No verified principal; no private payload |
| 404 | INVALID_OR_INACCESSIBLE_PROJECT | Unknown/nonmember/inaccessible project uniformly: `Invalid or inaccessible project.` |
| 404 | INVALID_OR_INACCESSIBLE_TASK | Unknown/cross-project/inaccessible task uniformly: `Invalid or inaccessible task.` |
| 403 | PERMISSION_DENIED / LEADER_AGREEMENT_REQUIRED | Only after accessible project context established; no new agreement workflow |
| 400 | INVALID_INPUT / INVALID_STATUS / INVALID_DEPENDENCY | Authorized malformed fields, decimal transport/type or self-link; fieldErrors limited to submitted fields |
| 409 | CIRCULAR_DEPENDENCY / INVALID_DEPENDENCY | Authorized cycle or duplicate; prior source preserved |
| 409 | REVISION_CONFLICT | Authorized expectedRevision mismatch; caller rereads, retains draft, never blindly retries mutation |
| 409 | REFERENCE_POLICY_UNRESOLVED | Referenced task deletion pending policy; no cascades |
| 503 | SAVE_FAILED / SOURCE_UNAVAILABLE | Failed write/coherent source read, no SQL/stack/private values exposed |

Detailed membership-reference errors are not a user directory: resolve target identity/member only within an authorized project/invitation context. Dependency lookups with an inaccessible endpoint use the generic task error before revealing graph details. Match unknown and denied response shapes; logs must omit private source payloads. Framework/malformed JSON errors receive a safe generic INVALID_INPUT envelope. Derivation availability is HTTP 200 with a nonvalid result, not a 500 for the entire dashboard. No 204 mutation response: return the committed revision.

### Common E / Failure JSON examples

Every endpoint failure uses exactly Failure with the applicable HTTP status in the preceding table, never a result containing error as value. All EP rows reference these common valid shapes; other listed codes use the same structure. No successful revision/SavedChange is attached.

```json
{"ok":false,"error":{"code":"REVISION_CONFLICT","message":"Project changed. Reload before saving; keep your draft."}}
```

```json
{"ok":false,"error":{"code":"INVALID_OR_INACCESSIBLE_PROJECT","message":"Invalid or inaccessible project."}}
```

## 5. Endpoint catalogue

All request schemas below are proposed and closed (reject unknown keys). `P=/api/v1/projects/{projectId}`. All project queries first authorize and read a coherent project; all existing-project source mutations require **body expectedRevision**, except DELETE uses the query parameter to avoid relying on DELETE bodies. IDs in URLs are string path parameters. Expected revision is a positive safe integer; GETs never mutate it. The response-type cell is the **complete HTTP body**, never only the inner value. Success examples are in §7; every endpoint failure uses common E/Failure (§4), without nested result wrappers. Responses for ordinary project reads/mutations are the wrappers in section 2. `E` denotes the common errors above; table-specific errors supplement E. No pagination is needed for the first small project snapshot: return the complete set, never an implicit truncated graph.

| ID | Method and URL | Purpose, owner, trace | Request body/query | Complete HTTP body; inner value; validation; example/failure |
| --- | --- | --- | --- | --- |
| EP01 | POST `/api/v1/projects` | Create F1; FR-01/02, NFR-04 | `{name,description?,plannedStartDate?,projectDeadline?}` | HTTP 201 `MutationResult<ProjectView>`; inner `ProjectView`; creator membership atomic at revision1; existing D-03/D-08 gates. [Success EP01](#ep01); failure `Failure`, common E (§4). |
| EP02 | GET `/api/v1/projects` | List own accessible projects F1; FR-01/06 | No body | HTTP 200 `ProjectListResult`; inner `ProjectView[]`; active membership filter, no unrelated projects. [Success EP02](#ep02); failure `Failure`, common E (§4). |
| EP03 | GET `P` | Project details F1; FR-01/06 | No body | HTTP 200 `ProjectReadResult<ProjectView>`; inner `ProjectView`; authorized metadata, current revision. [Success EP03](#ep03); failure `Failure`, common E (§4). |
| EP04 | PATCH `P` | Update metadata F1; FR-01/12 | `{expectedRevision,name?,description?,plannedStartDate?,projectDeadline?}` | HTTP 200 `MutationResult<ProjectView>`; inner `ProjectView`; null clears optional field, no field implies INVALID_INPUT; dates do not constrain CPM. [Success EP04](#ep04); failure `Failure`, common E (§4). |
| EP05 | GET `P/members` | Project memberships F1; FR-02/06 | No body | HTTP 200 `ProjectReadResult<MemberView[]>`; inner `MemberView[]`; active members plus only historical identities needed for retained notes. [Success EP05](#ep05); failure `Failure`, common E (§4). |
| EP06 | POST `P/members` | Add/reactivate member F1; FR-02/06 | `{expectedRevision,userId}` | HTTP 201 `MutationResult<MemberView>`; inner `MemberView`; **disabled until D-08 admission/invitation policy selected**; never add an arbitrary known user without agreed acceptance. [Success EP06](#ep06); failure `Failure`, common E (§4). |
| EP07 | PATCH `P/members/{memberId}` | Role change F1; FR-02/06 | `{expectedRevision,role}` | HTTP 200 `MutationResult<MemberView>`; inner `MemberView`; valid same-project membership; transfer/last-leader changes disabled pending D-08, preserve leader invariant. [Success EP07](#ep07); failure `Failure`, common E (§4). |
| EP08 | DELETE `P/members/{memberId}?expectedRevision=R` | Departure F1/F2; FR-02, DR-05 | No body | HTTP 200 `MutationResult<MemberDepartureValue>`; inner `MemberDepartureValue`; revoke access and clear assignees atomically; sole leader blocked; no note/source loss. [Success EP08](#ep08); failure `Failure`, common E (§4). |
| EP09 | POST `P/tasks` | Create F2; FR-03 | `{expectedRevision,name,description?,assigneeId?,durationDays?,taskDeadline?}` | HTTP 201 `MutationResult<TaskSnapshot>`; inner `TaskSnapshot`; active same-project assignee/null, finite positive decimal string when supplied; omitted-duration save and initial NOT_STARTED conditional on D-03/D-05. [Success EP09](#ep09); failure `Failure`, common E (§4). |
| EP10 | GET `P/tasks` | Complete source tasks F2; FR-03/14 | No body | HTTP 200 `ProjectReadResult<TaskSnapshot[]>`; inner `TaskSnapshot[]`; no Blocked stored/filter status; complete set for integration. [Success EP10](#ep10); failure `Failure`, common E (§4). |
| EP11 | GET `P/tasks/{taskId}` | Source task F2; FR-03/06 | No body | HTTP 200 `ProjectReadResult<TaskSnapshot>`; inner `TaskSnapshot`; project/task membership check. [Success EP11](#ep11); failure `Failure`, common E (§4). |
| EP12 | PATCH `P/tasks/{taskId}` | Edit source F2; FR-03/12 | `{expectedRevision,name?,description?,durationDays?,taskDeadline?}` | HTTP 200 `MutationResult<TaskSnapshot>`; inner `TaskSnapshot`; status/assignee use separate endpoints, positive supplied decimal; explicit null estimate only if D-03 allows. [Success EP12](#ep12); failure `Failure`, common E (§4). |
| EP13 | PATCH `P/tasks/{taskId}/assignee` | Assign/unassign F2; FR-02/03/06 | `{expectedRevision,assigneeId:MemberId|null}` | HTTP 200 `MutationResult<TaskSnapshot>`; inner `TaskSnapshot`; UserId cannot substitute MemberId, active same-project assignment only. [Success EP13](#ep13); failure `Failure`, common E (§4). |
| EP14 | PATCH `P/tasks/{taskId}/status` | Status F2; FR-04/14, DR-04 | `{expectedRevision,status}` | HTTP 200 `MutationResult<TaskSnapshot>`; inner `TaskSnapshot`; exact three enum codes; D-05 transition rule gate; Blocked does not lock an authorized action. [Success EP14](#ep14); failure `Failure`, common E (§4). |
| EP15 | DELETE `P/tasks/{taskId}?expectedRevision=R` | Delete F2 with F3/note ports; FR-03 | No body | HTTP 200 `MutationResult<TaskDeletionValue>`; inner `TaskDeletionValue`; unreferenced deletion only under selected D-03; references → REFERENCE_POLICY_UNRESOLVED, no silent cleanup. [Success EP15](#ep15); failure `Failure`, common E (§4). |
| EP16 | GET `P/tasks/{taskId}/notes` | Notes F2; FR-05/06 | No body | HTTP 200 `ProjectReadResult<ProgressNoteView[]>`; inner `ProgressNoteView[]`; authorized project historical author resolvable. [Success EP16](#ep16); failure `Failure`, common E (§4). |
| EP17 | POST `P/tasks/{taskId}/notes` | Append note F2; FR-05 | `{expectedRevision,text}` | HTTP 201 `MutationResult<ProgressNoteView>`; inner `ProgressNoteView`; authorMemberId from principal, nonempty short text; proposed configurable 2000-code-point limit D-09; no status inference/edit-history promise. [Success EP17](#ep17); failure `Failure`, common E (§4). |
| EP18 | GET `P/dependencies` | Complete F3 links; FR-07/09 | No body | HTTP 200 `ProjectReadResult<DependencyListValue>`; inner `DependencyListValue`; same-revision pair facts plus stored IDs for later removal; no omitted links. [Success EP18](#ep18); failure `Failure`, common E (§4). |
| EP19 | POST `P/dependencies` | Add F3 link; FR-07/08 | `{expectedRevision,prerequisiteId,dependentId}` | HTTP 201 `MutationResult<DependencyView>`; inner `DependencyView`; same-project different tasks, no duplicate, whole candidate DAG validation inside commit. [Success EP19](#ep19); failure `Failure`, common E (§4). |
| EP20 | DELETE `P/dependencies/{dependencyId}?expectedRevision=R` | Remove F3 link; FR-07/12 | No body | HTTP 200 `MutationResult<DependencyRemovalValue>`; inner `DependencyRemovalValue`; authorized same-project link; missing/foreign link generic INVALID_DEPENDENCY only in accessible context, no foreign data. [Success EP20](#ep20); failure `Failure`, common E (§4). |
| EP21 | POST `P/dependencies/validate` | Nonmutating preflight F3; FR-08 | `{expectedRevision,prerequisiteId,dependentId}` | HTTP 200 `ProjectReadResult<DependencyValidationValue>`; inner `DependencyValidationValue`; no source commit/SavedChange/revision increment; commit must recheck. [Success EP21](#ep21); failure `Failure`, common E (§4). |
| EP22 | POST `P/schedule/calculate` | Explicit analysis F4; FR-10/11/12 | `{expectedRevision}` | HTTP 200 `ProjectReadResult<ScheduleResultView>`; inner `ScheduleResultView`; checks current revision but is **not a source write**; no revision increment, no SavedChange, no DB-stored derived fields. [Success EP22](#ep22); failure `Failure`, common E (§4). |
| EP23 | GET `P/schedule` | Current full schedule F4; FR-10/11/12 | No body | HTTP 200 `ProjectReadResult<ScheduleResultView>`; inner `ScheduleResultView`; MVP recomputes on coherent input, contains ES/EF/LS/LF/totalFloat/all critical activities. [Success EP23](#ep23); failure `Failure`, common E (§4). |
| EP24 | GET `P/schedule/critical-paths` | Path explanation F4; FR-11 technical elaboration | `limit?`, `cursor?` query; same source context | HTTP 200 `ProjectReadResult<CriticalPathsResult>`; inner `CriticalPathsResult`; read only, no rival CPM, revision-bound cursor. [Success EP24](#ep24); failure `Failure`, common E (§4). |
| EP25 | GET `P/dashboard?asOfDate=YYYY-MM-DD` | F5/MON-M0; FR-13/14 plus retained FR-15 | Explicit date, no body | HTTP 200 `DashboardResult`; inner `DashboardSummary`; F4-only failure must not fail whole dashboard. [Success EP25](#ep25); failure `Failure`, common E (§4). |
| EP26 | GET `P/progress` | F5 completion/raw states; FR-13/14 | No body | HTTP 200 `ProjectReadResult<ProgressSummaryValue>`; inner `ProgressSummaryValue`; all tasks once, percentage null for none. [Success EP26](#ep26); failure `Failure`, common E (§4). |
| EP27 | GET `P/blocked` | F5/MON-M3; FR-09/13 | No body | HTTP 200 `ProjectReadResult<BlockedResult>`; inner `BlockedResult`; only incomplete DIRECT predecessor reasons, no F4 dependency. [Success EP27](#ep27); failure `Failure`, common E (§4). |
| EP28 | GET `P/warnings?asOfDate=YYYY-MM-DD` | F6; FR-15 | Explicit date, no body | HTTP 200 `ProjectReadResult<ScheduleWarningResult>`; inner `ScheduleWarningResult`; uses same-source F4/F5 facts, per-type unknowns. [Success EP28](#ep28); failure `Failure`, common E (§4). |

The dependency-list wire value preserves the conceptual `DependencyResultView.edges` pair type while exposing same-project `DependencyView` records for edits after a reload. For VALID, each record projects to exactly one edge and both lists are complete; for NO_TASKS both are empty; for NOT_ENABLED/UNAVAILABLE both link payloads are null. Stored IDs do not enter the pure CPM algorithm and confer no authorization. The read wrapper binds both representations to one project revision.

Selected-policy no-op mutations return INVALID_INPUT with an authorized `No changes supplied.` explanation, no revision increment; this recommended command convention must be shared before implementation. A successful command must represent an actual source change. String limits are defensive recommendations for review, not extra URS scope: proposed name 200 and description 4000 Unicode code points; trim outer name whitespace but do not rewrite note contents silently. Bodies have an explicit configurable byte cap. Required fields/deadline ordering remain D-03 and date rules D-04; do not impose an unapproved `taskDeadline>=plannedStartDate` constraint. The URS internal-target-dates phrase still needs agreed representation; the two selected project dates do not settle that open requirement.

Project DELETE is **not defined/supported** in the baseline; it has no success contract/example and is not added by this revision. Note editing/deletion and user registration are also outside the defined routes; pending policy does not invent an endpoint.

### Critical paths, not just a flattened set

This endpoint elaborates existing FR-11; it is not a new prioritization rule. F4 derives paths using the certified schedule: zero-float tasks connected by tight edges `EF(u)=ES(v)`, from true project source tasks to terminal tasks at T. Preserve **all** criticalTaskIds even when path enumeration is partial. Deterministic TaskId lexicographic traversal; task IDs are opaque, this ordering is presentation only. Exponential path counts require lazy paging rather than silently dropping ties.

CriticalPathsResult is formally defined in section3; its full HTTP body is ProjectReadResult<CriticalPathsResult>. For VALID, `paths` is this page; `complete=false` means more paths exist, with opaque validated `nextCursor` bound to project/revision/limit. A changed revision returns REVISION_CONFLICT, never combines pages from different revisions. Proposed limit default 20/max100 is a response-page safeguard pending D-06, not a task/project capacity limit. For NO_TASKS use paths=null,complete=true,nextCursor=null; for NOT_ENABLED/UNAVAILABLE use null,false,null and the applicable F4 reason. Invalid/expired cursors return authorized INVALID_INPUT. Complete critical activity output is never paginated/truncated by this endpoint. Schedule quantity/availability semantics remain unchanged.

## 6. Version consistency, transactions and refresh

For every source command: authenticate → acquire short BEGIN IMMEDIATE transaction → resolve/recheck active membership and policy → read current project → compare expectedRevision → validate all candidate source/references and (for F3) full candidate graph → write owner-specific rows → conditionally advance project revision once → commit → publish MutationResult/SavedChange → refresh derived views. The new project's creation and initial leader membership are one revision=1 commit. Transaction errors roll back all rows and version; DB-busy/timeout returns safe SAVE_FAILED, with no blind mutation retry. No network/await/CPM/path enumeration inside a write transaction.

The short coherent read transaction obtains project, active/historical memberships, tasks, notes needed and complete dependencies at one revision. After read closes, pure engines analyze that immutable context. Results are labelled with that read revision even if another writer later commits; the HTTP client accepts only a matching project revision. MVP caches nothing and does not persist schedules, removing a complex cache-proof requirement. If a future cache is added, reauthorization and ROUND2 unchanged-input proof are mandatory; never relabel an old result to a new revision. A schedule stale against the assembly context becomes UNAVAILABLE/STALE_RESULT. An untrusted F3 view maps to F4 DEPENDENCY_INPUT_UNAVAILABLE.

`POST schedule/calculate` and validate preflight use expectedRevision to bind requested input but do not commit source changes. `asOfDate` changes are reads. Successful source save survives an optional analysis failure; UI keeps committed source while showing unavailable analysis. Network loss after an unknown save outcome: reread/reconcile; do not claim rollback or auto-resend a create. No idempotency subsystem is introduced in the initial blueprint.

## 7. Complete endpoint JSON examples (synthetic, NOT RUN)

Each EPxx maps to one catalogue row. These are independent response-shape fixtures, **not an executed sequence**. Reads/analysis use preloaded P25/r7; mutations use separate selected-policy r6→7 fixtures; creation uses r1. Membership/transfer/deletion/note/initial-status policies remain gated. Hypothetical success does not approve a policy or report a run. Each example is the entire HTTP body; every failure uses common E/Failure (§4).

### EP01
POST `/api/v1/projects` — HTTP 201, complete `MutationResult<ProjectView>`. Failure: common E/Failure (§4).
Request body:
```json
{"name":"Example project","description":null,"plannedStartDate":null,"projectDeadline":null}
```
Success body:
```json
{"ok":true,"projectId":"P1","revision":1,"value":{"projectId":"P1","name":"Example project","description":null,"plannedStartDate":null,"projectDeadline":null,"revision":1,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P1","revision":1,"changeKind":"PROJECT_CREATED","affectedTaskIds":[],"changedFields":["project","members"]}}
```

### EP02
GET `/api/v1/projects` — HTTP 200, complete `ProjectListResult`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"items":[{"projectId":"P25","name":"Example project","description":null,"plannedStartDate":null,"projectDeadline":null,"revision":7,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"}]}
```

### EP03
GET `P` — HTTP 200, complete `ProjectReadResult<ProjectView>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"projectId":"P25","name":"Example project","description":null,"plannedStartDate":null,"projectDeadline":null,"revision":7,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"}}
```

### EP04
PATCH `P` — HTTP 200, complete `MutationResult<ProjectView>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"name":"Updated project"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"projectId":"P25","name":"Updated project","description":null,"plannedStartDate":null,"projectDeadline":null,"revision":7,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"PROJECT_UPDATED","affectedTaskIds":[],"changedFields":["name"]}}
```

### EP05
GET `P/members` — HTTP 200, complete `ProjectReadResult<MemberView[]>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":[{"memberId":"M1","projectId":"P25","userId":"U1","role":"LEADER","active":true,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z","leftAt":null,"displayName":"Example leader"},{"memberId":"M2","projectId":"P25","userId":"U2","role":"MEMBER","active":true,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z","leftAt":null,"displayName":"Example member"}]}
```

### EP06
POST `P/members` — HTTP 201, complete `MutationResult<MemberView>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"userId":"U2"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"memberId":"M2","projectId":"P25","userId":"U2","role":"MEMBER","active":true,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z","leftAt":null,"displayName":"Example member"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"MEMBER_CHANGED","affectedTaskIds":[],"changedFields":["members"]}}
```

### EP07
PATCH `P/members/{memberId}` — HTTP 200, complete `MutationResult<MemberView>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"role":"LEADER"}
```
**Gated hypothetical shape only:** success requires a later agreed atomic leader-transfer policy preserving one active leader (including the old leader change in the same source transaction). No approval is recorded; the unresolved action currently returns common PERMISSION_DENIED.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"memberId":"M2","projectId":"P25","userId":"U2","role":"LEADER","active":true,"createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z","leftAt":null,"displayName":"Example member"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"MEMBER_CHANGED","affectedTaskIds":[],"changedFields":["members"]}}
```

### EP08
DELETE `P/members/{memberId}?expectedRevision=R` — HTTP 200, complete `MutationResult<MemberDepartureValue>`. Failure: common E/Failure (§4).
Request: no body; query `expectedRevision=6` (delete task uses independent unreferenced X).
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"memberId":"M2","active":false,"unassignedTaskIds":["C"]},"savedChange":{"projectId":"P25","revision":7,"changeKind":"MEMBER_CHANGED","affectedTaskIds":["C"],"changedFields":["members","assigneeId"]}}
```

### EP09
POST `P/tasks` — HTTP 201, complete `MutationResult<TaskSnapshot>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"name":"Task C","assigneeId":"M2","durationDays":"6","taskDeadline":null}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"taskId":"C","projectId":"P25","name":"Task C","description":null,"assigneeId":"M2","durationDays":"6","taskDeadline":null,"status":"NOT_STARTED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"TASK_CREATED","affectedTaskIds":["C"],"changedFields":["tasks"]}}
```

### EP10
GET `P/tasks` — HTTP 200, complete `ProjectReadResult<TaskSnapshot[]>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":[{"taskId":"A","projectId":"P25","name":"Task A","description":null,"assigneeId":"M1","durationDays":"2","taskDeadline":null,"status":"COMPLETED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},{"taskId":"B","projectId":"P25","name":"Task B","description":null,"assigneeId":"M1","durationDays":"3","taskDeadline":null,"status":"COMPLETED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},{"taskId":"C","projectId":"P25","name":"Task C","description":null,"assigneeId":"M2","durationDays":"6","taskDeadline":null,"status":"IN_PROGRESS","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},{"taskId":"D","projectId":"P25","name":"Task D","description":null,"assigneeId":"M1","durationDays":"2","taskDeadline":null,"status":"NOT_STARTED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"}]}
```

### EP11
GET `P/tasks/{taskId}` — HTTP 200, complete `ProjectReadResult<TaskSnapshot>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"taskId":"C","projectId":"P25","name":"Task C","description":null,"assigneeId":"M2","durationDays":"6","taskDeadline":null,"status":"IN_PROGRESS","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"}}
```

### EP12
PATCH `P/tasks/{taskId}` — HTTP 200, complete `MutationResult<TaskSnapshot>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"name":"Task C revised"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"taskId":"C","projectId":"P25","name":"Task C revised","description":null,"assigneeId":"M2","durationDays":"6","taskDeadline":null,"status":"IN_PROGRESS","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"TASK_UPDATED","affectedTaskIds":["C"],"changedFields":["name"]}}
```

### EP13
PATCH `P/tasks/{taskId}/assignee` — HTTP 200, complete `MutationResult<TaskSnapshot>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"assigneeId":"M1"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"taskId":"C","projectId":"P25","name":"Task C","description":null,"assigneeId":"M1","durationDays":"6","taskDeadline":null,"status":"IN_PROGRESS","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"TASK_ASSIGNED","affectedTaskIds":["C"],"changedFields":["assigneeId"]}}
```

### EP14
PATCH `P/tasks/{taskId}/status` — HTTP 200, complete `MutationResult<TaskSnapshot>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"status":"COMPLETED"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"taskId":"C","projectId":"P25","name":"Task C","description":null,"assigneeId":"M2","durationDays":"6","taskDeadline":null,"status":"COMPLETED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"TASK_STATUS_CHANGED","affectedTaskIds":["C"],"changedFields":["status"]}}
```

### EP15
DELETE `P/tasks/{taskId}?expectedRevision=R` — HTTP 200, complete `MutationResult<TaskDeletionValue>`. Failure: common E/Failure (§4).
Request: no body; query `expectedRevision=6` (delete task uses independent unreferenced X).
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"taskId":"X","deleted":true},"savedChange":{"projectId":"P25","revision":7,"changeKind":"TASK_DELETED","affectedTaskIds":["X"],"changedFields":["tasks"]}}
```

### EP16
GET `P/tasks/{taskId}/notes` — HTTP 200, complete `ProjectReadResult<ProgressNoteView[]>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":[{"noteId":"N1","taskId":"C","authorMemberId":"M1","text":"Design review note.","createdAt":"2026-10-30T00:00:00Z"}]}
```

### EP17
POST `P/tasks/{taskId}/notes` — HTTP 201, complete `MutationResult<ProgressNoteView>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"text":"Design review note."}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"noteId":"N1","taskId":"C","authorMemberId":"M1","text":"Design review note.","createdAt":"2026-10-30T00:00:00Z"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"NOTE_ADDED","affectedTaskIds":["C"],"changedFields":["notes"]}}
```

### EP18
GET `P/dependencies` — HTTP 200, complete `ProjectReadResult<DependencyListValue>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"dependencyView":{"availability":"VALID","sourceRevision":7,"edges":[{"prerequisiteId":"A","dependentId":"B"},{"prerequisiteId":"A","dependentId":"C"},{"prerequisiteId":"B","dependentId":"D"},{"prerequisiteId":"C","dependentId":"D"}]},"links":[{"prerequisiteId":"A","dependentId":"B","dependencyId":"L1","projectId":"P25"},{"prerequisiteId":"A","dependentId":"C","dependencyId":"L2","projectId":"P25"},{"prerequisiteId":"B","dependentId":"D","dependencyId":"L3","projectId":"P25"},{"prerequisiteId":"C","dependentId":"D","dependencyId":"L4","projectId":"P25"}]}}
```

### EP19
POST `P/dependencies` — HTTP 201, complete `MutationResult<DependencyView>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":6,"prerequisiteId":"C","dependentId":"D"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"prerequisiteId":"C","dependentId":"D","dependencyId":"L4","projectId":"P25"},"savedChange":{"projectId":"P25","revision":7,"changeKind":"DEPENDENCY_ADDED","affectedTaskIds":["C","D"],"changedFields":["dependencies"]}}
```

### EP20
DELETE `P/dependencies/{dependencyId}?expectedRevision=R` — HTTP 200, complete `MutationResult<DependencyRemovalValue>`. Failure: common E/Failure (§4).
Request: no body; query `expectedRevision=6` (delete task uses independent unreferenced X).
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"dependencyId":"L4","removed":true},"savedChange":{"projectId":"P25","revision":7,"changeKind":"DEPENDENCY_REMOVED","affectedTaskIds":["C","D"],"changedFields":["dependencies"]}}
```

### EP21
POST `P/dependencies/validate` — HTTP 200, complete `ProjectReadResult<DependencyValidationValue>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":7,"prerequisiteId":"B","dependentId":"C"}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"valid":true,"sourceRevision":7}}
```

### EP22
POST `P/schedule/calculate` — HTTP 200, complete `ProjectReadResult<ScheduleResultView>`. Failure: common E/Failure (§4).
Request body:
```json
{"expectedRevision":7}
```
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"VALID","sourceRevision":7,"durationDays":"10","timings":[{"taskId":"A","ES":"0","EF":"2","LS":"0","LF":"2","totalFloat":"0"},{"taskId":"B","ES":"2","EF":"5","LS":"5","LF":"8","totalFloat":"3"},{"taskId":"C","ES":"2","EF":"8","LS":"2","LF":"8","totalFloat":"0"},{"taskId":"D","ES":"8","EF":"10","LS":"8","LF":"10","totalFloat":"0"}],"criticalTaskIds":["A","C","D"],"estimatedProjectFinish":null,"finishReasonCode":"MISSING_PLANNED_START","diagnostics":null}}
```

### EP23
GET `P/schedule` — HTTP 200, complete `ProjectReadResult<ScheduleResultView>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"VALID","sourceRevision":7,"durationDays":"10","timings":[{"taskId":"A","ES":"0","EF":"2","LS":"0","LF":"2","totalFloat":"0"},{"taskId":"B","ES":"2","EF":"5","LS":"5","LF":"8","totalFloat":"3"},{"taskId":"C","ES":"2","EF":"8","LS":"2","LF":"8","totalFloat":"0"},{"taskId":"D","ES":"8","EF":"10","LS":"8","LF":"10","totalFloat":"0"}],"criticalTaskIds":["A","C","D"],"estimatedProjectFinish":null,"finishReasonCode":"MISSING_PLANNED_START","diagnostics":null}}
```

### EP24
GET `P/schedule/critical-paths` — HTTP 200, complete `ProjectReadResult<CriticalPathsResult>`. Failure: common E/Failure (§4).
Request: no body; first-page query `limit=20`, no cursor.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"VALID","sourceRevision":7,"paths":[["A","C","D"]],"complete":true,"nextCursor":null}}
```

### EP25
GET `P/dashboard?asOfDate=YYYY-MM-DD` — HTTP 200, complete `DashboardResult`. Failure: common E/Failure (§4).
Request: no body; query `asOfDate=2026-10-26`.
Success body:
```json
{"ok":true,"summary":{"projectId":"P25","name":"Example project","revision":7,"asOfDate":"2026-10-26","progress":{"availability":"VALID","sourceRevision":7,"totalTasks":4,"completedTasks":2,"percentage":50},"rawStatusCounts":{"NOT_STARTED":1,"IN_PROGRESS":1,"COMPLETED":2},"blockedResult":{"availability":"VALID","sourceRevision":7,"blockedTaskIds":["D"],"byTaskId":{"D":{"incompletePrerequisites":[{"taskId":"C","name":"Task C","rawStatus":"IN_PROGRESS"}]}}},"assignedTasks":{"availability":"VALID","sourceRevision":7,"items":[{"task":{"taskId":"A","projectId":"P25","name":"Task A","description":null,"assigneeId":"M1","durationDays":"2","taskDeadline":null,"status":"COMPLETED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"rawStatus":"COMPLETED","isBlocked":false,"incompletePrerequisites":[],"isCritical":true},{"task":{"taskId":"B","projectId":"P25","name":"Task B","description":null,"assigneeId":"M1","durationDays":"3","taskDeadline":null,"status":"COMPLETED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"rawStatus":"COMPLETED","isBlocked":false,"incompletePrerequisites":[],"isCritical":false},{"task":{"taskId":"D","projectId":"P25","name":"Task D","description":null,"assigneeId":"M1","durationDays":"2","taskDeadline":null,"status":"NOT_STARTED","createdAt":"2026-10-30T00:00:00Z","updatedAt":"2026-10-30T00:00:00Z"},"rawStatus":"NOT_STARTED","isBlocked":true,"incompletePrerequisites":[{"taskId":"C","name":"Task C","rawStatus":"IN_PROGRESS"}],"isCritical":true}]},"overdueResult":{"availability":"VALID","sourceRevision":7,"asOfDate":"2026-10-26","overdueTaskIds":[],"notEvaluatedTaskIds":["C","D"],"items":[],"reasons":[{"taskId":"C","message":"Missing taskDeadline; date policy also unresolved."},{"taskId":"D","message":"Missing taskDeadline; date policy also unresolved."}]},"schedule":{"availability":"VALID","sourceRevision":7,"durationDays":"10","timings":[{"taskId":"A","ES":"0","EF":"2","LS":"0","LF":"2","totalFloat":"0"},{"taskId":"B","ES":"2","EF":"5","LS":"5","LF":"8","totalFloat":"3"},{"taskId":"C","ES":"2","EF":"8","LS":"2","LF":"8","totalFloat":"0"},{"taskId":"D","ES":"8","EF":"10","LS":"8","LF":"10","totalFloat":"0"}],"criticalTaskIds":["A","C","D"],"estimatedProjectFinish":null,"finishReasonCode":"MISSING_PLANNED_START","diagnostics":null},"warnings":{"availability":"VALID","sourceRevision":7,"items":[{"type":"BLOCKED_CRITICAL_TASK","taskId":"D","message":"Task D is critical and blocked by Task C.","prerequisiteIds":["C"],"daysOverdue":null}],"evaluationByType":{"OVERDUE_TASK":{"availability":"UNAVAILABLE","explanation":"Missing task deadlines and unresolved D-04 policy."},"BLOCKED_CRITICAL_TASK":{"availability":"VALID"},"PROJECT_DEADLINE_CONFLICT":{"availability":"UNAVAILABLE","explanation":"Missing planned start/project deadline."}}},"notices":[{"capability":"dates","message":"Date comparisons are not evaluated."}]}}
```

### EP26
GET `P/progress` — HTTP 200, complete `ProjectReadResult<ProgressSummaryValue>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"progress":{"availability":"VALID","sourceRevision":7,"totalTasks":4,"completedTasks":2,"percentage":50},"rawStatusCounts":{"NOT_STARTED":1,"IN_PROGRESS":1,"COMPLETED":2}}}
```

### EP27
GET `P/blocked` — HTTP 200, complete `ProjectReadResult<BlockedResult>`. Failure: common E/Failure (§4).
Request: no body/query.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"VALID","sourceRevision":7,"blockedTaskIds":["D"],"byTaskId":{"D":{"incompletePrerequisites":[{"taskId":"C","name":"Task C","rawStatus":"IN_PROGRESS"}]}}}}
```

### EP28
GET `P/warnings?asOfDate=YYYY-MM-DD` — HTTP 200, complete `ProjectReadResult<ScheduleWarningResult>`. Failure: common E/Failure (§4).
Request: no body; query `asOfDate=2026-10-26`.
Success body:
```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"VALID","sourceRevision":7,"items":[{"type":"BLOCKED_CRITICAL_TASK","taskId":"D","message":"Task D is critical and blocked by Task C.","prerequisiteIds":["C"],"daysOverdue":null}],"evaluationByType":{"OVERDUE_TASK":{"availability":"UNAVAILABLE","explanation":"Missing task deadlines and unresolved D-04 policy."},"BLOCKED_CRITICAL_TASK":{"availability":"VALID"},"PROJECT_DEADLINE_CONFLICT":{"availability":"UNAVAILABLE","explanation":"Missing planned start/project deadline."}}}}
```

### Authorized invalid-duration and optional-off reads

HTTP200 ProjectReadResult<ScheduleResultView>, not an accepted invalid F2 save:

```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"UNAVAILABLE","sourceRevision":7,"reasonCode":"INVALID_INPUT","durationDays":null,"timings":null,"criticalTaskIds":null,"estimatedProjectFinish":null,"diagnostics":[{"taskId":"C","field":"durationDays","issue":"MISSING","message":"A positive duration is required for schedule analysis."}]}}
```

EP25 includes full TaskDisplayView items and EP27 includes BlockedResult; both show C/rawStatus=IN_PROGRESS from source. EP28 is the full warning envelope. F6-off also has the complete read envelope:

```json
{"ok":true,"projectId":"P25","revision":7,"value":{"availability":"NOT_ENABLED","sourceRevision":7,"reasonCode":"FEATURE_NOT_ENABLED","items":null,"evaluationByType":null}}
```

Under IT27 explicit candidate D-04 dates, F5 still supplies C overdue4days and F6 can emit OVERDUE_TASK while schedule-dependent types are unevaluated. This conditional arithmetic does not approve D-04. Keep current Blocked during F4 failure; suppress unknown criticality/finish rather than fail safe source facts.

## 8. Ownership and approval gates

ZhangWeiyi owns project/member/task/note routes and common authorization/persistence wiring; WeiMingrui owns F3 and pure F4 plus schedule routes; ZhangYuyang owns F5/F6 and dashboard routes. WeiMingrui coordinates shared contracts and integration; shared-file edits require the affected owners' review rather than three copies. All identifiers, source DTOs, revision handling, decimal mapping, availability validators and request schema definitions are joint foundation deliverables before parallel development.

Routes whose business policies remain pending can be built against explicit test-only PolicyPort fixtures, but must not be released as accepted behavior. Keep all 27 original integration scenarios **NOT RUN** until real execution, with child execution records rather than editing their historical design status. No application, authentication, database migration or performance test was executed by writing this contract.
