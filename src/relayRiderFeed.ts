import type { Rule2202SurveyRecord } from "./rule2202Api";

export const RELAY_RIDER_AQMD_FEED_CONTRACT = "rr-aqmd-feed-v1";

export type RelayRiderAqmdFeedRow = Rule2202SurveyRecord & {
  record_id: string;
  external_id: string;
  institution_id: string;
  site_name: string;
  cohort_id: string;
  cohort_name: string;
  destination_zone: string;
  schedule_flex_minutes: number;
  vehicle_fuel_type: string;
  parking_difficulty: string;
  ev_interest: boolean;
  access_point_willing: boolean;
  consent_confirmed: boolean;
  source_import_id: string;
  source_row_number: number;
  source_sha256: string;
  source_provenance: string;
  source_type: string;
  record_created_at: string;
  record_updated_at: string;
};

export type RelayRiderAqmdFeed = {
  contract_version: string;
  generated_at: string;
  institution: { id: string; name: string; slug: string };
  guardrails: {
    source_of_truth: string;
    downstream_consumer: string;
    writes_to_beta: boolean;
    rule2202_is_certification: boolean;
    records_are_validated_only: boolean;
  };
  imports: Array<{
    import_id: string;
    site_id: string;
    cohort_id: string;
    file_name: string;
    file_sha256: string;
    status: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    validation_summary: Record<string, unknown>;
    source_type: string;
    provenance_label: string;
    created_at: string;
    updated_at: string;
  }>;
  records: RelayRiderAqmdFeedRow[];
  rule2202_runs: Array<Record<string, unknown>>;
};

function normalizeCommuteDays(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function parseFeed(response: Response): Promise<RelayRiderAqmdFeed> {
  return response.text().then((raw) => {
    const body = raw ? JSON.parse(raw) : null;
    if (!response.ok) {
      throw new Error(body?.detail ?? `Relay Rider feed request failed (${response.status}).`);
    }
    if (body?.contract_version !== RELAY_RIDER_AQMD_FEED_CONTRACT) {
      throw new Error("Unsupported Relay Rider AQMD feed contract version.");
    }
    if (body?.guardrails?.writes_to_beta !== false) {
      throw new Error("Relay Rider feed is not read-only.");
    }
    return body as RelayRiderAqmdFeed;
  });
}

/**
 * Fetch the beta's institution-scoped, validated commuter projection.
 * The caller must supply an authenticated beta API token; this module never
 * stores credentials and cannot write back to Relay Rider.
 */
export async function fetchRelayRiderAqmdFeed(args: {
  betaApiBaseUrl: string;
  institutionId: string;
  relayRiderAccessToken: string;
}): Promise<RelayRiderAqmdFeed> {
  const base = args.betaApiBaseUrl.replace(/\/$/, "");
  const response = await fetch(
    `${base}/institutions/${encodeURIComponent(args.institutionId)}/aqmd-feed/`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Token ${args.relayRiderAccessToken}`,
      },
      cache: "no-store",
    },
  );
  return parseFeed(response);
}

/**
 * Convert the beta projection into the AQMD Rule 2202 survey input shape.
 * Source IDs, row numbers, hashes, and original fields remain available in
 * the feed for provenance and audit records.
 */
export function toRule2202SurveyRecords(
  feed: RelayRiderAqmdFeed,
  reportingYearId: string,
): Rule2202SurveyRecord[] {
  return feed.records.map((row) => ({
    organization_id: row.organization_id,
    site_id: row.site_id,
    reporting_year_id: reportingYearId,
    source_id: row.source_import_id,
    source_row_key: `${row.source_import_id}:${row.source_row_number}`,
    participant_key: row.external_id,
    observation_date: row.record_updated_at.slice(0, 10),
    commute_mode: row.commute_mode,
    vehicle_occupancy: row.vehicle_occupancy,
    one_way_miles: null,
    commute_days: normalizeCommuteDays(row.commute_days),
    reported_to_site: row.consent_confirmed,
    remote_day: row.commute_mode.toLowerCase() === "remote",
    validation_status: "valid",
    original_payload: {
      relay_rider_contract: feed.contract_version,
      relay_rider_record_id: row.record_id,
      source_sha256: row.source_sha256,
      source_provenance: row.source_provenance,
      source_row_number: row.source_row_number,
      origin_zone: row.origin_zone,
      destination_zone: row.destination_zone,
      arrival_window: row.arrival_window,
      departure_window: row.departure_window,
      schedule_flex_minutes: row.schedule_flex_minutes,
      vehicle_fuel_type: row.vehicle_fuel_type,
      parking_difficulty: row.parking_difficulty,
      ev_interest: row.ev_interest,
      access_point_willing: row.access_point_willing,
      consent_confirmed: row.consent_confirmed,
    },
  }));
}
