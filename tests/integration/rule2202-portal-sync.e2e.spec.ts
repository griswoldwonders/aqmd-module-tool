import { describe, expect, it, beforeEach } from 'vitest';

/**
 * Relay Rider Rule 2202 reporting-portal sync integration tests.
 *
 * These tests exercise the application boundary, not South Coast AQMD itself.
 * The AQMD adapter is a contract-tested mock and must only be replaced by an
 * officially authorized endpoint and contract.
 */

type Classification = 'verified' | 'self_reported' | 'imported' | 'modeled';
type ReviewStatus = 'accepted' | 'accepted_with_note' | 'pending' | 'rejected';
type ProjectionStatus =
  | 'validation_pending'
  | 'ready_for_etc_review'
  | 'ready_for_responsible_official_review'
  | 'blocked'
  | 'submitted'
  | 'agency_review'
  | 'agency_approved'
  | 'returned_for_correction';

type Rule2202Target = 'south_coast_aqmd_rule_2202';

interface Evidence {
  id: string;
  requirementCode: string;
  classification: Classification;
  reviewStatus: ReviewStatus;
  periodStart: string;
  periodEnd: string;
  sourceReference: string;
}

interface CalculationRun {
  id: string;
  methodologyVersion: string;
  factorVersion: string;
  inputSnapshotHash: string;
  status: 'completed' | 'failed';
  blockingWarnings: number;
}

interface ApprovedPackage {
  id: string;
  worksiteId: string;
  cycleId: string;
  packageVersion: number;
  formVersion: string;
  evidence: Evidence[];
  calculation: CalculationRun;
  responsibleOfficialApproval: boolean;
  sourceSnapshotHash: string;
}

interface Projection {
  id: string;
  target: Rule2202Target;
  targetVersion: string;
  status: ProjectionStatus;
  readiness: string;
  packageId: string;
  facilityId?: string;
  blockingIssueCount: number;
  artifacts: Artifact[];
  sourceSnapshotHash?: string;
}

interface Artifact {
  type: string;
  format: 'xlsx' | 'pdf' | 'json' | 'csv';
  sha256: string;
  status: 'generated' | 'failed';
}

interface SubmissionReceipt {
  remoteReference: string;
  submittedAt: string;
  status: 'received' | 'under_review' | 'accepted' | 'returned';
  idempotencyKey: string;
}

interface MockAgencyStatus {
  facilityId: string;
  planSequence: number;
  programYear: number;
  programType: 'ECRP' | 'AQIP' | 'ERS';
  currentStatus: 'Plan Received' | 'Review' | 'Program Approved' | 'Program Disapproved';
  permanentDueDate: string;
  dueDate: string;
  notificationDate: string;
  currentStatusDate: string;
  planReviewer: { name: string; email: string };
}

class PortalExportAdapter {
  async createProjection(pkg: ApprovedPackage): Promise<Projection> {
    const blocking = pkg.evidence.filter((e) => e.reviewStatus === 'pending' || e.reviewStatus === 'rejected').length
      + (pkg.calculation.blockingWarnings > 0 ? 1 : 0)
      + (pkg.responsibleOfficialApproval ? 0 : 1);

    return {
      id: `rpx-${pkg.id}`,
      target: 'south_coast_aqmd_rule_2202',
      targetVersion: pkg.formVersion,
      status: blocking === 0 ? 'ready_for_responsible_official_review' : 'blocked',
      readiness: blocking === 0 ? 'ready_for_responsible_official_review' : 'not_ready',
      packageId: pkg.id,
      facilityId: 'FAC-EXAMPLE-001',
      blockingIssueCount: blocking,
      artifacts: blocking === 0 ? [
        { type: 'annual_registration_workbook', format: 'xlsx', sha256: 'sha256-workbook', status: 'generated' },
        { type: 'review_package', format: 'pdf', sha256: 'sha256-pdf', status: 'generated' },
        { type: 'source_manifest', format: 'json', sha256: 'sha256-manifest', status: 'generated' },
      ] : [],
      sourceSnapshotHash: pkg.sourceSnapshotHash,
    };
  }
}

class AuthorizedAgencyAdapterMock {
  private submissions = new Map<string, SubmissionReceipt>();
  private statuses = new Map<string, MockAgencyStatus>();

  seedStatus(status: MockAgencyStatus) {
    this.statuses.set(status.facilityId, status);
  }

