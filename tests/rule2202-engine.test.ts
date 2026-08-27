import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  assessRule2202Applicability,
  calculateAvr,
  calculateWeeklyVmt,
  calculateZipVmt,
  validateRule2202CommuteRecord,
} from "../src/rule2202ComplianceDomain.ts";
import {
  calculatePersistedSurveyRuns,
  calculatePersistedZipRun,
} from "../src/rule2202ComplianceService.ts";
import {
  buildHistoricalPackageSnapshot,
  evaluateRule2202Compliance,
} from "../src/rule2202Engine.ts";
import { buildAqmdAnnualComplianceExport } from "../src/rule2202Export.ts";

test("evaluateRule2202Compliance blocks when evidence is incomplete", () => {
  const result = evaluateRule2202Compliance({
    reportingYear: {
      reporting_year: 2026,
      status: "in_progress",
      vmt_pathway: "avr_survey",
    },
    population: {
      total_employee_count: null,
      peak_window_employee_count: null,
      confirmed_at: null,
    },
    issues: [
      {
        id: "issue-1",
        rule_code: "R2202-001",
        severity: "blocking",
        field_name: "employee_count",
        message: "Missing employee count.",
        status: "open",
      },
    ],
    runs: [],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.reviewDecision.status, "requires_changes");
  assert.equal(result.evidenceRecords.length, 5);
});

test("buildHistoricalPackageSnapshot includes a versioned export payload", () => {
  const snapshot = buildHistoricalPackageSnapshot({
    reportingYear: {
      reporting_year: 2026,
      status: "ready_for_review",
      vmt_pathway: "avr_survey",
    },
    population: {
      total_employee_count: 180,
      peak_window_employee_count: 120,
      confirmed_at: "2026-06-01T00:00:00.000Z",
    },
    issues: [],
    runs: [
      {
        calculation_type: "avr",
        status: "succeeded",
        result_value: 1.35,
        result_unit: "trips/employee/day",
      },
      {
        calculation_type: "weekly_vmt",
        status: "succeeded",
        result_value: 8400,
        result_unit: "miles/week",
      },
    ],
    reviewDecision: { status: "ready_for_review", summary: "Ready." },
  });

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.status, "ready_for_review");
  assert.ok(snapshot.exportPayload.summary.includes("2026"));
});

test("assessRule2202Applicability requires six-month evidence and provenance", () => {
  const result = assessRule2202Applicability({
    sixMonthEmployeeCounts: [300, 310, 290, 305, 295, 300],
    peakWindowEmployeeCount: 280,
    sourceLabel: "HR roster export",
    sourceAsOf: "2026-06-30",
  });

  assert.equal(result.status, "applicable");
  assert.equal(result.averageEmployeeCount, 300);
});

test("calculateAvr and VMT use persisted commute records and exclude invalid records", () => {
  const records = [
    {
      participantKey: "a",
      mode: "drive_alone" as const,
      occupants: null,
      oneWayMiles: 10,
      commuteDays: 5,
      reportedToSite: true,
      remoteDay: false,
    },
    {
      participantKey: "b",
      mode: "carpool" as const,
      occupants: 2,
      oneWayMiles: 10,
      commuteDays: 5,
      reportedToSite: true,
      remoteDay: false,
    },
    {
      participantKey: "c",
      mode: "telecommute" as const,
      occupants: null,
      oneWayMiles: null,
      commuteDays: 5,
      reportedToSite: false,
      remoteDay: true,
    },
  ];

  assert.equal(calculateAvr(records).value, 1.33);
  assert.equal(calculateWeeklyVmt(records).value, 200);
  assert.equal(calculateWeeklyVmt(records).excludedRecordCount, 1);
  assert.equal(
    calculateZipVmt([
      { participantKey: "a", oneWayMiles: 10, commuteDays: 5, valid: true },
      { participantKey: "b", oneWayMiles: null, commuteDays: 5, valid: false },
    ]).value,
    100,
  );
});

