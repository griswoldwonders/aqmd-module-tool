import assert from "node:assert/strict";
import test from "node:test";

import {
  RELAY_RIDER_AQMD_FEED_CONTRACT,
  fetchRelayRiderAqmdFeed,
  toRule2202SurveyRecords,
  type RelayRiderAqmdFeed,
} from "../src/relayRiderFeed.ts";
import { prepareExternalEvidenceRow } from "../src/evidenceProvenance.ts";

function feed(overrides: Partial<RelayRiderAqmdFeed> = {}): RelayRiderAqmdFeed {
  return {
    contract_version: RELAY_RIDER_AQMD_FEED_CONTRACT,
    generated_at: "2026-09-08T00:00:00.000Z",
    institution: { id: "1", name: "Pasadena Demo", slug: "pasadena-demo" },
    guardrails: {
      source_of_truth: "relay-rider-beta-django",
      downstream_consumer: "aqmd-module-tool",
      writes_to_beta: false,
      rule2202_is_certification: false,
      records_are_validated_only: true,
    },
    imports: [],
    records: [{
      record_id: "91",
      external_id: "secret-employee-id",
      organization_id: "1",
      institution_id: "1",
      site_id: "2",
      site_name: "Pasadena HQ",
      cohort_id: "3",
      cohort_name: "Employees",
      origin_zone: "Eagle Rock",
      destination_zone: "Pasadena",
      commute_days: 5,
      arrival_window: "07:30-08:00",
      departure_window: "16:30-17:00",
      schedule_flex_minutes: 15,
      commute_mode: "drive_alone",
      vehicle_occupancy: 1,
      vehicle_fuel_type: "gasoline",
      parking_difficulty: "high",
      ev_interest: false,
      access_point_willing: true,
      consent_confirmed: true,
      validation_status: "valid",
      source_import_id: "11",
      source_row_number: 2,
      source_sha256: "aa",
      source_provenance: "synthetic",
      source_type: "synthetic",
      record_created_at: "2026-09-08T00:00:00.000Z",
      record_updated_at: "2026-09-08T12:00:00.000Z",
    }],
    rule2202_runs: [],
    ...overrides,
  };
}

test("unsupported feed contract versions are rejected", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ...feed(),
    contract_version: "rr-aqmd-feed-v0",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    await assert.rejects(
      () => fetchRelayRiderAqmdFeed({
        betaApiBaseUrl: "https://example.invalid/api",
        institutionId: "1",
        relayRiderAccessToken: "token",
      }),
      /Unsupported Relay Rider AQMD feed contract version/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("feed mapping does not use raw external IDs as participant keys", () => {
  const records = toRule2202SurveyRecords(feed(), "year-1");
  assert.equal(records[0].participant_key, "rr_record_91");
  assert.notEqual(records[0].participant_key, "secret-employee-id");
  assert.equal(records[0].original_payload?.source_system, "relay_rider_projection");
  assert.ok(!JSON.stringify(records[0].original_payload).includes("secret-employee-id"));
});

test("mapped Relay Rider feed rows cannot be written through the AQMD browser path", () => {
  const [record] = toRule2202SurveyRecords(feed(), "year-1");
  assert.throws(
    () => prepareExternalEvidenceRow({
      organization_id: record.organization_id,
      site_id: record.site_id,
      participant_key: record.participant_key,
      observation_date: record.observation_date,
      commute_mode: "drive_alone",
      reported_to_site: true,
      remote_day: false,
      ev_hybrid_status: "ice",
      validation_status: "valid",
      original_payload: record.original_payload,
    }),
    /read-only/,
  );
});
