# Relay Rider Rule 2202 ETC Dashboard
## Screen Specification — Pasadena MVP

**Version:** 0.1  
**Date:** August 27, 2026  
**Primary user:** Employee Transportation Coordinator (ETC)  
**Initial jurisdiction:** South Coast AQMD / Pasadena  
**Primary outcome:** Help the ETC collect, validate, review, and package worksite commute-program evidence for human-reviewed Rule 2202 reporting.

> **Product boundary:** The ETC dashboard is a compliance-workflow and evidence-management interface. It does not independently certify compliance, guarantee emission reductions, submit a filing automatically, or replace review by the responsible official, environmental professional, transportation consultant, or qualified counsel.

## 1. ETC job to be done

The ETC needs one reliable place to answer five questions:

1. **What must be done next?**
2. **What evidence has been collected, and can it be trusted?**
3. **What commute-program activity is occurring at the worksite?**
4. **What calculations and assumptions will appear in the draft package?**
5. **What still requires review or approval before the employer can file?**

South Coast AQMD’s official Rule 2202 overview states that employers in the South Coast Air Basin with 250 or more employees at a worksite must notify AQMD of subjectivity, implement a compliance option after the notice process, and provide annual registration thereafter. AQMD’s official forms and guidelines page identifies compliance forms, survey forms, implementation guidance, AVR guidance, and current emission-factor methodology and tables. [1] [2]

The ETC dashboard should therefore behave less like a generic analytics dashboard and more like a **deadline-aware case workspace**. It should prioritize unresolved work, evidence quality, and package readiness over decorative metrics.

## 2. Dashboard design principles

| Principle | Interface implication |
|---|---|
| Action before analytics | The first viewport shows deadlines, blockers, and assigned tasks before charts. |
| Evidence before claims | Every material number links to a source, period, classification, and review state. |
| Readiness instead of compliance | Use “Ready for review” or “Evidence incomplete,” never an unexplained “Compliant” badge. |
| Human review is central | Review tasks and approvals are first-class objects, not a final modal. |
| One worksite at a time | Avoid mixing evidence across worksites unless the user explicitly enters a multi-site view. |
| Clear data status | Verified, self-reported, imported, modeled, rejected, and missing states remain visibly distinct. |
| Progressive disclosure | Show the decision-relevant summary first; expose calculation and provenance details on demand. |
| Safe defaults | Prevent unsupported calculations, silent assumptions, accidental submission, and broad data exposure. |
| Pasadena-first, extensible later | Initial copy and jurisdiction defaults are South Coast AQMD/Pasadena, but entities and methodology references are jurisdiction-aware. |

## 3. Users and permissions

The dashboard is designed for the ETC, but it must make role boundaries visible.

| Role | Dashboard access | Key permissions |
|---|---|---|
| ETC | Full operational workspace for assigned worksites | Collect evidence, manage surveys, create tasks, review assigned evidence, prepare draft package |
| Analyst | Assigned data and calculation workspace | Import/clean data, run calculations, resolve data-quality issues; cannot approve final package unless separately authorized |
| Responsible official | Review and approval workspace | Review applicability, approve package for filing, record sign-off |
| Consultant | Scoped project access | Assist with evidence and calculations for assigned worksites; no unrestricted organization access |
| Read-only stakeholder | Summary and package access | View approved or shared records only |
| System administrator | Configuration and audit access | Manage users, methodology versions, form templates, and system policy; cannot silently edit historical package data |

The dashboard header must display the active organization, worksite, user role, and access scope. If a user has multiple worksites, the worksite selector must make the active scope unmistakable.

## 4. Navigation model

**Primary route:** `/etc`

**Worksite-scoped route:** `/etc/worksites/:worksiteId`

