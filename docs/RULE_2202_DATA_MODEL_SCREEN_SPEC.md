# Relay Rider Rule 2202 Compliance Engine
## Data Model and Screen Specification — Pasadena MVP

**Version:** 0.1  
**Date:** August 27, 2026  
**Initial jurisdiction:** South Coast AQMD / Pasadena  
**Primary customer:** Employers with 250 or more employees at a worksite  
**MVP output:** Human-reviewed Rule 2202 compliance package  
**Author:** Manus AI

> **Important boundary:** This specification defines a compliance evidence, calculation, workflow, and draft-reporting product. It does not independently certify compliance, guarantee emission reductions, submit filings, or replace review by the employer’s responsible official, ETC, environmental consultant, or qualified counsel.

## 1. Product definition

Relay Rider should become a **Rule 2202 compliance workspace** that helps a covered employer determine applicability, collect and validate commute-program evidence, apply the correct versioned methodology, manage internal review, and generate a draft annual compliance package. The platform should make every material output traceable to its source data, methodology version, reviewer, and approval state.

The commuter product remains valuable, but it becomes an evidence-producing subsystem. Rider and driver activity may support a compliance program only when the employer’s program rules define the activity, the data is collected lawfully, and the resulting evidence is reviewed and accepted for the intended reporting purpose.

South Coast AQMD’s official overview states that employers in the South Coast Air Basin with 250 or more employees at a worksite must notify the agency of subjectivity, implement a compliance option after the notice process, and provide annual registration thereafter. The official forms and guidelines page lists compliance forms, survey forms, implementation guidelines, AVR guidance, and current emission-factor methodology and tables. [1] [2]

## 2. MVP goals and non-goals

| MVP goals | Explicit non-goals |
|---|---|
| Determine whether a worksite is potentially subject to Rule 2202 based on captured facts and jurisdiction | Automatically make a final legal determination |
| Track subjectivity notice, implementation, registration, and annual reporting dates | Automatically submit to South Coast AQMD |
| Capture employer, worksite, ETC, employee-count, commute-survey, program, and evidence records | Treat modeled or self-reported values as verified facts |
| Support a selected compliance option with versioned inputs and calculations | Support every possible Rule 2202 option on day one |
| Generate an evidence-indexed draft compliance package | Represent the draft as AQMD acceptance or certification |
| Provide human review, comments, sign-off, and immutable audit history | Replace responsible-official or professional review |
| Connect Relay Rider commuter activity to approved evidence records | Infer compliance from app usage alone |

## 3. Evidence classification

Every data item, calculation input, and report output must have an evidence classification. This prevents the interface from visually equating a verified employer record with a projection or an app-generated estimate.

| Classification | Definition | Permitted use |
|---|---|---|
| **Verified** | Reviewed against an authoritative employer, agency, survey, or source document | May support a draft package, subject to final review |
| **Self-reported** | Entered by an employer, ETC, participant, or authorized operator but not independently verified | May be used as a disclosed input or pending evidence |
| **Modeled** | Calculated or estimated using stated assumptions and a methodology version | Must be labeled and cannot silently become verified |
| **Imported** | Loaded from CSV, XLSX, PDF extraction, or an external system | Requires source metadata and validation status |
| **Rejected** | Reviewed and found unusable, contradictory, stale, or unsupported | Excluded from approved calculations |
| **Missing** | Required evidence has not been submitted | Blocks package readiness where required |

Required fields for any material evidence record include `classification`, `source_type`, `source_reference`, `collection_period_start`, `collection_period_end`, `uploaded_by`, `review_status`, `reviewer`, `reviewed_at`, `methodology_version`, and `notes`.

## 4. Core data model

The model below is intentionally separated into organization, compliance, evidence, calculation, program operations, reporting, and audit domains. IDs should be opaque UUIDs. Records that affect a submitted or approved package should be append-only or versioned rather than overwritten.

### 4.1 Organization and access entities

