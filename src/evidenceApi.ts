import type { SaasSession } from "./saasApi";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://dzrqrqfxcihvufvyctbt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_hLCfTlWFEQRkwKUwz5Wv2g_DwoVqPy1";

export type EvidenceBaseline = {
  id: string; organization_id: string; site_id: string; cohort_id: string | null; source_id: string | null;
  name: string; status: string; baseline_start: string; baseline_end: string; methodology_version: string;
  input_record_count: number; valid_record_count: number; blocking_issue_count: number; locked_at: string | null;
};
export type ObservationPeriod = {
  id: string; organization_id: string; site_id: string; cohort_id: string | null; baseline_id: string | null; source_id: string | null;
  name: string; status: string; observation_start: string; observation_end: string; methodology_version: string;
  input_record_count: number; valid_record_count: number; blocking_issue_count: number; locked_at: string | null;
};
export type CommuteObservation = {
  id?: string; organization_id: string; site_id: string; cohort_id?: string | null; baseline_id?: string | null; observation_period_id?: string | null;
  source_id?: string | null; participant_key: string; observation_date: string; origin_zone?: string | null; commute_mode: NormalizedMode;
  source_mode?: string | null; one_way_miles?: number | null; vehicle_occupancy?: number | null; reported_to_site: boolean; remote_day: boolean;
  ev_hybrid_status: "ev" | "plug_in_hybrid" | "hybrid" | "ice" | "unknown" | "not_applicable"; parking_difficulty?: number | null;
  arrival_window?: string | null; departure_window?: string | null; validation_status: "unvalidated" | "valid" | "warning" | "blocking_error" | "excluded";
  exclusion_reason?: string | null; source_row_number?: number | null; original_payload?: Record<string, unknown>;
};
export type EvidenceMetricValue = {
  id: string; metric_key: string; metric_value: number | null; unit: string; numerator: number | null; denominator: number | null; sample_size: number | null;
  evidence_class: string; source_label: string; source_vintage: string | null; geography_label: string | null; methodology_version: string;
  methodology_note: string | null; limitation_note: string | null; calculated_at: string; baseline_id: string | null; observation_period_id: string | null;
};
export type NormalizedMode = "drive_alone" | "carpool" | "vanpool" | "bus" | "rail" | "walk" | "bike" | "remote" | "compressed_day_off" | "worked_offsite" | "absent" | "other" | "unknown";
export type ValidationIssue = { row: number; participantKey: string; code: string; severity: "blocking_error" | "warning"; message: string };
export type CsvFieldMap = {
  participant_key: string; observation_date: string; origin_zone: string; commute_mode: string; one_way_miles: string; vehicle_occupancy: string;
  remote_day: string; reported_to_site: string; ev_hybrid_status: string; parking_difficulty: string; arrival_window: string; departure_window: string;
};

function headers(token: string) { return { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" }; }
async function parse<T>(response: Response): Promise<T> { const text = await response.text(); const body = text ? JSON.parse(text) : null; if (!response.ok) throw new Error(body?.message ?? body?.hint ?? `Request failed (${response.status})`); return body as T; }
async function rest<T>(session: SaasSession, path: string, init?: RequestInit) { return parse<T>(await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers(session.access_token), ...(init?.headers ?? {}) } })); }