| Navigation item | Route | Purpose |
|---|---|---|
| Overview | `/etc/worksites/:worksiteId` | Deadline, readiness, tasks, blockers, and cycle summary |
| Applicability | `/etc/worksites/:worksiteId/applicability` | Employee count, jurisdiction, notice, dates, and preliminary assessment |
| Evidence | `/etc/worksites/:worksiteId/evidence` | Evidence register, document upload, provenance, and review status |
| Commute Data | `/etc/worksites/:worksiteId/commute-data` | Survey setup, imports, quality checks, and aggregate commute metrics |
| Program Activity | `/etc/worksites/:worksiteId/program-activity` | Relay Rider, carpool, EV, transit, and other approved activity records |
| Calculations | `/etc/worksites/:worksiteId/calculations` | Methodology, factors, assumptions, calculation runs, and explanations |
| Review Queue | `/etc/worksites/:worksiteId/review` | Evidence, quality, calculation, and package review tasks |
| Draft Package | `/etc/worksites/:worksiteId/package` | Draft report, evidence index, calculation workbook, and review memo |
| Filing Record | `/etc/worksites/:worksiteId/filing` | Manual submission and agency-response tracking |
| Contacts and Team | `/etc/worksites/:worksiteId/team` | ETC, responsible official, site contact, reviewers, and permissions |
| Settings | `/etc/worksites/:worksiteId/settings` | Program year, notification rules, privacy, data retention, and integrations |

Global actions should include **Switch worksite**, **Add evidence**, **Create task**, **Invite reviewer**, **Export current view**, and **Help / methodology reference**.

## 5. Screen 1 — ETC Overview

**Route:** `/etc/worksites/:worksiteId`

### 5.1 Purpose

The overview gives the ETC an immediate operating picture for one worksite and one active compliance cycle. It answers what is due, what is blocked, what changed, and which action should happen next.

### 5.2 Header

The header contains:

| Element | Behavior |
|---|---|
| Organization name | Link to organization switcher |
| Worksite name and city | Shows active worksite; city should display Pasadena where applicable |
| Active cycle | Program year and reporting period |
| Role badge | Displays ETC, analyst, responsible official, or other role |
| Readiness label | `Not started`, `Collecting evidence`, `Calculation ready`, `Review required`, or `Ready for responsible-official review` |
| Last synchronized | Timestamp and data source status |
| More actions | Export summary, invite reviewer, view audit history |

The readiness label must include a tooltip explaining that it is an internal workflow state and not an agency determination.

### 5.3 First viewport layout

The first viewport is organized into four horizontal regions.

#### Region A — Deadline banner

A deadline banner shows the next due item, due date, source, and status. Examples include subjectivity notice, initial registration/implementation, annual registration, survey close, internal review, and responsible-official approval.

The banner must support:

- `Due in X days` for future dates.
- `Overdue by X days` for overdue tasks.
- `Date requires confirmation` when the source date is missing or inconsistent.
- `No deadline calculated` when the necessary agency receipt or program date is absent.

The system must not calculate a 90-day deadline from an unverified notice date without labeling the result as provisional.

#### Region B — Readiness summary

Display five compact cards:

| Card | Example content | Drill-down |
|---|---|---|
| Evidence received | `42 of 56 required items` | Evidence filtered to required items |
| Evidence accepted | `31 accepted` | Accepted evidence list |
| Blocking issues | `4 open` | Review queue filtered to blocking |
| Calculation status | `Latest run needs review` | Calculation explanation |
| Package status | `Draft not generated` | Package builder |

Numbers must be derived from current cycle records and must expose their underlying list when clicked.

#### Region C — Next actions

The next-actions panel contains no more than five prioritized tasks. Each task includes owner, deadline, reason, and one primary action.

Examples:

- Confirm employee count source.
- Upload agency receipt for subjectivity notice.
- Review 12 survey records with missing commute mode.
- Resolve conflicting worksite address across two source documents.
- Assign responsible official to package review.

Tasks should be grouped into **Blocking**, **Due soon**, and **Recommended**. The ETC can reassign a task only within permitted organization scope.

#### Region D — Activity and change feed

The activity feed shows recent evidence uploads, review decisions, calculation runs, package versions, comments, and manual filing records. Each event includes actor, time, object, and link. Sensitive employee-level data should not appear in the feed body.

### 5.4 Secondary dashboard modules

Below the first viewport:

| Module | Content |
|---|---|
| Reporting-period coverage | Timeline showing collection and reporting periods, with missing intervals highlighted |
| Evidence composition | Counts by verified, self-reported, imported, modeled, rejected, and missing |
| Open questions | Unresolved decisions requiring ETC or responsible-official input |
| Program participation snapshot | Aggregate Relay Rider/carpool/transit/EV activity linked to the cycle, with evidence status |
| Methodology notice | Current methodology and emission-factor version, effective date, and source link |
| Package preview | List of generated sections and review status |

### 5.5 Empty, loading, and error states

