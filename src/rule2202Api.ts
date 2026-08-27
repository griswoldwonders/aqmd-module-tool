import type { SaasSession } from "./saasApi";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://dzrqrqfxcihvufvyctbt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_hLCfTlWFEQRkwKUwz5Wv2g_DwoVqPy1";

export type Rule2202ReportingYear = {
  id: string;
  organization_id: string;
  site_id: string;
  reporting_year: number;
  status: string;
  vmt_pathway: "avr_survey" | "anonymized_zip" | null;
  survey_format: "five_day" | "seven_day" | null;
  methodology_version: string;
  annual_due_date: string | null;
  business_classification: string | null;
  etc_contact_name: string | null;
  etc_contact_email: string | null;
  notes: string | null;
};
export type Rule2202EmployeePopulation = {
  id: string;
  organization_id: string;
  site_id: string;
  reporting_year_id: string;
  total_employee_count: number | null;
  peak_window_employee_count: number | null;
  source_id: string | null;
  source_label: string | null;
  as_of_date: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  six_month_counts?: number[];
  six_month_average?: number | null;
  six_month_minimum?: number | null;
  six_month_maximum?: number | null;
  applicability_status?: "applicable" | "exempt" | "needs_review" | null;
  applicability_reason?: string | null;
};
export type Rule2202ValidationIssue = {
  id: string;
  reporting_year_id: string;
  source_row_key: string | null;
  rule_code: string;
  severity: "blocking" | "review" | "warning";
  field_name: string | null;
  message: string;
  status: "open" | "resolved" | "excluded" | "accepted";
  resolution_note: string | null;
  resolved_at: string | null;
};
export type Rule2202CalculationRun = {
  id: string;
  reporting_year_id: string;
  calculation_type: "avr" | "weekly_vmt" | "telecommute" | "package_readiness";
  methodology_version: string;
  status: "pending" | "running" | "succeeded" | "failed" | "superseded";
  input_record_count: number;
  excluded_record_count: number;
  result_value: number | null;
  result_unit: string | null;
  result_payload: Record<string, unknown>;
  input_snapshot: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};
export type Rule2202CompliancePackage = {
  id: string;
  reporting_year_id: string;
  version: number;
  status: string;
  readiness_snapshot: Record<string, unknown>;
  source_snapshot: Record<string, unknown>;
  generated_at: string | null;
  reviewed_at: string | null;
  reviewed_by?: string | null;
  filed_at: string | null;
  filing_reference: string | null;
  approved_by?: string | null;
  approval_note?: string | null;
  superseded_by?: string | null;
  retention_until?: string | null;
  export_hash?: string | null;
};
export type Rule2202Applicability = {
  id: string;
  reporting_year_id: string;
  six_month_counts: number[];
  six_month_average: number | null;
  six_month_minimum: number | null;
  six_month_maximum: number | null;
  peak_window_employee_count: number | null;
  source_label: string | null;
  source_as_of: string | null;
  applicability_status: "applicable" | "exempt" | "needs_review" | null;
  applicability_reason: string | null;
};
export type Rule2202SurveyRecord = {
  id?: string;
  organization_id: string;
  site_id: string;
  reporting_year_id: string;
  source_id?: string | null;
  source_row_key: string;
  participant_key: string;
  observation_date: string;
  commute_mode: string;
  vehicle_occupancy?: number | null;
  one_way_miles?: number | null;
  commute_days: number;
  reported_to_site: boolean;
  remote_day: boolean;
  validation_status:
    | "unvalidated"
    | "valid"
    | "warning"
    | "blocking_error"
    | "excluded";
  original_payload?: Record<string, unknown>;
};
export type Rule2202ZipRecord = {
  id?: string;
  organization_id: string;
  site_id: string;
  reporting_year_id: string;
  source_id?: string | null;
  participant_key: string;
  home_zip: string;
  one_way_miles?: number | null;
  distance_source?: string | null;
  commute_days: number;
  validation_status:
    | "unvalidated"
    | "valid"
    | "warning"
    | "blocking_error"
    | "excluded";
  original_payload?: Record<string, unknown>;
};
export type Rule2202Review = {
  id: string;
  reporting_year_id: string;
  package_id: string | null;
  decision:
    | "requires_changes"
    | "approved_for_filing"
    | "rejected"
    | "withdrawn";
  decision_note: string;
  reviewer_id: string;
  decided_at: string;
};
export type Rule2202AuditEvent = {
  id: string;
  reporting_year_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  occurred_at: string;
};