export function listEvidenceBaselines(session: SaasSession, organizationId: string, siteId?: string) {
  return rest<EvidenceBaseline[]>(session, `evidence_baselines?organization_id=eq.${organizationId}${siteId ? `&site_id=eq.${siteId}` : ""}&select=*&order=created_at.desc`);
}
export function createEvidenceBaseline(session: SaasSession, input: { organization_id: string; site_id: string; cohort_id?: string | null; source_id?: string | null; name: string; baseline_start: string; baseline_end: string }) {
  return rest<EvidenceBaseline[]>(session, "evidence_baselines", { method: "POST", body: JSON.stringify({ ...input, cohort_id: input.cohort_id ?? null, source_id: input.source_id ?? null, created_by: session.user.id }) });
}
export function updateEvidenceBaseline(session: SaasSession, baselineId: string, patch: Partial<Pick<EvidenceBaseline,"status"|"input_record_count"|"valid_record_count"|"blocking_issue_count">>) {
  return rest<EvidenceBaseline[]>(session, `evidence_baselines?id=eq.${baselineId}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export function listObservationPeriods(session: SaasSession, organizationId: string, siteId?: string) {
  return rest<ObservationPeriod[]>(session, `evidence_observation_periods?organization_id=eq.${organizationId}${siteId ? `&site_id=eq.${siteId}` : ""}&select=*&order=created_at.desc`);
}
export function createObservationPeriod(session: SaasSession, input: { organization_id: string; site_id: string; cohort_id?: string | null; baseline_id?: string | null; source_id?: string | null; name: string; observation_start: string; observation_end: string }) {
  return rest<ObservationPeriod[]>(session, "evidence_observation_periods", { method: "POST", body: JSON.stringify({ ...input, created_by: session.user.id }) });
}
export function listEvidenceMetrics(session: SaasSession, organizationId: string, siteId: string) {
  return rest<EvidenceMetricValue[]>(session, `evidence_metric_values?organization_id=eq.${organizationId}&site_id=eq.${siteId}&select=*&order=calculated_at.desc`);
}

function prepareExternalEvidenceRow(row: CommuteObservation) {
  const claimedSource = row.original_payload?.source_system;
  if (claimedSource === "relay_rider") {
    throw new Error("Relay Rider-originated evidence is read-only in the AQMD browser; use the server-side projection boundary.");
  }
  return {
    ...row,
    original_payload: {
      ...(row.original_payload ?? {}),
      source_system: "external_institutional_import",
    },
  };
}

export function insertExternalCommuteObservations(session: SaasSession, rows: CommuteObservation[]) {
  if (!rows.length) return Promise.resolve([] as CommuteObservation[]);
  const prepared = rows.map(prepareExternalEvidenceRow);
  return rest<CommuteObservation[]>(session, "evidence_commute_observations", { method: "POST", body: JSON.stringify(prepared.map(row => ({ ...row, created_by: session.user.id }))) });
}

/** @deprecated Compatibility wrapper. It is still external-only and cannot author Relay Rider projections. */
export function insertCommuteObservations(session: SaasSession, rows: CommuteObservation[]) {
  return insertExternalCommuteObservations(session, rows);
}

export function insertValidationIssues(session: SaasSession, args: { organizationId: string; siteId: string; baselineId?: string | null; observationPeriodId?: string | null; issues: ValidationIssue[] }) {
  if (!args.issues.length) return Promise.resolve([] as unknown[]);
  return rest<unknown[]>(session, "evidence_validation_issues", { method: "POST", body: JSON.stringify(args.issues.map(issue => ({ organization_id: args.organizationId, site_id: args.siteId, baseline_id: args.baselineId ?? null, observation_period_id: args.observationPeriodId ?? null, commute_observation_id: null, rule_code: issue.code, severity: issue.severity, message: `CSV row ${issue.row}: ${issue.message}`, resolution_hint: issue.severity === "blocking_error" ? "Correct the source row or explicitly exclude it before locking the baseline." : "Review before finalizing the evidence period." }))) });
}
export async function lockEvidenceBaseline(session: SaasSession, baselineId: string) {
  return parse<EvidenceBaseline>(await fetch(`${SUPABASE_URL}/rest/v1/rpc/lock_evidence_baseline`, { method: "POST", headers: headers(session.access_token), body: JSON.stringify({ target_baseline: baselineId }) }));
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line: string) => { const out: string[] = []; let cell = ""; let quoted = false; for (let i=0;i<line.length;i++){ const c=line[i]; if(c==='"'){ if(quoted && line[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; } else if(c===',' && !quoted){out.push(cell.trim());cell="";} else cell+=c;} out.push(cell.trim()); return out; };
  const columns = split(lines[0]);
  return { headers: columns, rows: lines.slice(1).map(line => { const values = split(line); return Object.fromEntries(columns.map((h,i)=>[h, values[i] ?? ""])); }) };
}

export function guessFieldMap(headers: string[]): CsvFieldMap {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const find = (...candidates: string[]) => headers.find(h => candidates.includes(norm(h))) ?? "";
  return {
    participant_key: find("participant_id","employee_id","participant_key","commuter_id","id"), observation_date: find("date","work_date","observation_date","survey_date"),
    origin_zone: find("home_zip","origin_zip","origin_zone","home_zone","zip"), commute_mode: find("commute_mode","mode","primary_mode","travel_mode"),
    one_way_miles: find("one_way_miles","one_way_distance","commute_distance","distance_miles"), vehicle_occupancy: find("vehicle_occupancy","occupancy","carpool_occupancy"),
    remote_day: find("remote_day","telecommute","work_from_home","wfh"), reported_to_site: find("reported_to_site","reported_to_worksite","on_site","onsite"),
    ev_hybrid_status: find("ev_hybrid_status","vehicle_type","fuel_type","ev_status"), parking_difficulty: find("parking_difficulty","parking_pressure","parking_difficulty_score"),
    arrival_window: find("arrival_window","arrival_time","start_time"), departure_window: find("departure_window","departure_time","end_time"),
  };
}

const MODE_MAP: Record<string, NormalizedMode> = {
  drive_alone:"drive_alone", single_occupancy_vehicle:"drive_alone", sov:"drive_alone", car:"drive_alone", carpool:"carpool", carpool_2:"carpool", vanpool:"vanpool",
  bus:"bus", public_bus:"bus", metro_bus:"bus", rail:"rail", metro:"rail", train:"rail", light_rail:"rail", walk:"walk", walking:"walk", bicycle:"bike", bike:"bike", cycling:"bike",
  remote:"remote", telecommute:"remote", work_from_home:"remote", wfh:"remote", compressed_day_off:"compressed_day_off", worked_offsite:"worked_offsite", absent:"absent", other:"other", unknown:"unknown"
};
function normalizeToken(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function boolValue(value: string, fallback: boolean) { if (!value) return fallback; return ["true","1","yes","y"].includes(value.trim().toLowerCase()); }
function numberValue(value: string) { if (!value.trim()) return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function vehicleStatus(value: string): CommuteObservation["ev_hybrid_status"] { const v=normalizeToken(value); if(["ev","electric","bev","battery_electric"].includes(v)) return "ev"; if(["phev","plug_in_hybrid"].includes(v)) return "plug_in_hybrid"; if(v==="hybrid") return "hybrid"; if(["ice","gas","gasoline","diesel"].includes(v)) return "ice"; return "unknown"; }

export function normalizeCsvRows(args: { rawRows: Record<string,string>[]; fieldMap: CsvFieldMap; organizationId: string; siteId: string; cohortId?: string | null; sourceId?: string | null; baselineId?: string | null; observationPeriodId?: string | null }) {
  const issues: ValidationIssue[] = []; const seen = new Set<string>();
  const rows = args.rawRows.map((raw, index): CommuteObservation => {
    const get=(field:keyof CsvFieldMap)=>args.fieldMap[field] ? raw[args.fieldMap[field]] ?? "" : ""; const participant=get("participant_key").trim(); const date=get("observation_date").trim(); const sourceMode=get("commute_mode").trim();
    const mode=MODE_MAP[normalizeToken(sourceMode)] ?? "unknown"; const distance=numberValue(get("one_way_miles")); const occupancy=numberValue(get("vehicle_occupancy")); const remote=mode==="remote" || boolValue(get("remote_day"),false); const reported=boolValue(get("reported_to_site"), !remote && mode!=="compressed_day_off" && mode!=="absent");
    const rowIssues: ValidationIssue[]=[]; const add=(code:string,severity:"blocking_error"|"warning",message:string)=>rowIssues.push({row:index+2,participantKey:participant,code,severity,message});
    if(!participant) add("PARTICIPANT_ID_MISSING","blocking_error","Participant ID is required."); if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) add("DATE_INVALID","blocking_error","Observation date must use YYYY-MM-DD.");
    if(mode==="unknown") add("MODE_UNKNOWN","blocking_error",`Commute mode '${sourceMode || "blank"}' is not mapped.`); if(distance!=null && distance<0) add("DISTANCE_NEGATIVE","blocking_error","One-way distance cannot be negative.");
    if(["drive_alone","carpool","vanpool"].includes(mode) && distance==null) add("DISTANCE_MISSING","blocking_error","Motor-vehicle commute requires one-way distance.");
    if(["carpool","vanpool"].includes(mode) && (occupancy==null || occupancy<2)) add("OCCUPANCY_INVALID","blocking_error","Carpool/vanpool requires occupancy of at least 2.");
    if(remote && reported) add("REMOTE_SITE_CONFLICT","blocking_error","Remote day cannot also be reported as on-site."); if(remote && (distance ?? 0)>0) add("REMOTE_DISTANCE_NONZERO","warning","Remote day has non-zero commute distance.");
    const duplicateKey=`${participant}|${date}`; if(participant && date){ if(seen.has(duplicateKey)) add("DUPLICATE_PARTICIPANT_DATE","blocking_error","Duplicate participant/date record."); else seen.add(duplicateKey); }
    issues.push(...rowIssues); const blocking=rowIssues.some(i=>i.severity==="blocking_error"); const warning=rowIssues.some(i=>i.severity==="warning");
    return { organization_id:args.organizationId, site_id:args.siteId, cohort_id:args.cohortId??null, source_id:args.sourceId??null, baseline_id:args.baselineId??null, observation_period_id:args.observationPeriodId??null,
      participant_key:participant || `INVALID_ROW_${index+2}`, observation_date:date || "1970-01-01", origin_zone:get("origin_zone").trim()||null, commute_mode:mode, source_mode:sourceMode||null, one_way_miles:distance, vehicle_occupancy:occupancy,
      reported_to_site:reported, remote_day:remote, ev_hybrid_status:vehicleStatus(get("ev_hybrid_status")), parking_difficulty:numberValue(get("parking_difficulty")), arrival_window:get("arrival_window").trim()||null,
      departure_window:get("departure_window").trim()||null, validation_status:blocking?"blocking_error":warning?"warning":"valid", source_row_number:index+2, original_payload:raw };
  });
  return { rows, issues };
}

export function calculatePreviewMetrics(rows: CommuteObservation[]) {
  const valid = rows.filter(r=>r.validation_status==="valid" || r.validation_status==="warning"); const participants=new Set(valid.map(r=>r.participant_key));
  const vehicleVmt=(r:CommuteObservation)=>{ const miles=(r.one_way_miles??0)*2; if(r.commute_mode==="drive_alone") return miles; if(r.commute_mode==="carpool"||r.commute_mode==="vanpool") return miles/Math.max(1,r.vehicle_occupancy??1); return 0; };
  const weeklyVmt=valid.reduce((sum,r)=>sum+vehicleVmt(r),0); const drive=valid.filter(r=>r.commute_mode==="drive_alone").length; const remote=valid.filter(r=>r.commute_mode==="remote").length;
  return { participantCount:participants.size, validRows:valid.length, weeklyVmt, driveAloneShare:valid.length?drive/valid.length*100:0, remoteShare:valid.length?remote/valid.length*100:0 };
}
