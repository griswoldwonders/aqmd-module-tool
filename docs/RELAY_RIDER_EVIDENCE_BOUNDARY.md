# Relay Rider Evidence Ownership Boundary

## Purpose

The AQMD module is a governed analytical/compliance workspace. It is not a second canonical commuter database.

## Relay Rider-originated records

Relay Rider application records are owned by the canonical Django/PostgreSQL domain (`relay_app`). Evidence derived from those records must be created by the Relay Rider server-side evidence projection service. The AQMD browser treats rows whose provenance is `source_system=relay_rider_projection` (and the legacy marker `relay_rider`) as read-only and rejects attempts to author them through its direct PostgREST write path.

## External institutional evidence

The AQMD workbench may continue to ingest evidence supplied independently by an institution, such as an authorized commute survey or CSV. Browser-created commute observations are explicitly tagged in `original_payload` as:

```json
{"source_system":"external_institution_import"}
```

This provenance marker distinguishes external evidence from evidence generated from Relay Rider canonical commuter records. The legacy marker `external_institutional_import` is still recognized as external when classifying existing rows.

## Compatibility wrapper

`insertCommuteObservations` remains temporarily available for existing UI call sites, but it delegates to `insertExternalCommuteObservations`. It therefore receives the same Relay Rider-origin rejection and external provenance tagging. New code should call `insertExternalCommuteObservations` directly.

## Database write barrier

Browser-side rejection is necessary but not sufficient. A PostgreSQL trigger that blocks `anon`/`authenticated` mutation of Relay Rider-originated evidence lives in the Relay Rider repository as:

`supabase/migrations/20260909171500_restrict_relay_rider_evidence_browser_authorship.sql`

That trigger, and the unique `relay_projection_key` index, are **not applied by this change**. Production DDL remains a separate explicit approval. Until that trigger is applied, RLS still allows organization managers to `INSERT`/`UPDATE`/`DELETE` evidence rows; the AQMD client must not offer those operations for Relay Rider-originated records.

## Guardrails

- Do not copy precise residential addresses into evidence observations.
- Do not use the browser to bypass the canonical Relay Rider projection service.
- Do not treat Rule 2202 calculation output as certification or regulatory approval.
- Locked evidence periods must remain reproducible.
- Tenant authorization remains enforced by authenticated Supabase RLS/RPC policy and by server-side Relay Rider tenant checks for projected records.
- Do not place Supabase service-role credentials in browser code.
