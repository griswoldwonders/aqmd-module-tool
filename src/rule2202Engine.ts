export type Rule2202ComplianceStatus = "ready_for_review" | "blocked";

export type Rule2202EngineEvidenceRecord = {
  id: string;
  type: "population" | "validation" | "calculation" | "review";
  status: "missing" | "ready" | "blocked";
  detail: string;
};

export type Rule2202ReviewDecision = {
  status: "ready_for_review" | "requires_changes" | "blocked";
  summary: string;
};

export type Rule2202EvaluationInput = {
  reportingYear: {
    reporting_year: number;
    status?: string | null;
    vmt_pathway?: "avr_survey" | "anonymized_zip" | null;
  } | null;
  population: {
    total_employee_count: number | null;
    peak_window_employee_count: number | null;
    confirmed_at: string | null;
  } | null;
  issues: Array<{
    id?: string;
    rule_code?: string;
    severity?: "blocking" | "review" | "warning";
    field_name?: string | null;
    message?: string;
    status?: "open" | "resolved" | "excluded" | "accepted";
  }>;
  runs: Array<{
    calculation_type:
      | "avr"
      | "weekly_vmt"
      | "telecommute"
      | "package_readiness";
    status?: string | null;
    result_value?: number | null;
    result_unit?: string | null;
  }>;
};

export type Rule2202ComplianceEvaluation = {
  status: Rule2202ComplianceStatus;
  reviewDecision: Rule2202ReviewDecision;
  evidenceRecords: Rule2202EngineEvidenceRecord[];
  summary: string;
};

export function evaluateRule2202Compliance(
  input: Rule2202EvaluationInput,
): Rule2202ComplianceEvaluation {
  const evidence: Rule2202EngineEvidenceRecord[] = [];
  const issues = input.issues ?? [];
  const blockingIssues = issues.filter(
    (issue) =>
      issue.status !== "resolved" &&
      issue.status !== "excluded" &&
      issue.status !== "accepted" &&
      issue.severity === "blocking",
  );

  const hasYear = Boolean(
    input.reportingYear && input.reportingYear.reporting_year,
  );
  const hasPopulation = Boolean(
    input.population &&
    Number.isFinite(input.population.total_employee_count) &&
    Number.isFinite(input.population.peak_window_employee_count) &&
    input.population.confirmed_at,
  );
  const hasVmtPathway = Boolean(input.reportingYear?.vmt_pathway);
  const hasSuccessfulRuns = input.runs.some(
    (run) => run.status === "succeeded",
  );
  const hasSurveyAvr = input.runs.some(
    (run) => run.calculation_type === "avr" && run.status === "succeeded",
  );
  const hasWeeklyVmt = input.runs.some(
    (run) =>
      run.calculation_type === "weekly_vmt" && run.status === "succeeded",
  );

  evidence.push({
    id: "worksite-year",
    type: "review",
    status: hasYear ? "ready" : "missing",
    detail: hasYear
      ? `Reporting year ${input.reportingYear?.reporting_year ?? ""} is configured.`
      : "No reporting year record exists.",
  });

  evidence.push({
    id: "employee-population",
    type: "population",
    status: hasPopulation ? "ready" : "missing",
    detail: hasPopulation
      ? "Confirmed employee population snapshot is present."
      : "Employee population is missing or not confirmed.",
  });

  evidence.push({
    id: "vmt-pathway",
    type: "review",
    status: hasVmtPathway ? "ready" : "missing",
    detail: hasVmtPathway
      ? `VMT pathway ${input.reportingYear?.vmt_pathway} is selected.`
      : "No VMT pathway selected.",
  });

  evidence.push({
    id: "validation",
    type: "validation",
    status: blockingIssues.length === 0 ? "ready" : "blocked",
    detail:
      blockingIssues.length === 0
        ? "No open blocking validation issues."
        : `${blockingIssues.length} open blocking validation issue(s) remain.`,
  });

  evidence.push({
    id: "calculation-runs",
    type: "calculation",
    status: hasSuccessfulRuns ? "ready" : "missing",
    detail: hasSuccessfulRuns
      ? "At least one successful calculation run is present."
      : "No successful calculation run has been stored.",
  });

  const isSurveyPathway = input.reportingYear?.vmt_pathway === "avr_survey";
  const isReady =
    hasYear &&
    hasPopulation &&
    hasVmtPathway &&
    blockingIssues.length === 0 &&
    hasSuccessfulRuns &&
    (!isSurveyPathway || hasSurveyAvr) &&
    hasWeeklyVmt;

  if (!isReady) {
    const reviewDecision: Rule2202ReviewDecision = {
      status: "requires_changes",
      summary:
        "Compliance package remains blocked pending required evidence and successful calculation results.",
    };

    return {
      status: "blocked",
      reviewDecision,
      evidenceRecords: evidence,
      summary: "Evidence is incomplete for a compliant Rule 2202 package.",
    };
  }

  return {
    status: "ready_for_review",
    reviewDecision: {
      status: "ready_for_review",
      summary:
        "All required Rule 2202 evidence records and successful calculations are in place for administrator review.",
    },
    evidenceRecords: evidence,
    summary: `Rule 2202 package for ${input.reportingYear?.reporting_year ?? "current"} reporting year is ready for administrative review.`,
  };
}

export type Rule2202HistoricalSnapshotInput = Rule2202EvaluationInput & {
  reviewDecision?: Rule2202ReviewDecision;
};

export function buildHistoricalPackageSnapshot(
  input: Rule2202HistoricalSnapshotInput,
) {
  const evaluation = evaluateRule2202Compliance(input);
  const reviewDecision = input.reviewDecision ?? evaluation.reviewDecision;

  return {
    version: 1,
    status: reviewDecision.status,
    exportedAt: new Date().toISOString(),
    reportingYear: input.reportingYear?.reporting_year ?? null,
    pathway: input.reportingYear?.vmt_pathway ?? null,
    summary: `Rule 2202 snapshot for reporting year ${input.reportingYear?.reporting_year ?? "unknown"}. ${reviewDecision.summary}`,
    exportPayload: {
      year: input.reportingYear?.reporting_year ?? null,
      status: reviewDecision.status,
      summary: `Rule 2202 snapshot for reporting year ${input.reportingYear?.reporting_year ?? "unknown"}. ${reviewDecision.summary}`,
      population: input.population,
      issues: input.issues,
      runs: input.runs,
      evidence: evaluation.evidenceRecords,
    },
  };
}