| Entity | Key fields | Rules |
|---|---|---|
| `Organization` | `id`, `legal_name`, `doing_business_as`, `account_status`, `created_at` | Top-level employer or consulting customer. |
| `OrganizationUser` | `organization_id`, `user_id`, `role`, `status`, `last_seen_at` | Roles: `owner`, `responsible_official`, `etc`, `analyst`, `reviewer`, `read_only`, `consultant`. Access is organization-scoped. |
| `Worksite` | `organization_id`, `name`, `street_address`, `city`, `state`, `postal_code`, `latitude`, `longitude`, `employee_count`, `employee_count_as_of`, `basin`, `status` | A compliance unit. Multiple worksites may belong to one organization. Employee count must carry an as-of date and evidence reference. |
| `Contact` | `organization_id`, `name`, `title`, `email`, `phone`, `contact_type`, `verified_at` | Contact types include highest-ranking official, ETC, site contact, reviewer, consultant. |
| `WorksiteContact` | `worksite_id`, `contact_id`, `is_primary`, `effective_from`, `effective_to` | Historical contact changes must be preserved. |

### 4.2 Applicability and deadline entities

| Entity | Key fields | Rules |
|---|---|---|
| `ApplicabilityAssessment` | `worksite_id`, `assessment_year`, `employee_count`, `basin_result`, `threshold_result`, `subjectivity_status`, `assessed_by`, `assessment_version`, `review_status` | Stores facts and the resulting assessment. Never overwrite a prior assessment used in a package. |
| `SubjectivityNotice` | `worksite_id`, `notice_status`, `notice_date`, `received_date`, `notice_reference`, `submitted_by`, `document_id` | Tracks employer notice and agency receipt separately. |
| `ComplianceDeadline` | `worksite_id`, `deadline_type`, `due_date`, `status`, `source_rule_version`, `completed_at`, `evidence_id` | Types: notice, initial implementation/registration, annual registration, survey, review, internal approval. Due dates should be derived but editable only with reason and permission. |
| `ComplianceCycle` | `worksite_id`, `program_year`, `period_start`, `period_end`, `selected_option_id`, `status`, `package_id` | Lifecycle: `setup`, `collecting`, `calculating`, `internal_review`, `approved_for_filing`, `submitted`, `agency_response`, `closed`. |

### 4.3 Compliance option and methodology entities

| Entity | Key fields | Rules |
|---|---|---|
| `ComplianceOption` | `code`, `name`, `description`, `jurisdiction`, `active_from`, `active_to`, `requires_review` | Catalog of supported options. Start with the first option selected by the product owner and counsel; do not imply universal coverage. |
| `OptionRequirement` | `option_id`, `requirement_code`, `label`, `required`, `input_type`, `validation_schema`, `evidence_types` | Drives completeness checks and screen rendering. |
| `MethodologyVersion` | `jurisdiction`, `name`, `version_label`, `effective_from`, `effective_to`, `source_document_id`, `status` | Immutable after publication. Calculations reference an exact version. |
| `EmissionFactorTable` | `methodology_version_id`, `factor_code`, `vehicle_or_mode`, `unit`, `value`, `source_page`, `valid_from`, `valid_to` | Do not store only a single global factor. Factor units and applicability must be explicit. |
| `CalculationRule` | `methodology_version_id`, `option_id`, `rule_code`, `expression`, `input_schema`, `output_schema`, `rounding_rule` | Expressions must be versioned and testable. Avoid arbitrary client-provided formulas. |
| `AssumptionSet` | `cycle_id`, `name`, `assumptions_json`, `created_by`, `status`, `approved_by` | Every modeled result must point to an approved or pending assumption set. |

The official AQMD forms page identifies current Rule 2202 methodology and emission-factor documents, including 2026 materials. The engine should therefore treat methodologies and tables as **versioned source artifacts**, not constants embedded in frontend code. [2]

### 4.4 Evidence and source entities

