export const RULE_2202_METHODOLOGY_VERSION = "AQMD_RULE_2202_2025_VMT";

export type Rule2202ApplicabilityStatus =
  | "applicable"
  | "exempt"
  | "needs_review";

export type Rule2202ApplicabilityInput = {
  sixMonthEmployeeCounts: number[];
  peakWindowEmployeeCount: number | null;
  sourceLabel: string | null;
  sourceAsOf: string | null;
};

export type Rule2202ApplicabilityResult = {
  status: Rule2202ApplicabilityStatus;
  averageEmployeeCount: number | null;
  sixMonthMinimum: number | null;
  sixMonthMaximum: number | null;
  reason: string;
};

export function assessRule2202Applicability(
  input: Rule2202ApplicabilityInput,
): Rule2202ApplicabilityResult {
  const counts = input.sixMonthEmployeeCounts;
  const hasSixMonthEvidence =
    counts.length === 6 &&
    counts.every((count) => Number.isInteger(count) && count >= 0);
  const averageEmployeeCount = hasSixMonthEvidence
    ? round(counts.reduce((sum, count) => sum + count, 0) / counts.length, 2)
    : null;
  const sixMonthMinimum = hasSixMonthEvidence ? Math.min(...counts) : null;
  const sixMonthMaximum = hasSixMonthEvidence ? Math.max(...counts) : null;
  const hasPeakWindowEvidence =
    Number.isInteger(input.peakWindowEmployeeCount) &&
    (input.peakWindowEmployeeCount ?? -1) >= 0;
  const hasProvenance = Boolean(input.sourceLabel && input.sourceAsOf);

  if (!hasSixMonthEvidence || !hasPeakWindowEvidence || !hasProvenance) {
    return {
      status: "needs_review",
      averageEmployeeCount,
      sixMonthMinimum,
      sixMonthMaximum,
      reason:
        "Six-month employee counts, peak-window evidence, and source provenance are all required before applicability can be determined.",
    };
  }

  if ((averageEmployeeCount ?? 0) < 250) {
    return {
      status: "exempt",
      averageEmployeeCount,
      sixMonthMinimum,
      sixMonthMaximum,
      reason:
        "The documented six-month average employee count is below the Rule 2202 applicability threshold.",
    };
  }

  return {
    status: "applicable",
    averageEmployeeCount,
    sixMonthMinimum,
    sixMonthMaximum,
    reason:
      "The documented six-month average employee count meets the Rule 2202 applicability threshold.",
  };
}

export type Rule2202CommuteRecord = {
  participantKey: string;
  mode:
    | "drive_alone"
    | "carpool"
    | "vanpool"
    | "motorcycle"
    | "transit"
    | "walk"
    | "bike"
    | "telecommute"
    | "non_commuting";
  occupants?: number | null;
  oneWayMiles: number | null;
  commuteDays: number;
  reportedToSite: boolean;
  remoteDay: boolean;
};

export type Rule2202CalculationResult = {
  value: number;
  unit: string;
  inputRecordCount: number;
  excludedRecordCount: number;
  methodologyVersion: string;
  payload: Record<string, unknown>;
};

export type Rule2202ZipRecord = {
  participantKey: string;
  oneWayMiles: number | null;
  commuteDays: number;
  valid: boolean;
};

export function validateRule2202CommuteRecord(
  record: Rule2202CommuteRecord,
): string[] {
  const errors: string[] = [];
  if (!record.participantKey.trim())
    errors.push("Participant identity is required.");
  if (!Number.isFinite(record.commuteDays) || record.commuteDays < 0)
    errors.push("Commute days must be zero or greater.");
  if (
    record.oneWayMiles !== null &&
    (!Number.isFinite(record.oneWayMiles) || record.oneWayMiles < 0)
  )
    errors.push("One-way miles must be zero or greater.");
  if (
    (record.mode === "drive_alone" ||
      record.mode === "carpool" ||
      record.mode === "vanpool" ||
      record.mode === "motorcycle") &&
    record.oneWayMiles === null
  ) {
    errors.push("Motor-vehicle records require one-way miles.");
  }
  if (record.remoteDay && record.reportedToSite)
    errors.push("A remote day cannot also be reported as on-site.");
  return errors;
}