test("complete employer survey fixture matches AQMD VMT mode totals", async () => {
  const fixture = JSON.parse(
    await readFile(
      resolve("tests/fixtures/rule2202-aqmd-employer-survey.json"),
      "utf8",
    ),
  ) as {
    records: Array<{
      anonymousId: string;
      oneWayMiles: number;
      modes: string[];
    }>;
    expected: {
      weeklyVmtByMode: Record<string, number>;
      totalWeeklyVmt: number;
    };
  };
  const modeMap: Record<
    string,
    "drive_alone" | "carpool" | "transit" | "walk" | "telecommute"
  > = {
    "Drive Alone": "drive_alone",
    "2 persons in vehicle": "carpool",
    Bus: "transit",
    Walk: "walk",
    "Telecommute (Work from home/remote)": "telecommute",
  };
  const records = fixture.records.flatMap((record) =>
    record.modes.map((mode) => ({
      participantKey: record.anonymousId,
      mode: modeMap[mode],
      occupants: mode === "2 persons in vehicle" ? 2 : null,
      oneWayMiles: record.oneWayMiles,
      commuteDays: 1,
      reportedToSite: mode !== "Telecommute (Work from home/remote)",
      remoteDay: mode === "Telecommute (Work from home/remote)",
    })),
  );
  const result = calculateWeeklyVmt(records);
  assert.deepEqual(result.payload.modeTotals, fixture.expected.weeklyVmtByMode);
  assert.equal(result.value, fixture.expected.totalWeeklyVmt);
});

test("AQMD annual export contains the current named form sections", () => {
  const exportPayload = buildAqmdAnnualComplianceExport({
    reportingYear: {
      id: "year-1",
      organization_id: "org-1",
      site_id: "site-1",
      reporting_year: 2025,
      status: "ready_for_review",
      vmt_pathway: "avr_survey",
      survey_format: "five_day",
      methodology_version: "AQMD_RULE_2202_2025_VMT",
      annual_due_date: "2025-07-01",
      business_classification: "Educational Services",
      etc_contact_name: "ETC Example",
      etc_contact_email: "etc@example.com",
      notes: null,
    },
    population: {
      id: "population-1",
      organization_id: "org-1",
      site_id: "site-1",
      reporting_year_id: "year-1",
      total_employee_count: 300,
      peak_window_employee_count: 250,
      source_id: null,
      source_label: "HR roster",
      as_of_date: "2025-06-30",
      confirmed_at: "2025-07-01T00:00:00.000Z",
      confirmed_by: "user-1",
      six_month_counts: [300, 300, 300, 300, 300, 300],
      six_month_average: 300,
      six_month_minimum: 300,
      six_month_maximum: 300,
      applicability_status: "applicable",
      applicability_reason: "Threshold met.",
    },
    issues: [],
    runs: [
      {
        id: "run-1",
        reporting_year_id: "year-1",
        calculation_type: "weekly_vmt",
        methodology_version: "AQMD_RULE_2202_2025_VMT",
        status: "succeeded",
        input_record_count: 15,
        excluded_record_count: 0,
        result_value: 230,
        result_unit: "miles/week",
        result_payload: { modeTotals: { drive_alone: 80 } },
        input_snapshot: { recordIds: ["record-1"] },
        error_message: null,
        created_at: "2025-07-01T00:00:00.000Z",
      },
    ],
  });

  assert.equal(exportPayload.registrationForm.programOption, "ECRP");
  assert.equal(exportPayload.applicability.sixMonthAverage, 300);
  assert.equal(exportPayload.weeklyVmtByMode.totalWeeklyVmt, 230);
});

test("validateRule2202CommuteRecord rejects remote/on-site conflicts", () => {
  const errors = validateRule2202CommuteRecord({
    participantKey: "a",
    mode: "drive_alone",
    occupants: null,
    oneWayMiles: 10,
    commuteDays: 1,
    reportedToSite: true,
    remoteDay: true,
  });

  assert.ok(
    errors.includes("A remote day cannot also be reported as on-site."),
  );
});

test("persisted records produce reproducible calculation-run snapshots", () => {
  const surveyRuns = calculatePersistedSurveyRuns(
    [
      {
        id: "record-1",
        organization_id: "org-1",
        site_id: "site-1",
        reporting_year_id: "year-1",
        source_row_key: "row-1",
        participant_key: "employee-a",
        observation_date: "2026-05-01",
        commute_mode: "drive_alone",
        vehicle_occupancy: null,
        one_way_miles: 10,
        commute_days: 5,
        reported_to_site: true,
        remote_day: false,
        validation_status: "valid",
      },
    ],
    "year-1",
  );

  assert.equal(surveyRuns[0].calculationType, "avr");
  assert.deepEqual(surveyRuns[0].inputSnapshot.recordIds, ["record-1"]);
  assert.equal(
    calculatePersistedZipRun(
      [
        {
          id: "zip-1",
          organization_id: "org-1",
          site_id: "site-1",
          reporting_year_id: "year-1",
          participant_key: "employee-a",
          home_zip: "91101",
          one_way_miles: 10,
          distance_source: "aqmd_zip_method",
          commute_days: 5,
          validation_status: "valid",
        },
      ],
      "year-1",
    ).value,
    100,
  );
});