| Entity | Key fields | Rules |
|---|---|---|
| `EvidenceRecord` | `worksite_id`, `cycle_id`, `evidence_type`, `title`, `classification`, `source_type`, `source_reference`, `period_start`, `period_end`, `status`, `owner_user_id` | Central evidence index. Evidence may support one or more requirements. |
| `Document` | `storage_key`, `filename`, `mime_type`, `sha256`, `uploaded_by`, `uploaded_at`, `retention_class`, `virus_scan_status` | Store immutable hash and metadata. Do not expose direct storage paths to unauthorized users. |
| `EvidenceDocument` | `evidence_id`, `document_id`, `page_range`, `extraction_status`, `extraction_notes` | Supports source citations inside the package. |
| `EvidenceReview` | `evidence_id`, `reviewer_id`, `decision`, `reason`, `reviewed_at` | Decisions: `accepted`, `accepted_with_note`, `needs_correction`, `rejected`. |
| `DataCollectionEvent` | `worksite_id`, `cycle_id`, `collection_type`, `started_at`, `ended_at`, `population`, `sample_size`, `response_count`, `instrument_version` | Supports surveys and imported commute data with collection context. |
| `DataQualityIssue` | `evidence_id`, `severity`, `issue_code`, `description`, `status`, `assigned_to`, `resolved_at` | Blocks package readiness where severity is blocking. |

### 4.5 Commute and Relay Rider evidence entities

| Entity | Key fields | Rules |
|---|---|---|
| `CommuteSurvey` | `worksite_id`, `cycle_id`, `survey_version`, `population_definition`, `launch_date`, `close_date`, `response_count`, `status` | Survey definition and response metrics must be separate from answers. |
| `CommuteObservation` | `survey_id`, `participant_hash`, `worksite_id`, `mode`, `days_per_week`, `one_way_miles`, `vehicle_occupancy`, `ev_or_hybrid_flag`, `source`, `consent_status` | Minimize personal data; use pseudonymous identifiers and retain only what the approved purpose requires. |
| `PlannedRoute` | `worksite_id`, `operator_profile_id`, `corridor_id`, `schedule`, `vehicle_type`, `capacity`, `status`, `verification_status` | A planned route is not automatically a completed trip or compliance event. |
| `ScheduledTrip` | `planned_route_id`, `service_date`, `departure_time`, `arrival_time`, `status`, `driver_id`, `vehicle_id` | Operational event for a specific date. |
| `Reservation` | `scheduled_trip_id`, `rider_id`, `reserved_at`, `status`, `check_in_status` | Reservation does not equal travel unless the program’s verification rule says so. |
| `TripVerification` | `scheduled_trip_id`, `verification_method`, `verified_at`, `verified_by`, `evidence_id`, `status` | Required before a trip can produce an approved participation event. |
| `ProgramParticipationEvent` | `cycle_id`, `worksite_id`, `source_type`, `source_id`, `event_type`, `event_date`, `participant_count`, `verified_status` | The bridge from Relay Rider activity to compliance evidence. Must include program rule and review state. |

### 4.6 Calculation, package, and audit entities

| Entity | Key fields | Rules |
|---|---|---|
| `CalculationRun` | `cycle_id`, `option_id`, `methodology_version_id`, `input_snapshot_hash`, `assumption_set_id`, `started_at`, `completed_at`, `status`, `run_by` | Immutable run metadata. A new input or methodology requires a new run. |
| `CalculationInput` | `run_id`, `input_code`, `value`, `unit`, `source_evidence_id`, `classification`, `validation_status` | Every material input has provenance. |
| `CalculationOutput` | `run_id`, `output_code`, `value`, `unit`, `precision`, `display_value`, `qualification_status` | Outputs distinguish calculated results from accepted compliance claims. |
| `Package` | `cycle_id`, `package_type`, `version`, `status`, `generated_at`, `generated_by`, `document_id` | Types: applicability brief, annual draft, evidence index, calculation workbook, review memo. |
| `PackageSection` | `package_id`, `section_code`, `title`, `content`, `status`, `source_refs` | Each section stores source references and review status. |
| `ReviewTask` | `cycle_id`, `package_id`, `task_type`, `assigned_to`, `status`, `due_at`, `decision`, `comment` | Tracks internal reviewer workflow. |
| `Approval` | `package_id`, `approval_type`, `approver_id`, `decision`, `statement`, `approved_at` | Explicitly says what was reviewed; no generic “compliant” button. |
| `SubmissionRecord` | `package_id`, `submitted_at`, `submitted_by`, `submission_channel`, `confirmation_reference`, `agency_status`, `agency_response_document_id` | Optional in MVP; manual entry only unless a verified filing integration exists. |
| `AuditEvent` | `organization_id`, `worksite_id`, `actor_id`, `event_type`, `entity_type`, `entity_id`, `before_hash`, `after_hash`, `occurred_at`, `metadata` | Append-only. Sensitive values should not be copied into logs unnecessarily. |

