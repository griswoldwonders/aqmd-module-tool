import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_INSTITUTION_IMPORT_SOURCE,
  classifyEvidenceSource,
  isRelayRiderProjectedEvidence,
  prepareExternalEvidenceRow,
} from "../src/evidenceProvenance.ts";

const sampleRow = {
  organization_id: "org-1",
  site_id: "site-1",
  participant_key: "EMP-1",
  observation_date: "2026-09-08",
  commute_mode: "drive_alone" as const,
  reported_to_site: true,
  remote_day: false,
  ev_hybrid_status: "ice" as const,
  validation_status: "valid" as const,
};

test("external institutional rows are tagged before insert", () => {
  const prepared = prepareExternalEvidenceRow({
    ...sampleRow,
    original_payload: { commute_mode: "drive_alone" },
  });
  assert.equal(prepared.original_payload?.source_system, EXTERNAL_INSTITUTION_IMPORT_SOURCE);
  assert.equal(classifyEvidenceSource(prepared.original_payload), "external_institution_import");
});

test("Relay Rider projection provenance is rejected before network execution", () => {
  assert.throws(
    () => prepareExternalEvidenceRow({
      ...sampleRow,
      original_payload: { source_system: "relay_rider_projection" },
    }),
    /read-only/,
  );
  assert.throws(
    () => prepareExternalEvidenceRow({
      ...sampleRow,
      original_payload: { source_system: "relay_rider" },
    }),
    /read-only/,
  );
  assert.equal(isRelayRiderProjectedEvidence({ source_system: "relay_rider_projection" }), true);
});