function headers(token: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}
async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok)
    throw new Error(
      body?.message ?? body?.hint ?? `Request failed (${response.status})`,
    );
  return body as T;
}
async function rest<T>(session: SaasSession, path: string, init?: RequestInit) {
  return parse<T>(
    await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers(session.access_token), ...(init?.headers ?? {}) },
    }),
  );
}

export function listReportingYears(
  session: SaasSession,
  organizationId: string,
  siteId: string,
) {
  return rest<Rule2202ReportingYear[]>(
    session,
    `rule2202_reporting_years?organization_id=eq.${organizationId}&site_id=eq.${siteId}&select=*&order=reporting_year.desc`,
  );
}
export function createReportingYear(
  session: SaasSession,
  input: { organization_id: string; site_id: string; reporting_year: number },
) {
  return rest<Rule2202ReportingYear[]>(session, "rule2202_reporting_years", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      created_by: session.user.id,
      methodology_version: "AQMD_RULE_2202_2026",
    }),
  });
}
export function updateReportingYear(
  session: SaasSession,
  id: string,
  patch: Partial<
    Pick<
      Rule2202ReportingYear,
      | "status"
      | "vmt_pathway"
      | "survey_format"
      | "annual_due_date"
      | "business_classification"
      | "etc_contact_name"
      | "etc_contact_email"
      | "notes"
    >
  >,
) {
  return rest<Rule2202ReportingYear[]>(
    session,
    `rule2202_reporting_years?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}
export function getEmployeePopulation(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202EmployeePopulation[]>(
    session,
    `rule2202_employee_populations?reporting_year_id=eq.${reportingYearId}&select=*`,
  );
}
export function saveEmployeePopulation(
  session: SaasSession,
  input: Omit<
    Rule2202EmployeePopulation,
    "id" | "confirmed_at" | "confirmed_by"
  > & { confirmed?: boolean },
) {
  const payload = {
    ...input,
    confirmed_at: input.confirmed ? new Date().toISOString() : null,
    confirmed_by: input.confirmed ? session.user.id : null,
    created_by: session.user.id,
  };
  delete (payload as any).confirmed;
  return rest<Rule2202EmployeePopulation[]>(
    session,
    "rule2202_employee_populations?on_conflict=reporting_year_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    },
  );
}
export function updateCompliancePackage(
  session: SaasSession,
  packageId: string,
  patch: Partial<
    Pick<
      Rule2202CompliancePackage,
      | "status"
      | "reviewed_at"
      | "reviewed_by"
      | "filed_at"
      | "filing_reference"
      | "approved_by"
      | "approval_note"
      | "retention_until"
      | "export_hash"
    >
  >,
) {
  return rest<Rule2202CompliancePackage[]>(
    session,
    `rule2202_compliance_packages?id=eq.${packageId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}
export function listValidationIssues(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202ValidationIssue[]>(
    session,
    `rule2202_validation_issues?reporting_year_id=eq.${reportingYearId}&select=*&order=created_at.asc`,
  );
}
export function createValidationIssue(
  session: SaasSession,
  input: {
    organization_id: string;
    site_id: string;
    reporting_year_id: string;
    source_row_key?: string | null;
    rule_code: string;
    severity: "blocking" | "review" | "warning";
    field_name?: string | null;
    message: string;
  },
) {
  return rest<Rule2202ValidationIssue[]>(
    session,
    "rule2202_validation_issues",
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function resolveValidationIssue(
  session: SaasSession,
  id: string,
  status: "resolved" | "excluded" | "accepted",
  resolutionNote: string,
) {
  return rest<Rule2202ValidationIssue[]>(
    session,
    `rule2202_validation_issues?id=eq.${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        resolution_note: resolutionNote,
        resolved_at: new Date().toISOString(),
        resolved_by: session.user.id,
      }),
    },
  );
}
export function listCalculationRuns(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202CalculationRun[]>(
    session,
    `rule2202_calculation_runs?reporting_year_id=eq.${reportingYearId}&select=*&order=created_at.desc`,
  );
}
export function createCalculationRun(
  session: SaasSession,
  input: {
    organization_id: string;
    site_id: string;
    reporting_year_id: string;
    calculation_type: Rule2202CalculationRun["calculation_type"];
    input_record_count: number;
    excluded_record_count?: number;
    input_snapshot?: Record<string, unknown>;
  },
) {
  return rest<Rule2202CalculationRun[]>(session, "rule2202_calculation_runs", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      excluded_record_count: input.excluded_record_count ?? 0,
      input_snapshot: input.input_snapshot ?? {},
      created_by: session.user.id,
      methodology_version: "AQMD_RULE_2202_2026",
      status: "pending",
    }),
  });
}
export function listCompliancePackages(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202CompliancePackage[]>(
    session,
    `rule2202_compliance_packages?reporting_year_id=eq.${reportingYearId}&select=*&order=version.desc`,
  );
}
export function createCompliancePackage(
  session: SaasSession,
  input: {
    organization_id: string;
    site_id: string;
    reporting_year_id: string;
    version: number;
    status: "draft" | "blocked" | "ready_for_review";
    readiness_snapshot: Record<string, unknown>;
    source_snapshot: Record<string, unknown>;
  },
) {
  return rest<Rule2202CompliancePackage[]>(
    session,
    "rule2202_compliance_packages",
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        generated_at: new Date().toISOString(),
        created_by: session.user.id,
      }),
    },
  );
}
export function listRule2202MethodologyVersions(session: SaasSession) {
  return rest<
    Array<{
      id: string;
      version_key: string;
      title: string;
      source_url: string;
      effective_from: string;
      effective_to: string | null;
      active: boolean;
      formula_catalog: Record<string, unknown>;
    }>
  >(
    session,
    "rule2202_methodology_versions?select=*&order=effective_from.desc",
  );
}
export function getRule2202Applicability(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202Applicability[]>(
    session,
    `rule2202_employee_populations?reporting_year_id=eq.${reportingYearId}&select=id,reporting_year_id,six_month_counts,six_month_average,six_month_minimum,six_month_maximum,peak_window_employee_count,source_label,as_of_date,applicability_status,applicability_reason`,
  );
}
export function listRule2202SurveyRecords(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202SurveyRecord[]>(
    session,
    `rule2202_survey_records?reporting_year_id=eq.${reportingYearId}&superseded_at=is.null&select=*&order=observation_date.asc,source_row_key.asc`,
  );
}
export function insertRule2202SurveyRecords(
  session: SaasSession,
  records: Rule2202SurveyRecord[],
) {
  if (!records.length) return Promise.resolve([] as Rule2202SurveyRecord[]);
  return rest<Rule2202SurveyRecord[]>(session, "rule2202_survey_records", {
    method: "POST",
    body: JSON.stringify(
      records.map((record) => ({ ...record, created_by: session.user.id })),
    ),
  });
}
export function listRule2202ZipRecords(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202ZipRecord[]>(
    session,
    `rule2202_zip_records?reporting_year_id=eq.${reportingYearId}&superseded_at=is.null&select=*&order=participant_key.asc`,
  );
}
export function insertRule2202ZipRecords(
  session: SaasSession,
  records: Rule2202ZipRecord[],
) {
  if (!records.length) return Promise.resolve([] as Rule2202ZipRecord[]);
  return rest<Rule2202ZipRecord[]>(session, "rule2202_zip_records", {
    method: "POST",
    body: JSON.stringify(
      records.map((record) => ({ ...record, created_by: session.user.id })),
    ),
  });
}
export function listRule2202Reviews(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202Review[]>(
    session,
    `rule2202_reviews?reporting_year_id=eq.${reportingYearId}&select=*&order=decided_at.desc`,
  );
}
export function createRule2202Review(
  session: SaasSession,
  input: {
    organization_id: string;
    site_id: string;
    reporting_year_id: string;
    package_id?: string | null;
    decision: Rule2202Review["decision"];
    decision_note: string;
    supersedes_review_id?: string | null;
  },
) {
  return rest<Rule2202Review[]>(session, "rule2202_reviews", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      package_id: input.package_id ?? null,
      reviewer_id: session.user.id,
      supersedes_review_id: input.supersedes_review_id ?? null,
    }),
  });
}
export function updateRule2202PackageReview(
  session: SaasSession,
  packageId: string,
  status: "reviewed" | "filed" | "superseded",
  note?: string,
) {
  const patch =
    status === "reviewed"
      ? {
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
          approved_by: session.user.id,
          approval_note: note ?? null,
        }
      : status === "filed"
        ? { status, filed_at: new Date().toISOString() }
        : { status };
  return rest<Rule2202CompliancePackage[]>(
    session,
    `rule2202_compliance_packages?id=eq.${packageId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}
export function listRule2202AuditEvents(
  session: SaasSession,
  reportingYearId: string,
) {
  return rest<Rule2202AuditEvent[]>(
    session,
    `rule2202_audit_events?reporting_year_id=eq.${reportingYearId}&select=*&order=occurred_at.desc`,
  );
}
