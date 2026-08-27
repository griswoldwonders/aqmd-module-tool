import type {
  Rule2202ZipRecord as PersistedZipRecord,
  Rule2202SurveyRecord,
} from "./rule2202Api";
import {
  calculateAvr,
  calculateWeeklyVmt,
  calculateZipVmt,
  type Rule2202CalculationResult,
  type Rule2202CommuteRecord,
  type Rule2202ZipRecord,
} from "./rule2202ComplianceDomain.ts";

export type Rule2202PersistedCalculationRun = Rule2202CalculationResult & {
  calculationType: "avr" | "weekly_vmt" | "zip_vmt";
  inputSnapshot: {
    recordIds: string[];
    reportingYearId: string;
    sourceRowKeys: string[];
  };
};

export function calculatePersistedSurveyRuns(
  records: Rule2202SurveyRecord[],
  reportingYearId: string,
): Rule2202PersistedCalculationRun[] {
  const inputs = records.map(toCommuteRecord);
  const inputSnapshot = buildInputSnapshot(
    records.map((record) => record.id),
    reportingYearId,
    records.map((record) => record.source_row_key),
  );
  return [
    withSnapshot("avr", calculateAvr(inputs), inputSnapshot),
    withSnapshot("weekly_vmt", calculateWeeklyVmt(inputs), inputSnapshot),
  ];
}

export function calculatePersistedZipRun(
  records: PersistedZipRecord[],
  reportingYearId: string,
): Rule2202PersistedCalculationRun {
  const inputs: Rule2202ZipRecord[] = records.map((record) => ({
    participantKey: record.participant_key,
    oneWayMiles: record.one_way_miles ?? null,
    commuteDays: record.commute_days,
    valid:
      record.validation_status === "valid" ||
      record.validation_status === "warning",
  }));
  return withSnapshot(
    "zip_vmt",
    calculateZipVmt(inputs),
    buildInputSnapshot(
      records.map((record) => record.id),
      reportingYearId,
      records.map((record) => record.participant_key),
    ),
  );
}

function toCommuteRecord(record: Rule2202SurveyRecord): Rule2202CommuteRecord {
  const mode = normalizeMode(record.commute_mode);
  return {
    participantKey: record.participant_key,
    mode,
    occupants: record.vehicle_occupancy ?? null,
    oneWayMiles: record.one_way_miles ?? null,
    commuteDays: record.commute_days,
    reportedToSite: record.reported_to_site,
    remoteDay: record.remote_day,
  };
}

function normalizeMode(mode: string): Rule2202CommuteRecord["mode"] {
  const normalized = mode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  const aliases: Record<string, Rule2202CommuteRecord["mode"]> = {
    drive_alone: "drive_alone",
    carpool: "carpool",
    vanpool: "vanpool",
    motorcycle: "motorcycle",
    transit: "transit",
    bus: "transit",
    rail: "transit",
    walk: "walk",
    bike: "bike",
    bicycle: "bike",
    telecommute: "telecommute",
    remote: "telecommute",
    non_commuting: "non_commuting",
  };
  return aliases[normalized] ?? "non_commuting";
}

function buildInputSnapshot(
  recordIds: Array<string | undefined>,
  reportingYearId: string,
  sourceRowKeys: string[],
) {
  return {
    recordIds: recordIds.filter((id): id is string => Boolean(id)),
    reportingYearId,
    sourceRowKeys,
  };
}

function withSnapshot(
  calculationType: Rule2202PersistedCalculationRun["calculationType"],
  result: Rule2202CalculationResult,
  inputSnapshot: Rule2202PersistedCalculationRun["inputSnapshot"],
): Rule2202PersistedCalculationRun {
  return { ...result, calculationType, inputSnapshot };
}
