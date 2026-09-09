# Relay Rider Evidence Ownership Boundary

## Purpose

The AQMD module is a governed analytical/compliance workspace. It is not a second canonical commuter database.

## Relay Rider-originated records

Relay Rider application records are owned by the canonical Django/PostgreSQL domain (`relay_app`). Evidence derived from those records must be created by the Relay Rider server-side evidence projection service. The AQMD browser treats rows whose provenance is `source_system=relay_rider` as read-only and rejects attempts to author them through its direct PostgREST write path.

## External institutional evidence

The AQMD workbench may continue to ingest evidence supplied independently by an institution, such as an authorized commute survey or CSV. Browser-created commute observations are explicitly tagged in `original_payload` as:

```json
{"source_system":"external_institutional_import"}
```

This provenance marker distinguishes external evidence from evidence generated from Relay Rider canonical commuter records.

## Compatibility wrapper

`insertCommuteObservations` remains temporarily available for existing UI call sites, but it delegates to `insertExternalCommuteObservations`. It therefore receives the same Relay Rider-origin rejection and external provenance tagging. New code should call `insertExternalCommuteObservations` directly.

## Guardrails

- Do not copy precise residential addresses into evidence observations.
- Do not use the browser to bypass the canonical Relay Rider projection service.
- Do not treat Rule 2202 calculation output as certification or regulatory approval.
- Locked evidence periods must remain reproducible.
- Tenant authorization remains enforced by authenticated Supabase RLS/RPC policy and by server-side Relay Rider tenant checks for projected records.