| State | UI behavior |
|---|---|
| No active cycle | Explain what a cycle is and offer `Create compliance cycle` |
| No evidence | Show guided checklist rather than an empty table |
| API unavailable | State that data could not be refreshed; never show stale values as current without a timestamp |
| Permission denied | Explain the user’s scope and provide a request-access action if permitted |
| Stale methodology | Block new calculations and direct the user to methodology administration |

## 6. Screen 2 — Applicability and deadlines

**Route:** `/etc/worksites/:worksiteId/applicability`

This screen captures the facts needed for a preliminary applicability assessment and manages the timeline.

### 6.1 Sections

1. **Worksite identity:** legal organization, worksite name, full address, jurisdiction, and source.
2. **Employee count:** count, as-of date, population definition, source document, classification, and reviewer.
3. **Basin and threshold assessment:** system-derived result with expandable reasoning.
4. **Subjectivity notice:** notice date, agency received date, reference, document, and status.
5. **Implementation/registration timeline:** derived dates, annual anniversary, and confirmation state.
6. **Open applicability questions:** missing or contradictory inputs.

### 6.2 Important copy

> **Preliminary assessment:** This screen organizes the facts used for an internal Rule 2202 applicability review. It is not a legal opinion or agency determination.

### 6.3 Actions

`Edit facts`, `Upload source`, `Create assessment version`, `Confirm agency receipt`, `Add review task`, and `View assessment history`.

The ETC may enter facts and upload records. Only an authorized reviewer may mark the assessment as internally reviewed.

## 7. Screen 3 — Evidence workspace

**Route:** `/etc/worksites/:worksiteId/evidence`

The evidence workspace is the ETC’s primary daily work surface.

### 7.1 Evidence table

| Column | Description |
|---|---|
| Requirement | Requirement or package section supported |
| Evidence title | Human-readable name |
| Type | Survey, employee count, notice, commute record, program activity, contact, methodology, or other |
| Reporting period | Start and end dates |
| Classification | Verified, self-reported, imported, modeled, rejected, or missing |
| Review status | Draft, submitted, under review, accepted, correction required, rejected |
| Owner | ETC, analyst, consultant, or other |
| Last updated | Timestamp |
| Issue count | Open data-quality issues |

Filters include requirement, type, period, classification, status, owner, and blocking status.

### 7.2 Upload flow

The upload dialog requires title, evidence type, worksite, cycle, period, source type, source reference, and owner. It supports document upload and structured-entry evidence. The user must acknowledge whether the value is self-reported or modeled.

After upload, the system performs file-type validation, malware scanning, hash generation, metadata extraction, duplicate detection, and requirement-link suggestions. It does not automatically mark evidence verified.

### 7.3 Evidence detail drawer

The detail drawer shows the source document or structured record, extracted metadata, evidence classification, linked requirements, linked calculation inputs, review history, comments, quality issues, and audit events.

The primary actions are `Submit for review`, `Request correction`, `Accept with note`, `Reject`, and `Create task`. The ETC may not delete evidence used by a calculation or package; it may supersede it with a reason.

## 8. Screen 4 — Commute data and survey workspace

**Route:** `/etc/worksites/:worksiteId/commute-data`

This screen handles aggregate commute-data collection and normalization.

### 8.1 Tabs

| Tab | Purpose |
|---|---|
| Survey setup | Define population, period, questions, collection channel, and instrument version |
| Responses | Show aggregate response counts and quality status |
| Imports | Upload CSV/XLSX data and preview validation results |
| Normalization | Map raw modes and units to approved categories |
| Quality issues | Resolve missing, duplicate, inconsistent, or out-of-period records |
| Export | Produce a reviewed aggregate data appendix |

### 8.2 Import preview requirements

Before committing an import, show total rows, accepted rows, rejected rows, duplicate rows, missing required fields, invalid units, out-of-period records, and personally identifiable fields detected. The user must explicitly confirm the import.

The MVP should support an aggregate-only workflow. Participant-level data should not be required when aggregate counts and approved calculation inputs are sufficient.

## 9. Screen 5 — Program activity workspace

**Route:** `/etc/worksites/:worksiteId/program-activity`

This screen connects employer-sponsored commute activity, including Relay Rider, to the active cycle.

### 9.1 Activity categories

- Relay Rider planned-route participation.
- Verified scheduled carpool trips.
- EV/hybrid participation.
- Transit participation.
- Employer shuttle or Access Point activity.
- Other approved program activity.

### 9.2 Activity table

Display activity source, event period, participant/vehicle aggregation level, verification method, linked program rule, classification, inclusion status, and reviewer status.

