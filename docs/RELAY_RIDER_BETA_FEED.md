# Relay Rider beta downstream feed

This application consumes commuter data from the canonical Relay Rider beta
application. It does not author commuter records and does not write back to
Relay Rider.

## Contract

- Feed contract: `rr-aqmd-feed-v1`
- Client: `src/relayRiderFeed.ts`
- Beta endpoint: `GET /api/institutions/{institution_id}/aqmd-feed/`
- Expected source: validated beta `CommuterRecord` rows
- Downstream use: Rule 2202/TDM analysis, administrative review, dashboard,
  and export

The adapter rejects an unknown contract version or a feed that does not declare
itself read-only. It preserves beta source import IDs, row numbers, SHA-256
hashes, provenance, zones, schedule fields, EV/hybrid signals, and parking
signals in `original_payload`.

## Security boundary

The beta API enforces institution scope. The AQMD client must receive a
short-lived beta access token from an approved integration runtime. Never put a
long-lived token or server secret in a `VITE_*` variable or committed source.

## Product boundary

AQMD outputs are modeled/assessed institutional results. They are not
regulatory certification, compliance approval, guaranteed transportation,
automatic payments, or commuter-facing route activation.

A live connection requires a deployed beta API URL, reviewed token exchange,
and a synthetic Pasadena smoke test proving IDs, hashes, and cross-tenant
denials.