## 5. Status and state-transition rules

The system must use server-side transition rules. A client may request a transition, but the server decides whether it is allowed.

| Object | Allowed lifecycle |
|---|---|
| Evidence | `draft → submitted → under_review → accepted / accepted_with_note / needs_correction / rejected` |
| Calculation run | `queued → running → completed / failed / superseded` |
| Compliance cycle | `setup → collecting → calculating → internal_review → approved_for_filing → submitted → agency_response → closed` |
| Package | `draft → generated → under_review → approved_for_filing → superseded / archived` |
| Review task | `open → in_progress → blocked / complete` |
| Submission | `not_submitted → prepared → submitted → acknowledged / returned / accepted_recorded` |

The word **accepted** in the product must be scoped. `accepted` may mean accepted internally as evidence or accepted by AQMD only when a documented agency response is attached. The product must not infer agency acceptance from internal approval.

## 6. Screen specification

### 6.1 Organization and worksite setup

**Route:** `/compliance/worksites`

The worksite list shows employer, site address, employee count as of date, jurisdiction, current cycle, next deadline, package status, and evidence readiness. Filters include status, program year, assigned ETC, and overdue tasks.

**Route:** `/compliance/worksites/new`

The setup wizard captures legal employer identity, worksite address, employee count and source, South Coast AQMD jurisdiction assumption, highest-ranking official, site contact, ETC, and initial applicability assessment. The screen must show a visible message that the result is a preliminary assessment pending review.

**Validation:** employee count requires an as-of date and source. Address requires confirmation. A worksite cannot enter an active cycle without an organization owner and responsible contact.

### 6.2 Applicability and deadlines

**Route:** `/compliance/worksites/:worksiteId/applicability`

This screen presents the facts, rule threshold check, subjectivity-notice status, agency receipt date, calculated 90-day implementation/registration deadline, annual registration anniversary, and unresolved questions. Every date displays its source and whether it is system-derived or manually confirmed.

Primary actions are **Edit facts**, **Upload notice**, **Confirm agency receipt**, **Create compliance cycle**, and **Open review task**. The system should never present “Compliant” based only on employee count.

### 6.3 Compliance cycle overview

**Route:** `/compliance/cycles/:cycleId`

The cycle dashboard is the main operating screen. It contains a status header, reporting period, selected option, methodology version, readiness score, deadline panel, reviewer assignment, and a sequence of work areas:

| Work area | Displays |
|---|---|
| Applicability | Current assessment, supporting evidence, unresolved questions |
| Program | Selected option, ETC, program rules, active dates |
| Evidence | Required, received, accepted, missing, stale, rejected |
| Calculations | Latest run, inputs, assumptions, outputs, warnings |
| Review | Open tasks, comments, decisions, approvals |
| Package | Draft files, evidence index, version history, export actions |
| Filing record | Manual submission details and agency response, if any |

The dashboard must show a **readiness state**, not a compliance claim. Suggested states are `Not started`, `Evidence collection`, `Calculation ready`, `Review required`, `Ready for responsible-official review`, and `Package archived`.

### 6.4 Evidence vault

**Route:** `/compliance/cycles/:cycleId/evidence`

The evidence vault provides a table and upload flow. Columns include evidence type, title, period, classification, source, owner, review status, linked requirement, and last updated. Users can upload documents, enter structured data, link evidence to requirements, request review, and resolve quality issues.

The detail drawer shows the source document, extracted metadata, page references, linked calculations, reviewer comments, and audit history. The interface must keep **self-reported**, **modeled**, and **verified** labels visually distinct.

### 6.5 Commute survey and data intake

**Route:** `/compliance/cycles/:cycleId/commute-data`

This screen supports survey setup, CSV/XLSX import, participant-count reconciliation, commute-mode normalization, distance and occupancy fields, EV/hybrid flags, collection dates, and data-quality exceptions. It must support an aggregate-only mode so the employer does not need to upload unnecessary personal data.

The import preview must show row counts, invalid rows, missing fields, duplicate keys, out-of-period records, and inferred units before the data is committed. Imported data remains `Imported` or `Self-reported` until reviewed.

### 6.6 Relay Rider program evidence