The screen must include this warning:

> **Program activity is not automatically compliance evidence.** Activity is eligible for package inclusion only when linked to an approved program rule, reporting period, verification method, and review decision.

### 9.3 Inclusion workflow

The ETC selects activity and chooses `Propose for package`, which creates an evidence review task. A reviewer confirms period, population, verification, and program-rule linkage. Only accepted activity can be selected by a calculation run.

## 10. Screen 6 — Calculations and methodology

**Route:** `/etc/worksites/:worksiteId/calculations`

The calculations screen is designed for transparency rather than spreadsheet replacement alone.

### 10.1 Header

Show compliance option, methodology version, emission-factor table version, reporting period, latest calculation run, run status, and reviewer status.

### 10.2 Input matrix

| Input field | Required metadata |
|---|---|
| Value | Numeric or categorical value |
| Unit | Explicit unit and allowed-unit validation |
| Source | Evidence record and document reference |
| Classification | Verified, self-reported, imported, or modeled |
| Period | Start/end or as-of date |
| Assumption | Assumption-set reference if modeled |
| Reviewer | Review status and decision |

### 10.3 Calculation explanation

The explanation view must show:

1. Methodology and factor versions.
2. Immutable input snapshot identifier.
3. Each input and source evidence.
4. Formula or calculation step.
5. Unit conversion.
6. Rounding and precision rules.
7. Warnings and exclusions.
8. Output values and qualification status.
9. Comparison with prior run, if available.

A calculation can be `completed` while still being `needs review`. Completion means the engine ran; it does not mean the result is approved for a package.

## 11. Screen 7 — ETC review queue

**Route:** `/etc/worksites/:worksiteId/review`

The review queue groups work by decision rather than by database object.

### 11.1 Queue sections

| Section | Examples |
|---|---|
| Blocking evidence | Missing employee-count source, unreviewed notice, rejected survey evidence |
| Data quality | Duplicate records, inconsistent counts, invalid distances, stale dates |
| Calculation review | Unsupported assumption, factor mismatch, unresolved warning |
| Package review | Section missing source, output not reconciled, required statement incomplete |
| Approvals | ETC review, analyst review, responsible-official approval |
| Follow-up | Agency response, correction request, annual renewal |

### 11.2 Task detail

Every task includes description, source record, reason it matters, owner, due date, priority, comments, attachments, decision, and audit history. The ETC should be able to resolve a task without losing context.

### 11.3 Review actions

`Accept`, `Accept with note`, `Request correction`, `Reject`, `Mark not applicable with reason`, and `Reassign`. `Mark not applicable` requires a reason and reviewer identity.

## 12. Screen 8 — Draft package builder

**Route:** `/etc/worksites/:worksiteId/package`

The package builder is the dashboard’s primary deliverable surface.

### 12.1 Package outline

| Section | Required state |
|---|---|
| Worksite and organization | Complete, source-linked |
| Applicability assessment | Reviewed or explicitly pending |
| Subjectivity notice timeline | Source-linked |
| Selected compliance option | Selected and methodology-linked |
| Required program evidence | Accepted, not applicable with reason, or blocking |
| Commute/survey inputs | Period and quality status shown |
| Calculation summary | Run-linked and warning status shown |
| Evidence index | Generated from linked evidence |
| Review memo | Open issues, exclusions, and decisions |
| Responsible-official review | Pending, approved, or returned |

### 12.2 Readiness gate

The package builder calculates readiness from explicit rules. It must block package export as “ready for responsible-official review” if required evidence is missing, the methodology is unavailable, calculations have unresolved blocking warnings, or the package has no assigned reviewer.

The system may still allow a **working draft export** with a prominent watermark:

> **DRAFT — HUMAN REVIEW REQUIRED — NOT AN AQMD ACCEPTANCE OR COMPLIANCE CERTIFICATION**

### 12.3 Exported outputs

The ETC can generate a draft annual package, evidence index, calculation workbook, review memo, and data appendix. Each output includes package version, generated timestamp, methodology version, and source references.

## 13. Screen 9 — Filing record

**Route:** `/etc/worksites/:worksiteId/filing`

The MVP should support manual recordkeeping rather than automated AQMD submission.

Fields include package version, submitted date, submitting person, submission channel, confirmation/reference number, agency follow-up date, correspondence, and agency response status.

The action should be labeled **Record external submission**, not **Submit to AQMD**, unless a separate approved integration exists.

