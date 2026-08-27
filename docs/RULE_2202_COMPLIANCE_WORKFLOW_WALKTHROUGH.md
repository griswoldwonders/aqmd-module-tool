# Rule 2202 Compliance Workflow Walkthrough

## 1. Apply the Supabase Migration

From the repository root:

```bash
cd "C:\Users\cultc\Documents\Common Pathways Technologies\repositories\relay-mock-v3"
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies:

`supabase/migrations/20260906120000_rule2202_compliance_grade_model.sql`

The migration adds:

- Six-month population evidence
- Survey records
- ZIP/VMT records
- Methodology versions
- Reviews
- Audit events
- Package approval and filing fields

Keep Supabase credentials out of source control and out of the browser bundle.

## 2. Start the App

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) and navigate to **Rule 2202**.

## 3. Connect the Institutional Workspace

In **Secure institutional persistence**:

1. Sign in with an authorized Supabase user.
2. Select the organization.
3. Select the regulated worksite.
4. Choose or create the reporting year.

All writes require authenticated tenant permissions.

## 4. Complete the Worksite Profile

Under **Worksite & reporting year**, enter:

- Business classification
- ETC/site contact
- ETC email
- Annual due date

Save the profile.

This establishes the annual reporting record, but does not establish compliance by itself.

## 5. Enter Applicability Evidence

Under **Employee reporting population**, enter:

- Total employees
- Peak-window employees
- Source label
- Source as-of date
- Six monthly employee counts

Example:

```text
300, 310, 290, 305, 295, 300
```

The system calculates:

- Six-month average
- Minimum
- Maximum
- Applicability status

Possible results:

- `applicable`: average meets the threshold
- `exempt`: average is below the threshold
- `needs_review`: missing six-month evidence or provenance

The source must be confirmed before the population is considered ready.

## 6. Select the VMT Pathway

Choose one:

- **AVR survey pathway**
- **Anonymized ZIP pathway**

The selection is stored on the reporting-year record and controls which evidence and calculations are required.

## 7. Validate Commute Evidence

The validation layer checks for:

- Missing participant identity
- Missing commute mode
- Missing distance
- Invalid occupancy
- Duplicate records
- Invalid dates
- Remote/on-site conflicts
- Invalid ZIP or distance inputs

Open blocking issues prevent package readiness.

## 8. Calculate Metrics

The calculation layer supports:

- AVR
- Survey-based weekly VMT
- ZIP-based weekly VMT

Each result retains:

- Methodology version
- Input record count
- Excluded record count
- Calculation payload
- Input snapshot
- Source record IDs

The persistence adapter is in `src/rule2202ComplianceService.ts`.

## 9. Create the Review Package

In **Compliance-package readiness**:

1. Confirm all readiness checks are complete.
2. Select **Create versioned review package**.
3. The system stores a package version and source snapshot.
4. Select **Download AQMD export** to download the annual compliance JSON.

The export includes:

- Worksite information
- Applicability evidence
- Selected pathway
- AVR/VMT results
- Validation issues
- Package status
- Review and filing metadata

This is an AQMD-oriented working export, not proof of AQMD submission or acceptance.

## 10. Approve the Package

Once the package exists:

1. Enter an approval note.
2. Select **Approve for filing**.

The system stores:

- Reviewer identity
- Review timestamp
- Approval note
- Package status of `reviewed`

This is employer or administrator approval. It is not AQMD approval.

## 11. Record the Filing

After the employer submits materials to AQMD:

1. Enter the AQMD receipt, confirmation, or filing reference.
2. Select **Record filing reference**.

The system stores:

- Filing timestamp
- Filing reference
- Package status of `filed`

The app does not infer that AQMD accepted the filing.

## 12. Preserve the Audit Trail

The migration adds immutable audit-event storage for:

- Created records
- Updated records
- Approval
- Filing
- Supersession
- Export

Packages can also retain:

- Export hash
- Retention date
- Superseding package reference

## Operating Sequence

```text
Applicability evidence
    -> pathway selection
    -> source data
    -> validation
    -> deterministic calculations
    -> versioned package
    -> employer review
    -> AQMD filing
    -> filing reference
```

This is the difference between a dashboard and a defensible Rule 2202 compliance operations tool.

## Important Boundary

The system supports preparation, evidence management, calculation, review, and filing-history tracking. South Coast AQMD remains the regulator, and the employer remains responsible for the accuracy and submission of its compliance materials.