**Route:** `/compliance/cycles/:cycleId/relay-rider`

This screen connects approved Relay Rider program activity to the compliance cycle. It shows route templates, scheduled trips, reservations, verified completions, participant counts, EV/hybrid participation, Access Point records, and program-period coverage.

The screen must explicitly distinguish:

> **App activity is not automatically compliance evidence.** Only activity linked to an approved program rule, within the reporting period, with a defined verification method and reviewer decision, may be included in a draft package.

### 6.7 Methodology and calculations

**Route:** `/compliance/cycles/:cycleId/calculations`

The calculations screen shows the selected compliance option, methodology version, factor table version, input snapshot, assumption set, formula steps, warnings, outputs, and run history. Users can create a new run only after changing inputs or assumptions; prior runs remain immutable.

The screen must provide an **explain calculation** view that answers: which inputs were used, where each input came from, what units were used, which factor/version applied, how rounding occurred, and which evidence items support the result.

No calculation output should be labeled “emission reduction credit,” “vehicle trip emission credit,” “compliance credit,” or similar unless the terminology is explicitly supported by the selected methodology and reviewed for that package.

### 6.8 Review center

**Route:** `/compliance/review`

The review center aggregates evidence decisions, calculation warnings, missing requirements, contradictory values, overdue tasks, and package sections requiring approval. Reviewers can assign tasks, request corrections, leave comments, accept evidence with a note, reject evidence, and approve a package for responsible-official review.

Required review gates:

1. Applicability facts reviewed.
2. Worksite and reporting period confirmed.
3. Selected option and methodology version confirmed.
4. Required evidence accepted or explicitly marked not applicable with reason.
5. Calculation run reproducible and warnings resolved.
6. Package sections reviewed.
7. Responsible official or authorized reviewer approval recorded.

### 6.9 Package builder

**Route:** `/compliance/cycles/:cycleId/package`

The package builder presents a document outline, evidence coverage, calculation summary, unresolved warnings, reviewer comments, and version history. It generates a draft package containing:

| Output | Contents |
|---|---|
| Applicability brief | Worksite facts, threshold assessment, notice/receipt timeline, review state |
| Annual compliance draft | Selected option, reporting period, required fields, structured answers, disclosed assumptions |
| Evidence index | Evidence ID, source, period, classification, reviewer, linked requirement, page reference |
| Calculation workbook | Inputs, units, methodology/factor versions, formulas, outputs, warnings |
| Review memo | Open issues, decisions, approvals, exclusions, and responsible-official sign-off block |
| Data appendix | Aggregated commute/program data used in the calculation, subject to privacy rules |

Exported packages must contain a prominent **Draft — human review required** label until the responsible-official approval state is recorded.

### 6.10 Submission and agency response

**Route:** `/compliance/cycles/:cycleId/filing`

The filing screen is a manual recordkeeping surface for the MVP. It allows an authorized user to record submission date, channel, confirmation/reference number, submitted package version, follow-up date, agency correspondence, and agency response status.

There should be no “Submit to AQMD” button in the MVP unless a separately approved integration exists. The available action is **Mark as submitted manually**, which requires a confirmation reference or explanatory note.

### 6.11 Admin and methodology management

**Route:** `/admin/methodologies`

Restricted administrators can upload and publish methodology documents, factor tables, option requirements, validation rules, and effective dates. Published versions are immutable. Replacing a factor requires a new version and migration/impact review.

**Route:** `/admin/audit-log`

Restricted administrators can search append-only events by organization, worksite, actor, cycle, entity, event type, and date. Sensitive values should be redacted or access-controlled.

## 7. Recommended API surface

The API should be resource-oriented but should not expose unrestricted generic model mutation. Use explicit endpoints and server-side permissions.