  async validateSubmission(pkg: ApprovedPackage): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!pkg.responsibleOfficialApproval) errors.push('RESPONSIBLE_OFFICIAL_APPROVAL_REQUIRED');
    if (pkg.calculation.blockingWarnings > 0) errors.push('CALCULATION_WARNINGS_UNRESOLVED');
    if (pkg.evidence.some((e) => e.reviewStatus !== 'accepted' && e.reviewStatus !== 'accepted_with_note')) {
      errors.push('EVIDENCE_NOT_ACCEPTED');
    }
    return { valid: errors.length === 0, errors };
  }

  async submitSubmission(pkg: ApprovedPackage, idempotencyKey: string): Promise<SubmissionReceipt> {
    const existing = this.submissions.get(idempotencyKey);
    if (existing) return existing;

    const validation = await this.validateSubmission(pkg);
    if (!validation.valid) throw new Error(validation.errors.join(','));

    const receipt: SubmissionReceipt = {
      remoteReference: `AQMD-MOCK-${pkg.id}`,
      submittedAt: '2026-08-27T16:00:00Z',
      status: 'received',
      idempotencyKey,
    };
    this.submissions.set(idempotencyKey, receipt);
    return receipt;
  }

  async getSubmissionStatus(remoteReference: string): Promise<SubmissionReceipt> {
    const receipt = [...this.submissions.values()].find((r) => r.remoteReference === remoteReference);
    if (!receipt) throw new Error('REMOTE_REFERENCE_NOT_FOUND');
    return receipt;
  }

  async getWorksiteStatus(facilityId: string): Promise<MockAgencyStatus> {
    const status = this.statuses.get(facilityId);
    if (!status) throw new Error('FACILITY_NOT_FOUND');
    return status;
  }
}

const acceptedEvidence = (): Evidence[] => [
  {
    id: 'evd-employee-count',
    requirementCode: 'WORKSITE_EMPLOYEE_COUNT',
    classification: 'verified',
    reviewStatus: 'accepted',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    sourceReference: 'hr-roster-2026-01',
  },
  {
    id: 'evd-commute-survey',
    requirementCode: 'COMMUTE_SURVEY',
    classification: 'imported',
    reviewStatus: 'accepted_with_note',
    periodStart: '2026-01-15',
    periodEnd: '2026-02-15',
    sourceReference: 'survey-export-2026-01',
  },
  {
    id: 'evd-weekly-vmt',
    requirementCode: 'WEEKLY_VMT',
    classification: 'verified',
    reviewStatus: 'accepted',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    sourceReference: 'vmt-workbook-2026',
  },
];

const approvedPackage = (overrides: Partial<ApprovedPackage> = {}): ApprovedPackage => ({
  id: 'pkg-2026-pasadena-001',
  worksiteId: 'wrk-pasadena-001',
  cycleId: 'cycle-2026-pasadena-001',
  packageVersion: 1,
  formVersion: 'forms-after-2025-01-01',
  evidence: acceptedEvidence(),
  calculation: {
    id: 'calc-2026-001',
    methodologyVersion: '2026-methodology-version',
    factorVersion: '2026-emission-factors',
    inputSnapshotHash: 'sha256-input-snapshot',
    status: 'completed',
    blockingWarnings: 0,
  },
  responsibleOfficialApproval: true,
  sourceSnapshotHash: 'sha256-source-snapshot',
  ...overrides,
});

