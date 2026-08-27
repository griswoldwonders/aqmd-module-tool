import { useEffect, useMemo, useState } from "react";
import "./rule-2202-workspace.css";
import {
  createCompliancePackage,
  createReportingYear,
  getEmployeePopulation,
  listCalculationRuns,
  listCompliancePackages,
  listReportingYears,
  listValidationIssues,
  saveEmployeePopulation,
  updateCompliancePackage,
  updateReportingYear,
  type Rule2202CalculationRun,
  type Rule2202CompliancePackage,
  type Rule2202EmployeePopulation,
  type Rule2202ReportingYear,
  type Rule2202ValidationIssue,
} from "./rule2202Api";
import { assessRule2202Applicability } from "./rule2202ComplianceDomain";
import {
  buildHistoricalPackageSnapshot,
  evaluateRule2202Compliance,
} from "./rule2202Engine";
import {
  buildAqmdAnnualComplianceExport,
  downloadJsonExport,
} from "./rule2202Export";
import {
  listOrganizations,
  listSites,
  restoreSession,
  signIn,
  signOut,
  type Organization,
  type OrganizationSite,
  type SaasSession,
} from "./saasApi";

type Status = "ready" | "review" | "blocked" | "not_started";
type StepId =
  | "worksite"
  | "population"
  | "pathway"
  | "validation"
  | "metrics"
  | "package";
type VmtPathway = "survey" | "zip" | null;
type ValidationFilter = "all" | "blocking" | "review" | "resolved";

const informationalRules = [
  [
    "blocking",
    "Missing commute mode",
    "commute_mode",
    "Required employee-day commute mode is absent.",
  ],
  [
    "blocking",
    "Missing one-way distance",
    "one_way_miles",
    "Required for survey-based VMT input.",
  ],
  [
    "blocking",
    "Invalid or missing ZIP",
    "home_zip",
    "Required for ZIP-based VMT input.",
  ],
  [
    "review",
    "Duplicate employee-day",
    "employee_day",
    "Potential duplicate needs administrator review.",
  ],
  [
    "review",
    "Unrecognized AQMD mode",
    "commute_mode",
    "Source value needs normalization.",
  ],
] as const;