| Endpoint | Purpose |
|---|---|
| `GET /api/worksites` | List only worksites visible to the authenticated organization/user |
| `POST /api/worksites` | Create a worksite with applicability facts |
| `GET /api/worksites/{id}/applicability` | Retrieve current and historical assessments |
| `POST /api/worksites/{id}/assessments` | Create a new assessment version |
| `POST /api/worksites/{id}/subjectivity-notice` | Record notice and agency receipt metadata |
| `GET /api/cycles/{id}` | Retrieve cycle dashboard data |
| `POST /api/cycles/{id}/evidence` | Create evidence metadata and upload session |
| `POST /api/evidence/{id}/submit-review` | Submit evidence for review |
| `POST /api/evidence/{id}/decision` | Authorized reviewer decision with reason |
| `POST /api/cycles/{id}/calculations` | Queue an immutable calculation run |
| `GET /api/calculations/{id}/explain` | Return inputs, formulas, sources, and outputs |
| `POST /api/cycles/{id}/package` | Generate a versioned draft package |
| `POST /api/packages/{id}/review` | Record package review decision |
| `POST /api/packages/{id}/manual-submission` | Record external submission metadata |
| `GET /api/cycles/{id}/audit-events` | Authorized audit history |

Every write endpoint needs organization scoping, role checks, request validation, idempotency where creation can be retried, and an audit event. Avoid `ModelViewSet` exposure for the compliance domain.

## 8. Privacy and security requirements

The compliance engine will handle employee counts, commute patterns, contact information, documents, and potentially sensitive location or schedule data. The MVP should use least-privilege access, organization isolation, encrypted storage, signed download URLs, malware scanning, retention rules, and audit logging.

The commuter evidence bridge should default to aggregate data. Participant-level records should be linked only when necessary, pseudonymized where practical, and retained according to a documented program purpose. The product should not expose home addresses or detailed trip histories in an employer report unless the approved purpose requires it.

Production requirements include authenticated API access, explicit role permissions, CSRF/token protection appropriate to the deployment, secure cookies, HTTPS, environment-managed secrets, PostgreSQL or another managed database, backups, restore tests, rate limiting, and security monitoring. These requirements are especially important because the current `relay-rider-beta-001` backend is a local research scaffold with permissive `AllowAny` permissions and broad generic viewsets.

## 9. MVP implementation sequence

| Release | Scope | Success gate |
|---:|---|---|
| 0 | Rename product surfaces around compliance workspace; preserve research-beta labels | Users can distinguish evidence, estimates, and compliance status |
| 1 | Worksite, contacts, applicability assessment, deadlines, cycles | A reviewer can create and track a worksite through an annual cycle |
| 2 | Evidence vault, document metadata, review tasks, audit events | Every required input has provenance and a review state |
| 3 | One selected compliance option, methodology versioning, calculation runs | A calculation is reproducible from an immutable input snapshot |
| 4 | Package builder, evidence index, calculation workbook, review memo | A human reviewer can export a complete draft package |
| 5 | Relay Rider evidence bridge, aggregate commute/program activity | Approved program activity can be linked to a cycle without automatic compliance claims |
| 6 | Pilot hardening, authorization tests, backups, retention, QA | Staging pilot passes access, privacy, calculation, and restore tests |

## 10. Acceptance criteria for the first build

The first implementation is ready for internal review when an authorized user can create a Pasadena worksite, enter employee count and source evidence, record notice and receipt dates, open a reporting cycle, select the supported compliance option, upload evidence, assign review tasks, resolve data-quality issues, run a versioned calculation, inspect every input and formula, generate a draft package, approve or reject sections, and record a manual submission reference.

The system must block package generation when required evidence is missing, the methodology is unpublished or expired, calculation warnings are unresolved, or the reporting period is incomplete. It must allow a reviewer to see why a result was included and what evidence supports it. It must never display internal approval as AQMD acceptance.

## 11. Source and implementation references

[1]: https://www.aqmd.gov/home/programs/business/business-detail?title=rule-2202-on-road-motor-vehicle-mitigation-options "South Coast AQMD Rule 2202 overview"
[2]: https://www.aqmd.gov/home/programs/business/r2202-forms-guidelines "South Coast AQMD Rule 2202 forms, rule, guidelines, and fees"
[3]: https://github.com/griswoldwonders/relay-mock-v3 "Relay Rider institutional and Rule 2202 prototype"
[4]: https://github.com/griswoldwonders/relay-rider-beta-001 "Relay Rider research-beta commuter and Green Wallet prototype"

The existing institutional prototype is the strongest UI foundation for the compliance workspace because it already contains Rule 2202, TDM, evidence, provenance, and operations concepts. The existing commuter beta should remain the participant-facing source of approved program activity, subject to a new protected shared API contract.