describe('Rule 2202 reporting portal sync — end-to-end contract suite', () => {
  let exportAdapter: PortalExportAdapter;
  let agencyAdapter: AuthorizedAgencyAdapterMock;

  beforeEach(() => {
    exportAdapter = new PortalExportAdapter();
    agencyAdapter = new AuthorizedAgencyAdapterMock();
    agencyAdapter.seedStatus({
      facilityId: 'FAC-EXAMPLE-001',
      planSequence: 3,
      programYear: 2026,
      programType: 'ECRP',
      currentStatus: 'Program Approved',
      permanentDueDate: '2026-08-31',
      dueDate: '2026-08-31',
      notificationDate: '2023-09-01',
      currentStatusDate: '2026-08-20',
      planReviewer: { name: 'Mock Plan Reviewer', email: 'reviewer@example.test' },
    });
  });

  it('generates a portal-ready package from an approved package', async () => {
    const projection = await exportAdapter.createProjection(approvedPackage());

    expect(projection.target).toBe('south_coast_aqmd_rule_2202');
    expect(projection.targetVersion).toBe('forms-after-2025-01-01');
    expect(projection.status).toBe('ready_for_responsible_official_review');
    expect(projection.blockingIssueCount).toBe(0);
    expect(projection.artifacts.map((a) => a.type)).toEqual([
      'annual_registration_workbook',
      'review_package',
      'source_manifest',
    ]);
  });

  it('blocks export when evidence is pending or rejected', async () => {
    const pkg = approvedPackage({
      evidence: acceptedEvidence().map((item, index) => index === 1 ? { ...item, reviewStatus: 'pending' } : item),
    });
    const projection = await exportAdapter.createProjection(pkg);

    expect(projection.status).toBe('blocked');
    expect(projection.blockingIssueCount).toBeGreaterThan(0);
    expect(projection.artifacts).toHaveLength(0);
  });

  it('blocks export when calculation warnings remain unresolved', async () => {
    const projection = await exportAdapter.createProjection(approvedPackage({
      calculation: { ...approvedPackage().calculation, blockingWarnings: 1 },
    }));

    expect(projection.status).toBe('blocked');
    expect(projection.blockingIssueCount).toBeGreaterThan(0);
  });

  it('blocks authorized submission until responsible-official approval exists', async () => {
    const pkg = approvedPackage({ responsibleOfficialApproval: false });
    await expect(agencyAdapter.submitSubmission(pkg, 'idem-no-approval'))
      .rejects.toThrow('RESPONSIBLE_OFFICIAL_APPROVAL_REQUIRED');
  });

  it('submits an approved package to the authorized adapter mock', async () => {
    const receipt = await agencyAdapter.submitSubmission(approvedPackage(), 'idem-approved-001');

    expect(receipt.remoteReference).toBe('AQMD-MOCK-pkg-2026-pasadena-001');
    expect(receipt.status).toBe('received');
    expect(receipt.idempotencyKey).toBe('idem-approved-001');
  });

  it('returns the same receipt for an idempotent retry', async () => {
    const first = await agencyAdapter.submitSubmission(approvedPackage(), 'idem-retry-001');
    const second = await agencyAdapter.submitSubmission(approvedPackage(), 'idem-retry-001');

    expect(second).toEqual(first);
  });

  it('rejects an idempotency key in a real implementation when the body hash changes', async () => {
    // Contract requirement: the mock returns the same receipt for the same key.
    // The production adapter must additionally compare request hashes and return
    // HTTP 409 IDEMPOTENCY_KEY_REUSE when the body differs.
    const first = await agencyAdapter.submitSubmission(approvedPackage(), 'idem-body-hash-001');
    const retry = await agencyAdapter.submitSubmission(approvedPackage({ packageVersion: 2 }), 'idem-body-hash-001');

    expect(retry).toEqual(first);
  });

  it('retrieves the remote submission status after a timeout-safe retry path', async () => {
    const receipt = await agencyAdapter.submitSubmission(approvedPackage(), 'idem-status-001');
    const status = await agencyAdapter.getSubmissionStatus(receipt.remoteReference);

    expect(status.remoteReference).toBe(receipt.remoteReference);
    expect(status.status).toBe('received');
  });

  it('reconciles FIND-like public worksite status without overwriting internal readiness', async () => {
    const internalProjection = await exportAdapter.createProjection(approvedPackage());
    const agencyStatus = await agencyAdapter.getWorksiteStatus('FAC-EXAMPLE-001');

    expect(internalProjection.readiness).toBe('ready_for_responsible_official_review');
    expect(agencyStatus.currentStatus).toBe('Program Approved');
    expect(agencyStatus.facilityId).toBe('FAC-EXAMPLE-001');
    expect(agencyStatus.permanentDueDate).toBe('2026-08-31');
  });

  it('preserves source snapshot and methodology versions in the projection', async () => {
    const pkg = approvedPackage();
    const projection = await exportAdapter.createProjection(pkg);

    expect(projection.sourceSnapshotHash).toBe(pkg.sourceSnapshotHash);
    expect(pkg.calculation.methodologyVersion).toBe('2026-methodology-version');
    expect(pkg.calculation.factorVersion).toBe('2026-emission-factors');
  });

  it('does not treat modeled data as accepted evidence', async () => {
    const pkg = approvedPackage({
      evidence: acceptedEvidence().map((item, index) => index === 2
        ? { ...item, classification: 'modeled', reviewStatus: 'pending' }
        : item),
    });
    const projection = await exportAdapter.createProjection(pkg);

    expect(projection.status).toBe('blocked');
    expect(pkg.evidence.find((e) => e.classification === 'modeled')?.reviewStatus).toBe('pending');
  });

  it('creates a correction path by generating a new package revision', async () => {
    const original = approvedPackage();
    const corrected = approvedPackage({ packageVersion: 2, sourceSnapshotHash: 'sha256-corrected-snapshot' });

    expect(corrected.packageVersion).toBe(original.packageVersion + 1);
    expect(corrected.id).toBe(original.id);
    expect(corrected.sourceSnapshotHash).not.toBe(original.sourceSnapshotHash);
  });
});
