import type {
  Rule2202CalculationRun,
  Rule2202CompliancePackage,
  Rule2202EmployeePopulation,
  Rule2202ReportingYear,
  Rule2202ValidationIssue,
} from "./rule2202Api";

export type Rule2202ExportInput = {
  reportingYear: Rule2202ReportingYear | null;
  population: Rule2202EmployeePopulation | null;
  issues: Rule2202ValidationIssue[];
  runs: Rule2202CalculationRun[];
  packageRecord?: Rule2202CompliancePackage | null;
};

export function buildAqmdAnnualComplianceExport(input: Rule2202ExportInput) {
  const successfulRuns = input.runs.filter((run) => run.status === "succeeded");
  const blockingIssues = input.issues.filter(
    (issue) => issue.status === "open" && issue.severity === "blocking",
  );
  const avrRun = successfulRuns.find((run) => run.calculation_type === "avr");
  const vmtRun = successfulRuns.find(
    (run) => run.calculation_type === "weekly_vmt",
  );
  const vmtPayload = vmtRun?.result_payload ?? {};

  return {
    exportVersion: "AQMD_RULE_2202_ANNUAL_COMPLIANCE_2025_V1",
    generatedAt: new Date().toISOString(),
    filingStatus: input.packageRecord?.status ?? "draft",
    reportingYear: input.reportingYear?.reporting_year ?? null,
    registrationForm: {
      year: input.reportingYear?.reporting_year ?? null,
      siteId: input.reportingYear?.site_id ?? null,
      programOption:
        input.reportingYear?.vmt_pathway === "avr_survey" ? "ECRP" : "VMT_ZIP",
      businessTypeClassification:
        input.reportingYear?.business_classification ?? null,
      annualDueDate: input.reportingYear?.annual_due_date ?? null,
      filingReference: input.packageRecord?.filing_reference ?? null,
    },
    worksite: {
      organizationId: input.reportingYear?.organization_id ?? null,
      siteId: input.reportingYear?.site_id ?? null,
      businessClassification:
        input.reportingYear?.business_classification ?? null,
      etcContactName: input.reportingYear?.etc_contact_name ?? null,
      etcContactEmail: input.reportingYear?.etc_contact_email ?? null,
      annualDueDate: input.reportingYear?.annual_due_date ?? null,
    },
    applicability: {
      sixMonthEmployeeCounts: input.population?.six_month_counts ?? [],
      sixMonthAverage: input.population?.six_month_average ?? null,
      sixMonthMinimum: input.population?.six_month_minimum ?? null,
      sixMonthMaximum: input.population?.six_month_maximum ?? null,
      peakWindowEmployees: input.population?.peak_window_employee_count ?? null,
      status: input.population?.applicability_status ?? "needs_review",
      sourceLabel: input.population?.source_label ?? null,
      sourceAsOf: input.population?.as_of_date ?? null,
    },
    pathway: input.reportingYear?.vmt_pathway ?? null,
    surveyFormat: input.reportingYear?.survey_format ?? null,
    avrVerification: {
      currentAvr: avrRun?.result_value ?? null,
      currentAvrUnit: avrRun?.result_unit ?? null,
      methodologyVersion: avrRun?.methodology_version ?? null,
      sourceRecordCount: avrRun?.input_record_count ?? 0,
    },
    weeklyVmtByMode: {
      modeTotals: vmtPayload.modeTotals ?? {},
      totalWeeklyVmt: vmtRun?.result_value ?? null,
      unit: vmtRun?.result_unit ?? "miles/week",
    },
    metrics: successfulRuns.map((run) => ({
      calculationType: run.calculation_type,
      value: run.result_value,
      unit: run.result_unit,
      methodologyVersion: run.methodology_version,
      inputRecordCount: run.input_record_count,
      excludedRecordCount: run.excluded_record_count,
      payload: run.result_payload,
      createdAt: run.created_at,
    })),
    validation: {
      blockingIssueCount: blockingIssues.length,
      issueCount: input.issues.length,
      issues: input.issues,
    },
    package: input.packageRecord
      ? {
          id: input.packageRecord.id,
          version: input.packageRecord.version,
          status: input.packageRecord.status,
          reviewedAt: input.packageRecord.reviewed_at,
          reviewedBy: input.packageRecord.reviewed_by ?? null,
          filedAt: input.packageRecord.filed_at,
          filingReference: input.packageRecord.filing_reference,
        }
      : null,
  };
}

export function downloadJsonExport(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