export function vehicleTripWeight(
  mode: Rule2202CommuteRecord["mode"],
  occupants: number | null = null,
): number {
  if (mode === "drive_alone") return 1;
  if (mode === "carpool")
    return validOccupancyWeight(occupants, 2, 6, "carpool");
  if (mode === "vanpool")
    return validOccupancyWeight(occupants, 7, 15, "vanpool");
  if (mode === "motorcycle")
    return validOccupancyWeight(occupants, 1, 1, "motorcycle");
  return 0;
}

export function calculateAvr(
  records: Rule2202CommuteRecord[],
): Rule2202CalculationResult {
  const eligible = records.filter(
    (record) => record.reportedToSite && !record.remoteDay,
  );
  const vehicleTrips = eligible.reduce(
    (sum, record) => sum + vehicleTripWeight(record.mode, record.occupants),
    0,
  );
  const employees = new Set(eligible.map((record) => record.participantKey))
    .size;

  return {
    value: vehicleTrips === 0 ? 0 : round(employees / vehicleTrips, 2),
    unit: "employees/vehicle-trip",
    inputRecordCount: records.length,
    excludedRecordCount: records.length - eligible.length,
    methodologyVersion: RULE_2202_METHODOLOGY_VERSION,
    payload: { employees, vehicleTrips },
  };
}

export function calculateWeeklyVmt(
  records: Rule2202CommuteRecord[],
): Rule2202CalculationResult {
  const eligible = records.filter(
    (record) => record.oneWayMiles !== null && record.oneWayMiles >= 0,
  );
  const modeTotals = eligible.reduce<Record<string, number>>(
    (totals, record) => {
      const roundTripMiles = (record.oneWayMiles ?? 0) * 2;
      const modeTotal = roundTripMiles * record.commuteDays;
      totals[record.mode] = (totals[record.mode] ?? 0) + modeTotal;
      return totals;
    },
    {},
  );
  const total = Object.values(modeTotals).reduce(
    (sum, modeTotal) => sum + modeTotal,
    0,
  );

  return {
    value: round(total, 2),
    unit: "miles/week",
    inputRecordCount: records.length,
    excludedRecordCount: records.length - eligible.length,
    methodologyVersion: RULE_2202_METHODOLOGY_VERSION,
    payload: { eligibleRecordCount: eligible.length, modeTotals },
  };
}

export function calculateZipVmt(
  records: Rule2202ZipRecord[],
): Rule2202CalculationResult {
  const eligible = records.filter(
    (record) =>
      record.valid && record.oneWayMiles !== null && record.oneWayMiles >= 0,
  );
  const total = eligible.reduce(
    (sum, record) => sum + (record.oneWayMiles ?? 0) * 2 * record.commuteDays,
    0,
  );
  const dailyTotal = eligible.reduce(
    (sum, record) => sum + (record.oneWayMiles ?? 0) * 2,
    0,
  );

  return {
    value: round(total, 2),
    unit: "miles/week",
    inputRecordCount: records.length,
    excludedRecordCount: records.length - eligible.length,
    methodologyVersion: RULE_2202_METHODOLOGY_VERSION,
    payload: {
      eligibleRecordCount: eligible.length,
      distanceSource: "approved_zip_distance_input",
      dailyTotal,
      weeklyTotal: total,
    },
  };
}

function validOccupancyWeight(
  occupants: number | null,
  minimum: number,
  maximum: number,
  mode: string,
): number {
  if (
    occupants === null ||
    !Number.isInteger(occupants) ||
    occupants < minimum ||
    occupants > maximum
  ) {
    throw new Error(
      `${mode} occupants must be between ${minimum} and ${maximum}.`,
    );
  }
  return 1 / occupants;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