## 14. Notifications and task automation

The ETC dashboard should generate notifications from deadlines and workflow events.

| Trigger | Notification |
|---|---|
| Deadline approaching | ETC and assigned owner receive reminder |
| Evidence submitted | Reviewer receives task |
| Evidence rejected | Owner receives correction request |
| Calculation completed | Assigned reviewer receives review task |
| Package blocked | ETC sees blocker and reason |
| Responsible-official review ready | Responsible official receives approval request |
| Agency response due | ETC receives follow-up reminder |
| Annual cycle approaching | Organization owner receives renewal prompt |

Notifications must never state that the employer is compliant. Use operational language such as “review due,” “package incomplete,” or “draft ready for review.”

## 15. Data model dependencies

The dashboard depends on the following entities from the shared compliance model:

`Organization`, `OrganizationUser`, `Worksite`, `Contact`, `ApplicabilityAssessment`, `SubjectivityNotice`, `ComplianceDeadline`, `ComplianceCycle`, `ComplianceOption`, `OptionRequirement`, `MethodologyVersion`, `EmissionFactorTable`, `EvidenceRecord`, `Document`, `EvidenceReview`, `DataCollectionEvent`, `DataQualityIssue`, `CommuteSurvey`, `CommuteObservation`, `ProgramParticipationEvent`, `CalculationRun`, `CalculationInput`, `CalculationOutput`, `Package`, `PackageSection`, `ReviewTask`, `Approval`, `SubmissionRecord`, and `AuditEvent`.

No dashboard metric should be implemented as an isolated frontend constant. It should resolve from these entities or be labeled as a static product instruction.

## 16. Accessibility and responsive behavior

The ETC workspace is an administrative application and should support desktop-first use while remaining usable on tablets.

Required behavior includes keyboard navigation, visible focus states, semantic headings, accessible table alternatives, non-color status labels, screen-reader announcements for upload and calculation states, readable error messages, sufficient contrast, and no essential action hidden only behind hover.

On narrow screens, data tables should become stacked record cards with a persistent filter button. The deadline banner and blocker count must remain visible near the top. Package review should support a focused single-section view.

## 17. Acceptance criteria

The ETC dashboard is ready for internal product review when an authorized ETC can:

1. Select one Pasadena worksite and active reporting cycle.
2. See the next deadline, source, owner, and readiness state.
3. Enter and version employee-count and applicability facts.
4. Upload and classify evidence with reporting periods and provenance.
5. Create a commute survey or import aggregate data with validation preview.
6. View and resolve data-quality issues.
7. Link approved Relay Rider activity to a compliance cycle without automatically treating it as compliance evidence.
8. See methodology and emission-factor versions for a calculation.
9. Inspect every calculation input, formula step, source, assumption, and warning.
10. Assign and complete review tasks.
11. Generate a draft package with evidence index and calculation workbook.
12. See why the package is blocked or ready for responsible-official review.
13. Record a manual external submission and agency response.
14. View the audit history for material changes and decisions.
15. Never see an unsupported or automatic “compliant” claim.

## 18. Suggested implementation order

| Sprint | ETC dashboard scope |
|---:|---|
| 1 | Shell, organization/worksite selector, roles, overview, deadlines, and cycle status |
| 2 | Applicability screen, employee-count evidence, contacts, subjectivity notice, and deadline rules |
| 3 | Evidence vault, document metadata, classification, upload, review tasks, and audit events |
| 4 | Commute data import, survey workflow, aggregate normalization, and quality issues |
| 5 | Program activity bridge for Relay Rider and approved commute-program evidence |
| 6 | Methodology/calculation explanation and versioned calculation runs |
| 7 | Package builder, evidence index, calculation workbook, and review memo |
| 8 | Filing record, notifications, authorization tests, accessibility QA, and staging pilot |

## References

[1]: https://www.aqmd.gov/home/programs/business/business-detail?title=rule-2202-on-road-motor-vehicle-mitigation-options "South Coast AQMD Rule 2202 overview"
[2]: https://www.aqmd.gov/home/programs/business/r2202-forms-guidelines "South Coast AQMD Rule 2202 forms, rule, guidelines, and fees"
[3]: https://github.com/griswoldwonders/relay-mock-v3 "Relay Rider institutional and Rule 2202 prototype"
[4]: https://github.com/griswoldwonders/relay-rider-beta-001 "Relay Rider research-beta commuter and Green Wallet prototype"
