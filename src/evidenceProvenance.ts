export const RELAY_RIDER_PROJECTION_SOURCE = "relay_rider_projection";
export const LEGACY_RELAY_RIDER_SOURCE = "relay_rider";
export const EXTERNAL_INSTITUTION_IMPORT_SOURCE = "external_institution_import";
export const LEGACY_EXTERNAL_INSTITUTION_IMPORT_SOURCE = "external_institutional_import";

const RELAY_RIDER_SOURCES = new Set([RELAY_RIDER_PROJECTION_SOURCE, LEGACY_RELAY_RIDER_SOURCE]);

export function evidenceSourceSystem(payload?: Record<string, unknown> | null): string | undefined {
  const value = payload?.source_system;
  return typeof value === "string" ? value : undefined;
}

export function isRelayRiderProjectedEvidence(payload?: Record<string, unknown> | null): boolean {
  const source = evidenceSourceSystem(payload);
  return source !== undefined && RELAY_RIDER_SOURCES.has(source);
}

export function classifyEvidenceSource(payload?: Record<string, unknown> | null): "relay_rider_projection" | "external_institution_import" | "unclassified" {
  if (isRelayRiderProjectedEvidence(payload)) return "relay_rider_projection";
  const source = evidenceSourceSystem(payload);
  if (source === EXTERNAL_INSTITUTION_IMPORT_SOURCE || source === LEGACY_EXTERNAL_INSTITUTION_IMPORT_SOURCE) {
    return "external_institution_import";
  }
  return "unclassified";
}

export function prepareExternalEvidenceRow<T extends { original_payload?: Record<string, unknown> }>(row: T): T {
  if (isRelayRiderProjectedEvidence(row.original_payload)) {
    throw new Error("Relay Rider-originated evidence is read-only in the AQMD browser; use the server-side projection boundary.");
  }
  return {
    ...row,
    original_payload: {
      ...(row.original_payload ?? {}),
      source_system: EXTERNAL_INSTITUTION_IMPORT_SOURCE,
    },
  };
}
