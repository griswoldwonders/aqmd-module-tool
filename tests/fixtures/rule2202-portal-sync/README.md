# Rule 2202 Portal Sync Integration Tests

This package contains a framework-neutral TypeScript contract suite and mock payloads for the Relay Rider Rule 2202 reporting-portal integration boundary.

## Contents

| File | Purpose |
|---|---|
| `relay-rule2202-portal-sync.e2e.spec.ts` | Vitest-compatible end-to-end contract suite with portal-export and authorized-adapter mocks |
| `01-aggregate-survey-submission.json` | Aggregate-first commute survey submission payload |
| `02-error-payloads.json` | Validation, privacy, idempotency, and facility mismatch errors |
| `03-projection-and-agency-payloads.json` | Reporting projection, generated artifacts, receipt, and status payloads |

## Running the suite

Copy the TypeScript file into the application test tree, install Vitest and TypeScript test support if the repository does not already provide them, then run:

```bash
npx vitest run tests/integration/rule2202-portal-sync.e2e.spec.ts
```

The suite can also be adapted to Playwright or the repository’s existing integration-test runner. The adapter mock is intentionally in-process so the tests do not call a real agency endpoint.

## Test coverage

The suite covers:

- Portal-ready projection generation from accepted evidence.
- Blocking export when evidence is pending or rejected.
- Blocking export when calculation warnings remain unresolved.
- Requiring responsible-official approval before authorized submission.
- Successful authorized-adapter submission.
- Idempotent retry behavior.
- Status lookup after a timeout-safe retry path.
- FIND-like worksite status reconciliation without overwriting internal readiness.
- Preservation of source snapshot, methodology, and factor versions.
- Exclusion of modeled/pending evidence from accepted package inputs.
- New package revision behavior for corrections.

## Production changes required before use

The included mock intentionally keeps the interface small. A production implementation must add request-body hash comparison for idempotency-key reuse, authenticated organization-scoped access, persistent audit events, immutable package snapshots, signed artifact storage, rate limits, retry policy, remote correlation IDs, and an agency-authorized contract.

The `authorized_adapter` fixture is not a real South Coast AQMD payload and must not be sent to the agency. The official material reviewed for this project documents Rule 2202 forms, the VMT calculator, and the FIND public status lookup, but does not document a public Rule 2202 submission API. The default production adapter must remain `PortalExportAdapter` until an official API and authorization are available.

## Suggested CI jobs

```yaml
jobs:
  rule2202-portal-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx vitest run tests/integration/rule2202-portal-sync.e2e.spec.ts
```

## References

- South Coast AQMD Rule 2202 overview: https://www.aqmd.gov/home/programs/business/business-detail?title=rule-2202-on-road-motor-vehicle-mitigation-options
- South Coast AQMD Rule 2202 compliance forms: https://www.aqmd.gov/home/programs/business/r2202-forms-guidelines/compliance-forms
- South Coast AQMD Rule 2202 FIND status: https://www.aqmd.gov/home/programs/business/find
- South Coast AQMD FIND instructions: https://www.aqmd.gov/home/programs/business/find-help