export default function Rule2202Workspace() {
  const [activeStep, setActiveStep] = useState<StepId>("worksite");
  const [session, setSession] = useState<SaasSession | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<OrganizationSite[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [years, setYears] = useState<Rule2202ReportingYear[]>([]);
  const [yearId, setYearId] = useState("");
  const [reportingYear, setReportingYear] = useState("2026");
  const [population, setPopulation] =
    useState<Rule2202EmployeePopulation | null>(null);
  const [issues, setIssues] = useState<Rule2202ValidationIssue[]>([]);
  const [runs, setRuns] = useState<Rule2202CalculationRun[]>([]);
  const [packages, setPackages] = useState<Rule2202CompliancePackage[]>([]);
  const [validationFilter, setValidationFilter] =
    useState<ValidationFilter>("all");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [filingReference, setFilingReference] = useState("");

  const selectedYear = years.find((item) => item.id === yearId) ?? null;
  const selectedSite = sites.find((item) => item.id === siteId) ?? null;
  const pathway: VmtPathway =
    selectedYear?.vmt_pathway === "avr_survey"
      ? "survey"
      : selectedYear?.vmt_pathway === "anonymized_zip"
        ? "zip"
        : null;

  useEffect(() => {
    restoreSession().then((value) => {
      if (value) setSession(value);
    });
  }, []);
  useEffect(() => {
    if (!session) return;
    listOrganizations(session)
      .then((rows) => {
        setOrganizations(rows);
        if (!organizationId && rows[0]) setOrganizationId(rows[0].id);
      })
      .catch((e) => setMessage(e.message));
  }, [session]);
  useEffect(() => {
    if (!session || !organizationId) {
      setSites([]);
      setSiteId("");
      return;
    }
    listSites(session, organizationId)
      .then((rows) => {
        setSites(rows);
        if (!rows.some((s) => s.id === siteId)) setSiteId(rows[0]?.id ?? "");
      })
      .catch((e) => setMessage(e.message));
  }, [session, organizationId]);
  useEffect(() => {
    if (!session || !organizationId || !siteId) {
      setYears([]);
      setYearId("");
      return;
    }
    listReportingYears(session, organizationId, siteId)
      .then((rows) => {
        setYears(rows);
        const current =
          rows.find((r) => String(r.reporting_year) === reportingYear) ??
          rows[0];
        setYearId(current?.id ?? "");
        if (current) setReportingYear(String(current.reporting_year));
      })
      .catch((e) => setMessage(e.message));
  }, [session, organizationId, siteId]);
  useEffect(() => {
    if (session && yearId) refreshYearData(session, yearId);
    else clearYearData();
  }, [session, yearId]);

  async function refreshYearData(
    activeSession = session,
    activeYearId = yearId,
  ) {
    if (!activeSession || !activeYearId) return;
    try {
      const [p, v, c, pkgs] = await Promise.all([
        getEmployeePopulation(activeSession, activeYearId),
        listValidationIssues(activeSession, activeYearId),
        listCalculationRuns(activeSession, activeYearId),
        listCompliancePackages(activeSession, activeYearId),
      ]);
      setPopulation(p[0] ?? null);
      setIssues(v);
      setRuns(c);
      setPackages(pkgs);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function clearYearData() {
    setPopulation(null);
    setIssues([]);
    setRuns([]);
    setPackages([]);
  }

  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const next = await signIn(email, password);
      setSession(next);
      setPassword("");
      setMessage("Secure institutional session connected.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    await signOut(session);
    setSession(null);
    setOrganizations([]);
    setSites([]);
    setYears([]);
    setOrganizationId("");
    setSiteId("");
    setYearId("");
    clearYearData();
  }

  async function ensureYear() {
    if (!session || !organizationId || !siteId) return;
    const existing = years.find(
      (r) => r.reporting_year === Number(reportingYear),
    );
    if (existing) {
      setYearId(existing.id);
      return;
    }
    setBusy(true);
    try {
      const rows = await createReportingYear(session, {
        organization_id: organizationId,
        site_id: siteId,
        reporting_year: Number(reportingYear),
      });
      const created = rows[0];
      if (created) {
        setYears((old) => [created, ...old]);
        setYearId(created.id);
        setMessage(`${reportingYear} reporting record created.`);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patchYear(patch: Parameters<typeof updateReportingYear>[2]) {
    if (!session || !yearId) return;
    setBusy(true);
    try {
      const rows = await updateReportingYear(session, yearId, patch);
      const updated = rows[0];
      if (updated)
        setYears((old) => old.map((r) => (r.id === updated.id ? updated : r)));
      setMessage("Reporting record saved.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const openBlockingIssues = issues.filter(
    (i) => i.status === "open" && i.severity === "blocking",
  );
  const latestVmt =
    runs.find(
      (r) => r.calculation_type === "weekly_vmt" && r.status === "succeeded",
    ) ?? null;
  const latestAvr =
    runs.find(
      (r) => r.calculation_type === "avr" && r.status === "succeeded",
    ) ?? null;
  const worksiteReady = Boolean(
    selectedSite &&
    selectedYear?.business_classification &&
    selectedYear?.etc_contact_name &&
    selectedYear?.annual_due_date,
  );
  const populationReady = Boolean(
    population?.confirmed_at &&
    population.total_employee_count != null &&
    population.peak_window_employee_count != null,
  );
  const validationReady =
    populationReady &&
    Boolean(pathway) &&
    openBlockingIssues.length === 0 &&
    issues.length > 0;
  const metricsReady = Boolean(latestVmt && (pathway === "zip" || latestAvr));
  const packageReady =
    worksiteReady &&
    populationReady &&
    (population?.applicability_status === "applicable" ||
      population?.applicability_status === "exempt") &&
    Boolean(pathway) &&
    validationReady &&
    metricsReady;
  const latestPackage = packages[0] ?? null;
  const aqmdExport = buildAqmdAnnualComplianceExport({
    reportingYear: selectedYear,
    population,
    issues,
    runs,
    packageRecord: latestPackage,
  });

  async function preparePackage() {
    if (
      !session ||
      !selectedYear ||
      !organizationId ||
      !siteId ||
      !packageReady
    )
      return;
    setBusy(true);
    try {
      await createCompliancePackage(session, {
        organization_id: organizationId,
        site_id: siteId,
        reporting_year_id: selectedYear.id,
        version: (packages[0]?.version ?? 0) + 1,
        status: "ready_for_review",
        readiness_snapshot: engineEvaluation,
        source_snapshot: aqmdExport,
      });
      await refreshYearData();
      setMessage("Versioned AQMD review package created.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approvePackage() {
    if (!session || !latestPackage || !reviewNote.trim()) return;
    setBusy(true);
    try {
      await updateCompliancePackage(session, latestPackage.id, {
        status: "reviewed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
        approved_by: session.user.id,
        approval_note: reviewNote.trim(),
      });
      await refreshYearData();
      setMessage("Package approval recorded with reviewer identity.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function recordFiling() {
    if (
      !session ||
      !latestPackage ||
      latestPackage.status !== "reviewed" ||
      !filingReference.trim()
    )
      return;
    setBusy(true);
    try {
      await updateCompliancePackage(session, latestPackage.id, {
        status: "filed",
        filed_at: new Date().toISOString(),
        filing_reference: filingReference.trim(),
      });
      await refreshYearData();
      setMessage(
        "AQMD filing reference recorded. Filing acceptance remains external to this tool.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const engineEvaluation = evaluateRule2202Compliance({
    reportingYear: selectedYear
      ? {
          reporting_year: selectedYear.reporting_year,
          status: selectedYear.status,
          vmt_pathway: selectedYear.vmt_pathway,
        }
      : null,
    population: population
      ? {
          total_employee_count: population.total_employee_count,
          peak_window_employee_count: population.peak_window_employee_count,
          confirmed_at: population.confirmed_at,
        }
      : null,
    issues: issues.map((issue) => ({
      id: issue.id,
      rule_code: issue.rule_code,
      severity: issue.severity,
      field_name: issue.field_name,
      message: issue.message,
      status: issue.status,
    })),
    runs: runs.map((run) => ({
      calculation_type: run.calculation_type,
      status: run.status,
      result_value: run.result_value,
      result_unit: run.result_unit,
    })),
  });
  const historicalSnapshot = buildHistoricalPackageSnapshot({
    reportingYear: selectedYear
      ? {
          reporting_year: selectedYear.reporting_year,
          status: selectedYear.status,
          vmt_pathway: selectedYear.vmt_pathway,
        }
      : null,
    population: population
      ? {
          total_employee_count: population.total_employee_count,
          peak_window_employee_count: population.peak_window_employee_count,
          confirmed_at: population.confirmed_at,
        }
      : null,
    issues: issues.map((issue) => ({
      id: issue.id,
      rule_code: issue.rule_code,
      severity: issue.severity,
      field_name: issue.field_name,
      message: issue.message,
      status: issue.status,
    })),
    runs: runs.map((run) => ({
      calculation_type: run.calculation_type,
      status: run.status,
      result_value: run.result_value,
      result_unit: run.result_unit,
    })),
    reviewDecision: engineEvaluation.reviewDecision,
  });

  const readiness = useMemo(
    () => [
      {
        id: "worksite" as StepId,
        label: "Worksite profile",
        status: worksiteReady
          ? "ready"
          : selectedYear
            ? "review"
            : ("not_started" as Status),
        detail: worksiteReady
          ? "Required reporting profile fields are persisted."
          : "Confirm worksite, business classification, ETC contact and annual due date.",
      },
      {
        id: "population" as StepId,
        label: "Employee population",
        status: populationReady
          ? "ready"
          : selectedYear
            ? "blocked"
            : ("not_started" as Status),
        detail: populationReady
          ? "Verified employee population snapshot is persisted."
          : "Persist and confirm the worksite employee population source.",
      },
      {
        id: "pathway" as StepId,
        label: "VMT pathway",
        status: pathway
          ? "ready"
          : selectedYear
            ? "not_started"
            : ("not_started" as Status),
        detail: pathway
          ? `${pathway === "survey" ? "AVR survey" : "Anonymized ZIP"} pathway is saved.`
          : "Select the AQMD VMT input pathway.",
      },
      {
        id: "validation" as StepId,
        label: "Validation",
        status: validationReady
          ? "ready"
          : issues.length
            ? "blocked"
            : ("not_started" as Status),
        detail: issues.length
          ? `${openBlockingIssues.length} open blocking issue(s).`
          : "Validation history appears after real employee input is processed.",
      },
      {
        id: "metrics" as StepId,
        label: "AVR & weekly VMT",
        status: metricsReady
          ? "ready"
          : pathway
            ? "blocked"
            : ("not_started" as Status),
        detail: metricsReady
          ? "Successful calculation run is persisted."
          : "No successful AQMD calculation run is persisted.",
      },
      {
        id: "package" as StepId,
        label: "Compliance package",
        status: packageReady ? "ready" : ("blocked" as Status),
        detail: packageReady
          ? "All persisted prerequisites are satisfied."
          : "Package remains blocked until persisted prerequisites pass.",
      },
    ],
    [
      worksiteReady,
      populationReady,
      pathway,
      validationReady,
      issues.length,
      openBlockingIssues.length,
      metricsReady,
      packageReady,
      selectedYear,
    ],
  );

  const passedChecks = readiness.filter(
    (item) => item.status === "ready",
  ).length;
  const progress = Math.round((passedChecks / readiness.length) * 100);

  return (
    <div className="r2202-stack">
      <section className="r2202-hero">
        <div>
          <span className="ops-eyebrow">SOUTH COAST AQMD · RULE 2202</span>
          <h2>Persistent compliance workbench.</h2>
          <p>
            Rule 2202 records now use the existing tenant-scoped institutional
            model. Worksite configuration reuses organization sites; reporting
            years, employee population snapshots, validation issues, calculation
            runs and compliance packages persist in the backend when an
            authorized institutional session is connected.
          </p>
        </div>
        <div className="r2202-status-card">
          <small>{reportingYear} REPORTING READINESS</small>
          <strong>
            {passedChecks} / {readiness.length}
          </strong>
          <span>persisted checks ready</span>
          <div className="r2202-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <p>
            {session
              ? "Readiness is derived from saved records, not session toggles."
              : "Public view only. Connect an authorized institutional session to create or update records."}
          </p>
        </div>
      </section>

      <PersistenceBar
        session={session}
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        connect={connect}
        disconnect={disconnect}
        busy={busy}
        organizations={organizations}
        sites={sites}
        organizationId={organizationId}
        siteId={siteId}
        setOrganizationId={setOrganizationId}
        setSiteId={setSiteId}
        message={message}
      />

      <section className="r2202-stepper" aria-label="Rule 2202 workflow">
        {readiness.map((item, index) => (
          <button
            key={item.id}
            className={activeStep === item.id ? "active" : ""}
            onClick={() => setActiveStep(item.id)}
          >
            <span className={`r2202-step-dot ${item.status}`}>{index + 1}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{formatStatus(item.status)}</small>
            </span>
          </button>
        ))}
      </section>

      <section className="ops-panel r2202-workbench-panel">
        {activeStep === "worksite" && (
          <WorksiteStep
            sessionReady={Boolean(session && siteId)}
            reportingYear={reportingYear}
            setReportingYear={setReportingYear}
            selectedSite={selectedSite}
            selectedYear={selectedYear}
            ensureYear={ensureYear}
            patchYear={patchYear}
            busy={busy}
          />
        )}
        {activeStep === "population" && (
          <PopulationStep
            session={session}
            organizationId={organizationId}
            siteId={siteId}
            selectedYear={selectedYear}
            population={population}
            onSaved={() => refreshYearData()}
          />
        )}
        {activeStep === "pathway" && (
          <PathwayStep
            pathway={pathway}
            canSave={Boolean(session && yearId)}
            onSelect={(value) =>
              patchYear({
                vmt_pathway:
                  value === "survey" ? "avr_survey" : "anonymized_zip",
                survey_format:
                  value === "survey"
                    ? (selectedYear?.survey_format ?? "five_day")
                    : null,
              })
            }
          />
        )}
        {activeStep === "validation" && (
          <ValidationStep
            pathway={pathway}
            issues={issues}
            filter={validationFilter}
            setFilter={setValidationFilter}
          />
        )}
        {activeStep === "metrics" && (
          <MetricsStep pathway={pathway} population={population} runs={runs} />
        )}
        {activeStep === "package" && (
          <PackageStep
            packageReady={packageReady}
            packages={packages}
            latestVmt={latestVmt}
            latestAvr={latestAvr}
            blockingIssues={openBlockingIssues.length}
            engineEvaluation={engineEvaluation}
            historicalSnapshot={historicalSnapshot}
            latestPackage={latestPackage}
            reviewNote={reviewNote}
            setReviewNote={setReviewNote}
            filingReference={filingReference}
            setFilingReference={setFilingReference}
            preparePackage={preparePackage}
            approvePackage={approvePackage}
            recordFiling={recordFiling}
            downloadExport={() =>
              downloadJsonExport(
                `rule-2202-${selectedYear?.reporting_year ?? "draft"}-annual-compliance.json`,
                aqmdExport,
              )
            }
            busy={busy}
          />
        )}
      </section>

      <div className="ops-grid two">
        <section className="ops-panel">
          <header>
            <h2>Live readiness checklist</h2>
            <span className="r2202-count">
              {passedChecks}/{readiness.length} ready
            </span>
          </header>
          <div className="r2202-readiness compact">
            {readiness.map((item, index) => (
              <button key={item.id} onClick={() => setActiveStep(item.id)}>
                <span className={`r2202-check-icon ${item.status}`}>
                  {item.status === "ready" ? "✓" : index + 1}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <b className={`r2202-chip ${item.status}`}>
                  {formatStatus(item.status)}
                </b>
              </button>
            ))}
          </div>
        </section>
        <section className="ops-panel">
          <header>
            <h2>Persistence model</h2>
          </header>
          <div className="r2202-package">
            <p>
              <span>Worksite</span>
              <b>{selectedSite ? selectedSite.name : "Not connected"}</b>
            </p>
            <p>
              <span>Reporting year record</span>
              <b>
                {selectedYear
                  ? `${selectedYear.reporting_year} · ${selectedYear.status}`
                  : "Not created"}
              </b>
            </p>
            <p>
              <span>Employee population</span>
              <b>{population ? "Persisted" : "Not created"}</b>
            </p>
            <p>
              <span>Validation issues</span>
              <b>{issues.length}</b>
            </p>
            <p>
              <span>Calculation runs</span>
              <b>{runs.length}</b>
            </p>
            <p>
              <span>Compliance packages</span>
              <b>{packages.length}</b>
            </p>
          </div>
          <p className="ops-note">
            All institutional writes require authenticated tenant permissions.
            The public Pasadena evidence view remains read-only context and is
            not used as Rule 2202 employee data.
          </p>
        </section>
      </div>
    </div>
  );
}

function PersistenceBar(props: {
  session: SaasSession | null;
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  connect: () => void;
  disconnect: () => void;
  busy: boolean;
  organizations: Organization[];
  sites: OrganizationSite[];
  organizationId: string;
  siteId: string;
  setOrganizationId: (v: string) => void;
  setSiteId: (v: string) => void;
  message: string;
}) {
  return (
    <section className="ops-panel r2202-persistence">
      <header>
        <div>
          <h2>Secure institutional persistence</h2>
          <p>
            Optional in the public demo; required for operational worksite
            records.
          </p>
        </div>
        <b className={`r2202-chip ${props.session ? "ready" : "review"}`}>
          {props.session ? "connected" : "read only"}
        </b>
      </header>
      {!props.session ? (
        <div className="r2202-login-row">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={props.email}
              onChange={(e) => props.setEmail(e.currentTarget.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={props.password}
              onChange={(e) => props.setPassword(e.currentTarget.value)}
            />
          </label>
          <button
            className="primary"
            disabled={props.busy || !props.email || !props.password}
            onClick={props.connect}
          >
            Connect workspace
          </button>
        </div>
      ) : (
        <div className="r2202-login-row">
          <label>
            <span>Organization</span>
            <select
              value={props.organizationId}
              onChange={(e) => props.setOrganizationId(e.currentTarget.value)}
            >
              {props.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Worksite</span>
            <select
              value={props.siteId}
              onChange={(e) => props.setSiteId(e.currentTarget.value)}
            >
              {props.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost" onClick={props.disconnect}>
            Disconnect
          </button>
        </div>
      )}
      {props.message && <p className="r2202-system-message">{props.message}</p>}
    </section>
  );
}

function WorksiteStep({
  sessionReady,
  reportingYear,
  setReportingYear,
  selectedSite,
  selectedYear,
  ensureYear,
  patchYear,
  busy,
}: {
  sessionReady: boolean;
  reportingYear: string;
  setReportingYear: (v: string) => void;
  selectedSite: OrganizationSite | null;
  selectedYear: Rule2202ReportingYear | null;
  ensureYear: () => void;
  patchYear: (p: Parameters<typeof updateReportingYear>[2]) => void;
  busy: boolean;
}) {
  const [classification, setClassification] = useState(
    selectedYear?.business_classification ?? "",
  );
  const [etcName, setEtcName] = useState(selectedYear?.etc_contact_name ?? "");
  const [etcEmail, setEtcEmail] = useState(
    selectedYear?.etc_contact_email ?? "",
  );
  const [dueDate, setDueDate] = useState(selectedYear?.annual_due_date ?? "");
  useEffect(() => {
    setClassification(selectedYear?.business_classification ?? "");
    setEtcName(selectedYear?.etc_contact_name ?? "");
    setEtcEmail(selectedYear?.etc_contact_email ?? "");
    setDueDate(selectedYear?.annual_due_date ?? "");
  }, [selectedYear?.id]);
  return (
    <div className="r2202-step-content">
      <header>
        <div>
          <span className="ops-eyebrow">STEP 1</span>
          <h2>Worksite & reporting year</h2>
          <p>
            Create an annual compliance record under an existing institutional
            worksite.
          </p>
        </div>
      </header>
      <div className="r2202-field-grid interactive">
        <label>
          <span>Reporting year</span>
          <select
            value={reportingYear}
            onChange={(e) => setReportingYear(e.currentTarget.value)}
          >
            <option>2026</option>
            <option>2027</option>
            <option>2028</option>
          </select>
        </label>
        <ReadOnly
          label="Worksite"
          value={selectedSite?.name ?? "Connect institutional worksite"}
        />
        {selectedYear && (
          <>
            <label>
              <span>Business classification</span>
              <input
                value={classification}
                onChange={(e) => setClassification(e.currentTarget.value)}
              />
            </label>
            <label>
              <span>ETC / site contact</span>
              <input
                value={etcName}
                onChange={(e) => setEtcName(e.currentTarget.value)}
              />
            </label>
            <label>
              <span>ETC email</span>
              <input
                type="email"
                value={etcEmail}
                onChange={(e) => setEtcEmail(e.currentTarget.value)}
              />
            </label>
            <label>
              <span>Annual due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.currentTarget.value)}
              />
            </label>
          </>
        )}
      </div>
      {!selectedYear ? (
        <button
          className="primary"
          disabled={!sessionReady || busy}
          onClick={ensureYear}
        >
          Create {reportingYear} reporting record
        </button>
      ) : (
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            patchYear({
              business_classification: classification || null,
              etc_contact_name: etcName || null,
              etc_contact_email: etcEmail || null,
              annual_due_date: dueDate || null,
              status: "in_progress",
            })
          }
        >
          Save worksite profile
        </button>
      )}
    </div>
  );
}

function PopulationStep({
  session,
  organizationId,
  siteId,
  selectedYear,
  population,
  onSaved,
}: {
  session: SaasSession | null;
  organizationId: string;
  siteId: string;
  selectedYear: Rule2202ReportingYear | null;
  population: Rule2202EmployeePopulation | null;
  onSaved: () => void;
}) {
  const [total, setTotal] = useState(
    population?.total_employee_count?.toString() ?? "",
  );
  const [peak, setPeak] = useState(
    population?.peak_window_employee_count?.toString() ?? "",
  );
  const [source, setSource] = useState(population?.source_label ?? "");
  const [asOf, setAsOf] = useState(population?.as_of_date ?? "");
  const [sixMonthCounts, setSixMonthCounts] = useState(
    (population?.six_month_counts ?? []).join(", "),
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setTotal(population?.total_employee_count?.toString() ?? "");
    setPeak(population?.peak_window_employee_count?.toString() ?? "");
    setSource(population?.source_label ?? "");
    setAsOf(population?.as_of_date ?? "");
    setSixMonthCounts((population?.six_month_counts ?? []).join(", "));
  }, [population?.id]);
  async function save(confirmed: boolean) {
    if (!session || !selectedYear) return;
    setBusy(true);
    try {
      const counts = sixMonthCounts
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
      const applicability = assessRule2202Applicability({
        sixMonthEmployeeCounts: counts,
        peakWindowEmployeeCount: peak ? Number(peak) : null,
        sourceLabel: source || null,
        sourceAsOf: asOf || null,
      });
      await saveEmployeePopulation(session, {
        organization_id: organizationId,
        site_id: siteId,
        reporting_year_id: selectedYear.id,
        total_employee_count: total ? Number(total) : null,
        peak_window_employee_count: peak ? Number(peak) : null,
        source_id: null,
        source_label: source || null,
        as_of_date: asOf || null,
        six_month_counts: counts,
        six_month_average: applicability.averageEmployeeCount,
        six_month_minimum: applicability.sixMonthMinimum,
        six_month_maximum: applicability.sixMonthMaximum,
        applicability_status: applicability.status,
        applicability_reason: applicability.reason,
        confirmed,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="r2202-step-content">
      <header>
        <div>
          <span className="ops-eyebrow">STEP 2</span>
          <h2>Employee reporting population</h2>
          <p>
            Persist the employer-supplied population snapshot and its
            provenance. Do not use Pasadena ACS or student counts here.
          </p>
        </div>
        <b
          className={`r2202-chip ${population?.confirmed_at ? "ready" : "blocked"}`}
        >
          {population?.confirmed_at ? "confirmed" : "not confirmed"}
        </b>
      </header>
      <div className="r2202-field-grid interactive">
        <label>
          <span>Total employees</span>
          <input
            type="number"
            min="0"
            value={total}
            onChange={(e) => setTotal(e.currentTarget.value)}
          />
        </label>
        <label>
          <span>Peak-window employees</span>
          <input
            type="number"
            min="0"
            value={peak}
            onChange={(e) => setPeak(e.currentTarget.value)}
          />
        </label>
        <label>
          <span>Source label</span>
          <input
            value={source}
            onChange={(e) => setSource(e.currentTarget.value)}
            placeholder="e.g. HR roster export"
          />
        </label>
        <label>
          <span>As-of date</span>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.currentTarget.value)}
          />
        </label>
        <label>
          <span>Six monthly employee counts</span>
          <input
            value={sixMonthCounts}
            onChange={(e) => setSixMonthCounts(e.currentTarget.value)}
            placeholder="Jan, Feb, Mar, Apr, May, Jun"
          />
        </label>
      </div>
      <p className="ops-note">
        Enter exactly six monthly counts from the employer source. The
        applicability decision is calculated from their average and retained
        with the population snapshot.
      </p>
      <div className="r2202-inline-actions">
        <button
          className="ghost"
          disabled={!selectedYear || busy}
          onClick={() => save(false)}
        >
          Save draft
        </button>
        <button
          className="primary"
          disabled={
            !selectedYear ||
            busy ||
            !total ||
            !peak ||
            !source ||
            !asOf ||
            sixMonthCounts.split(",").filter(Boolean).length !== 6
          }
          onClick={() => save(true)}
        >
          Save & confirm source
        </button>
      </div>
    </div>
  );
}

function PathwayStep({
  pathway,
  canSave,
  onSelect,
}: {
  pathway: VmtPathway;
  canSave: boolean;
  onSelect: (v: Exclude<VmtPathway, null>) => void;
}) {
  return (
    <div className="r2202-step-content">
      <header>
        <div>
          <span className="ops-eyebrow">STEP 3</span>
          <h2>Select and persist VMT pathway</h2>
          <p>
            The selected AQMD pathway is stored on the annual reporting record.
          </p>
        </div>
      </header>
      <div className="r2202-path-selector">
        <button
          disabled={!canSave}
          className={pathway === "survey" ? "selected" : ""}
          onClick={() => onSelect("survey")}
        >
          <span className="r2202-path-letter">A</span>
          <div>
            <strong>AVR survey pathway</strong>
            <p>
              5-day or 7-day employee survey records with required commute mode
              and mileage inputs.
            </p>
            <small>
              {pathway === "survey" ? "Saved selection" : "Choose pathway"}
            </small>
          </div>
        </button>
        <button
          disabled={!canSave}
          className={pathway === "zip" ? "selected" : ""}
          onClick={() => onSelect("zip")}
        >
          <span className="r2202-path-letter">B</span>
          <div>
            <strong>Anonymized ZIP pathway</strong>
            <p>
              Anonymized home ZIP inputs for the applicable reporting
              population.
            </p>
            <small>
              {pathway === "zip" ? "Saved selection" : "Choose pathway"}
            </small>
          </div>
        </button>
      </div>
    </div>
  );
}

function ValidationStep({
  pathway,
  issues,
  filter,
  setFilter,
}: {
  pathway: VmtPathway;
  issues: Rule2202ValidationIssue[];
  filter: ValidationFilter;
  setFilter: (v: ValidationFilter) => void;
}) {
  const filtered = issues.filter((i) =>
    filter === "all" || filter === "resolved"
      ? filter === "resolved"
        ? i.status !== "open"
        : true
      : i.status === "open" && i.severity === filter,
  );
  return (
    <div className="r2202-step-content">
      <header>
        <div>
          <span className="ops-eyebrow">STEP 4</span>
          <h2>Persisted validation console</h2>
          <p>
            Actual validation exceptions appear here after employer inputs are
            processed.
          </p>
        </div>
        <b
          className={`r2202-chip ${issues.some((i) => i.status === "open" && i.severity === "blocking") ? "blocked" : "review"}`}
        >
          {issues.filter((i) => i.status === "open").length} open
        </b>
      </header>
      <div className="r2202-validation-toolbar">
        {(["all", "blocking", "review", "resolved"] as ValidationFilter[]).map(
          (v) => (
            <button
              key={v}
              className={filter === v ? "active" : ""}
              onClick={() => setFilter(v)}
            >
              {v}
            </button>
          ),
        )}
      </div>
      {!pathway && (
        <div className="r2202-empty-state">
          <strong>Select a VMT pathway first.</strong>
        </div>
      )}
      {pathway && issues.length === 0 && (
        <>
          <div className="r2202-empty-state">
            <strong>No persisted validation run yet.</strong>
            <p>
              Zero issues is not treated as a pass until real employee inputs
              have been validated.
            </p>
          </div>
          <div className="r2202-reference-rules">
            {informationalRules
              .filter((r) =>
                pathway === "survey"
                  ? r[2] !== "home_zip"
                  : r[2] !== "one_way_miles",
              )
              .map((r) => (
                <span key={r[1]}>
                  {r[0].toUpperCase()} · {r[1]}
                </span>
              ))}
          </div>
        </>
      )}
      {filtered.length > 0 && (
        <div className="r2202-validation-table">
          <div className="head">
            <span>Severity</span>
            <span>Issue</span>
            <span>Field</span>
            <span>Status</span>
          </div>
          {filtered.map((i) => (
            <div className="row" key={i.id}>
              <span>
                <b
                  className={`r2202-chip ${i.severity === "blocking" ? "blocked" : "review"}`}
                >
                  {i.severity}
                </b>
              </span>
              <span>
                <strong>{i.rule_code}</strong>
                <small>{i.message}</small>
              </span>
              <code>{i.field_name ?? "—"}</code>
              <span>{i.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsStep({
  pathway,
  population,
  runs,
}: {
  pathway: VmtPathway;
  population: Rule2202EmployeePopulation | null;
  runs: Rule2202CalculationRun[];
}) {
  const vmt = runs.find(
    (r) => r.calculation_type === "weekly_vmt" && r.status === "succeeded",
  );
  const avr = runs.find(
    (r) => r.calculation_type === "avr" && r.status === "succeeded",
  );
  const tele = runs.find(
    (r) => r.calculation_type === "telecommute" && r.status === "succeeded",
  );
  return (
    <div className="r2202-step-content">
      <header>
        <div>
          <span className="ops-eyebrow">STEP 5</span>
          <h2>Versioned calculation runs</h2>
          <p>
            Metrics appear only from successful persisted calculation runs. This
            UI does not invent results.
          </p>
        </div>
      </header>
      <div className="r2202-metric-table">
        <div className="head">
          <span>Metric</span>
          <span>Current value</span>
          <span>Source</span>
          <span>Status</span>
        </div>
        <Row
          metric="Peak-window employee population"
          value={
            population?.peak_window_employee_count?.toLocaleString() ??
            "Unavailable"
          }
          source={population?.source_label ?? "Employer worksite records"}
          status={population?.confirmed_at ? "Confirmed" : "Not confirmed"}
        />
        <Row
          metric="Average Vehicle Ridership (AVR)"
          value={avr?.result_value?.toString() ?? "Unavailable"}
          source="AQMD survey calculation run"
          status={
            pathway === "survey"
              ? avr
                ? "Succeeded"
                : "No successful run"
              : "Not required for ZIP pathway"
          }
        />
        <Row
          metric="Weekly VMT by mode"
          value={
            vmt?.result_value != null
              ? `${vmt.result_value.toLocaleString()} ${vmt.result_unit ?? "miles"}`
              : "Unavailable"
          }
          source="AQMD VMT calculation run"
          status={vmt ? "Succeeded" : "No successful run"}
        />
        <Row
          metric="Telecommute activity"
          value={
            tele?.result_value != null
              ? `${tele.result_value} ${tele.result_unit ?? ""}`
              : "Unavailable"
          }
          source="Employer / survey records"
          status={tele ? "Succeeded" : "Not calculated"}
        />
      </div>
    </div>
  );
}

function PackageStep({
  packageReady,
  packages,
  latestVmt,
  latestAvr,
  blockingIssues,
  engineEvaluation,
  historicalSnapshot,
  latestPackage,
  reviewNote,
  setReviewNote,
  filingReference,
  setFilingReference,
  preparePackage,
  approvePackage,
  recordFiling,
  downloadExport,
  busy,
}: {
  packageReady: boolean;
  packages: Rule2202CompliancePackage[];
  latestVmt: Rule2202CalculationRun | null;
  latestAvr: Rule2202CalculationRun | null;
  blockingIssues: number;
  engineEvaluation: ReturnType<typeof evaluateRule2202Compliance>;
  historicalSnapshot: ReturnType<typeof buildHistoricalPackageSnapshot>;
  latestPackage: Rule2202CompliancePackage | null;
  reviewNote: string;
  setReviewNote: (value: string) => void;
  filingReference: string;
  setFilingReference: (value: string) => void;
  preparePackage: () => void;
  approvePackage: () => void;
  recordFiling: () => void;
  downloadExport: () => void;
  busy: boolean;
}) {
  return (
    <div className="r2202-step-content">
      <header>
        <div>
          <span className="ops-eyebrow">STEP 6</span>
          <h2>Compliance-package readiness</h2>
          <p>
            Readiness is calculated from persisted records. Package generation
            remains blocked until actual AQMD calculation outputs exist.
          </p>
        </div>
        <b className={`r2202-chip ${packageReady ? "ready" : "blocked"}`}>
          {packageReady ? "ready" : "blocked"}
        </b>
      </header>
      <div className="r2202-package interactive">
        <p>
          <span>Successful weekly VMT run</span>
          <b>{latestVmt ? "Ready" : "Not ready"}</b>
        </p>
        <p>
          <span>Successful AVR run when survey pathway applies</span>
          <b>{latestAvr ? "Available" : "Not available"}</b>
        </p>
        <p>
          <span>Open blocking validation issues</span>
          <b>{blockingIssues}</b>
        </p>
        <p>
          <span>Persisted package versions</span>
          <b>{packages.length}</b>
        </p>
        <p>
          <span>Methodology</span>
          <b>AQMD_RULE_2202_2026</b>
        </p>
      </div>
      <div className="r2202-package interactive">
        <p>
          <span>Engine status</span>
          <b>{engineEvaluation.status}</b>
        </p>
        <p>
          <span>Review decision</span>
          <b>{engineEvaluation.reviewDecision.status}</b>
        </p>
        <p>
          <span>Snapshot version</span>
          <b>{historicalSnapshot.version}</b>
        </p>
        <p>
          <span>Snapshot summary</span>
          <b>{historicalSnapshot.summary}</b>
        </p>
      </div>
      <div className="r2202-inline-actions">
        <button
          className="primary"
          disabled={!packageReady || busy}
          onClick={preparePackage}
        >
          Create versioned review package
        </button>
        <button className="ghost" onClick={downloadExport}>
          Download AQMD export
        </button>
      </div>
      {latestPackage && (
        <div className="r2202-package interactive">
          <p>
            <span>Current package</span>
            <b>
              v{latestPackage.version} · {latestPackage.status}
            </b>
          </p>
          {latestPackage.status === "ready_for_review" && (
            <>
              <label>
                <span>Approval note</span>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.currentTarget.value)}
                  placeholder="Record the review basis and any approved assumptions."
                />
              </label>
              <button
                className="primary"
                disabled={busy || !reviewNote.trim()}
                onClick={approvePackage}
              >
                Approve for filing
              </button>
            </>
          )}
          {latestPackage.status === "reviewed" && (
            <>
              <label>
                <span>AQMD filing reference</span>
                <input
                  value={filingReference}
                  onChange={(e) => setFilingReference(e.currentTarget.value)}
                  placeholder="AQMD receipt or submission reference"
                />
              </label>
              <button
                className="primary"
                disabled={busy || !filingReference.trim()}
                onClick={recordFiling}
              >
                Record filing reference
              </button>
            </>
          )}
          {latestPackage.status === "filed" && (
            <p className="ops-note">
              Filed {latestPackage.filed_at ?? ""} with reference{" "}
              {latestPackage.filing_reference ?? "not provided"}. AQMD
              acceptance is not inferred.
            </p>
          )}
        </div>
      )}
      <pre
        className="r2202-system-message"
        style={{ whiteSpace: "pre-wrap", marginTop: 12 }}
      >
        {JSON.stringify(historicalSnapshot.exportPayload, null, 2)}
      </pre>
      <p className="ops-note">
        Package creation is intentionally unavailable until the calculation
        engine writes verified successful runs. A future package action must
        create a versioned record; it must not imply AQMD submission or
        approval.
      </p>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Row({
  metric,
  value,
  source,
  status,
}: {
  metric: string;
  value: string;
  source: string;
  status: string;
}) {
  return (
    <div className="row">
      <span className="strong">{metric}</span>
      <span>{value}</span>
      <span>{source}</span>
      <span>{status}</span>
    </div>
  );
}
function formatStatus(status: Status) {
  return status.replace("_", " ");
}
