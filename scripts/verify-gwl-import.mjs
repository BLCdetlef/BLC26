import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const importPath = path.join(projectRoot, "data", "gwl", "blc-curve-export-v1.json");
const payload = JSON.parse(await fs.readFile(importPath, "utf8"));
const fail = message => { throw new Error(message); };
const provenanceFields = ["sourceFile", "sourceUrl", "locator", "fields", "extraction", "transformation"];
const verifyProvenance = (provenance, label) => {
  if (!provenance || provenanceFields.some(field => field === "fields"
    ? !Array.isArray(provenance.fields) || !provenance.fields.length
    : typeof provenance[field] !== "string" || !provenance[field].trim())) fail(`${label}: vollständige Datenherkunft fehlt.`);
};

const allowedCurveRoles = new Set(["core", "deep_dive"]);
const allowedThresholdStatuses = new Set(["crossed", "already_crossed_at_start", "not_crossed", "series_ends_before_known_crossing", "not_assessable"]);
if (payload.format !== "gwl-blc-curve-export-v1" || payload.version !== "1.9" || !Array.isArray(payload.curves)) fail("Unbekanntes GWL-Exportformat.");
if (!payload.curves.length) fail("Das Übergabepaket enthält keine Kurven.");
if (payload.integrity?.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(payload.integrity?.hash || "")) fail("Integritätsblock fehlt.");
const signedPayload = { format: payload.format, version: payload.version, manifestVersion: payload.manifestVersion, curves: payload.curves };
const hash = crypto.createHash("sha256").update(JSON.stringify(signedPayload), "utf8").digest("hex");
if (hash !== payload.integrity.hash) fail("SHA-256-Prüfung fehlgeschlagen.");

const seen = new Set();
const seenSeries = new Set();
for (const curve of payload.curves) {
  if (!curve?.curveId || seen.has(curve.curveId)) fail("Fehlende oder doppelte Kurven-ID.");
  seen.add(curve.curveId);
  if (!curve.domainType || !curve.domainId || !curve.domainLabel) fail(`${curve.curveId}: fachliche Kategorie fehlt.`);
  if (seenSeries.has(curve.seriesId)) fail(`${curve.curveId}: doppelte Kurve.`);
  if (!allowedCurveRoles.has(curve.curveRole)) fail(`${curve.curveId}: ungültige curveRole.`);
  seenSeries.add(curve.seriesId);
  if (!curve.source?.startsWith("data/knowledge/") || curve.source.includes("..")) fail(`${curve.curveId}: unzulässiger Quellverweis.`);
  if (!["observed", "assessed_model_estimate"].includes(curve.dataNature)) fail(`${curve.curveId}: Art der Hauptreihe fehlt oder ist ungültig.`);
  if (!Array.isArray(curve.observations) || curve.observations.length < 5) fail(`${curve.curveId}: Beobachtungsreihe fehlt.`);
  if (!Array.isArray(curve.displayObservations) || curve.displayObservations.length < 2) fail(`${curve.curveId}: Darstellungsreihe fehlt.`);
  if (!Array.isArray(curve.displayHistoricalReconstruction) || curve.displayHistoricalReconstruction.length !== (curve.historicalReconstruction || []).length) fail(`${curve.curveId}: Rekonstruktionsdarstellung fehlt.`);
  if (!Array.isArray(curve.displayProjections) || curve.displayProjections.length !== (curve.projections || []).length) fail(`${curve.curveId}: Projektionsdarstellung fehlt.`);
  if (curve.displayDerivation?.interpolation !== false || curve.displayDerivation?.transformations?.length) fail(`${curve.curveId}: Darstellungsherleitung fehlt.`);
  for (const kind of ["boundary", "highRisk"]) {
    const assessment = curve.thresholdAssessments?.[kind];
    if (!assessment || !allowedThresholdStatuses.has(assessment.status)) fail(`${curve.curveId}: ungültiger Grenzstatus für ${kind}.`);
  }
  const observationYears = curve.observations.map(point => Number(point?.year));
  const observationYearSet = new Set(observationYears);
  const displayYears = curve.displayObservations.map(point => Number(point?.year));
  if (displayYears.some(year => !observationYearSet.has(year))) fail(`${curve.curveId}: Darstellungsreihe enthält keinen Originalpunkt.`);
  if (observationYears.some(year => !Number.isFinite(year))) fail(`${curve.curveId}: ungültiges Beobachtungsjahr.`);
  const firstObservationYear = Math.min(...observationYears);
  const historicalPoints = (curve.historicalReconstruction || []).flatMap(segment => segment.points || []);
  const visibleBreakYears = new Set((curve.methodBreaks || []).filter(marker => marker.showValues === true).map(marker => Number(marker.year)));
  if (historicalPoints.some(point => Number(point?.year) > firstObservationYear || (Number(point?.year) === firstObservationYear && !visibleBreakYears.has(firstObservationYear)))) fail(`${curve.curveId}: Rekonstruktion überlappt die Beobachtungsreihe außerhalb eines sichtbaren Methodenwechsels.`);
  if (curve.reference != null) {
    const reference = curve.reference;
    if (["no_global_quantity_boundary", "no_planetary_threshold"].includes(reference.type)) {
      if (curve.curveRole !== "deep_dive" || typeof reference.display !== "string" || !reference.display.trim()) fail(`${curve.curveId}: ungültige Erläuterung zur nicht quantifizierbaren Grenze.`);
    } else {
      if (!Number.isFinite(Number(reference.value)) || reference.unit !== curve.unit) fail(`${curve.curveId}: ungültiger oder inkompatibler Referenzwert.`);
      if (reference.type === "planetary_boundaries_model" && reference.modelName !== "Planetare Grenzen") fail(`${curve.curveId}: Modellreferenz ist unvollständig.`);
      const statusFields = ["role", "qualifier", "exceedanceOperator"];
      const hasStatusField = statusFields.some(field => field in reference);
      if (hasStatusField && !statusFields.every(field => field in reference)) fail(`${curve.curveId}: unvollständige Statusmetadaten.`);
      if (hasStatusField && (reference.role !== "boundary" || !["exact", "approximate"].includes(reference.qualifier) || ![">", "<"].includes(reference.exceedanceOperator))) fail(`${curve.curveId}: ungültige Statusmetadaten.`);
      const sourceIds = new Set((curve.sources || []).map(source => source?.id).filter(Boolean));
      if (!Array.isArray(reference.sourceRefs) || !reference.sourceRefs.length || reference.sourceRefs.some(id => !sourceIds.has(id))) fail(`${curve.curveId}: unbekannte Referenzquelle.`);
    }
  }
  for (const projection of curve.projections || []) {
    if (!["robust_scenario_projection", "qualified_scenario_projection"].includes(projection.grade)) fail(`${curve.curveId}: nicht qualifizierte Projektion.`);
  }
  if (curve.curveRole === "core") {
    verifyProvenance(curve.observationProvenance, `${curve.curveId} / Hauptreihe`);
    for (const segment of curve.historicalReconstruction || []) verifyProvenance(segment.provenance, `${curve.curveId} / ${segment.id}`);
    for (const segment of curve.projections || []) verifyProvenance(segment.provenance, `${curve.curveId} / ${segment.id}`);
  }
  const sourceIds = new Set((curve.sources || []).map(source => source?.id).filter(Boolean));
  for (const note of curve.contextNotes || []) {
    if (!note?.id || !note?.label || !note?.value || !note?.detail || !Array.isArray(note.sourceRefs) || !note.sourceRefs.length) fail(`${curve.curveId}: unvollständiger ergänzender Kontext.`);
    for (const sourceRef of note.sourceRefs) if (!sourceIds.has(sourceRef)) fail(`${curve.curveId}: unbekannte Kontextquelle ${sourceRef}.`);
  }
}

const landForest = payload.curves.find(curve => curve.seriesId === "global_forest_cover_1992_2022");
const landContextIds = new Set((landForest?.contextNotes || []).map(note => note.id));
if (!landContextIds.has("biome_forest_boundaries") || !landContextIds.has("forest_cover_trend_1992_2022")) {
  fail("Waldzustand: biomspezifische Grenzwerte oder Trendeinordnung fehlen im GWL-Import.");
}

const co2 = payload.curves.find(curve => curve.seriesId === "global_co2_noaa_annual");
const co2Historical = (co2.historicalReconstruction || []).flatMap(segment => segment.points || []);
const co2DisplayHistorical = (co2.displayHistoricalReconstruction || []).flatMap(segment => segment.points || []);
if (co2Historical.length !== 279 || co2Historical[0]?.year !== 1700 || co2Historical.at(-1)?.year !== 1978) fail("CO₂: Law-Dome-Rekonstruktion muss 1700–1978 mit 279 Punkten umfassen.");
if (co2DisplayHistorical.length !== 14 || co2DisplayHistorical[0]?.year !== 1700 || co2DisplayHistorical.at(-1)?.year !== 1978) fail("CO₂: sichtbare Law-Dome-Punkte müssen aus der belegten 20-Jahres-Auswahl stammen.");
if (co2.observations.length !== 47 || co2.observations[0]?.year !== 1979 || co2.observations.at(-1)?.year !== 2025) fail("CO₂: NOAA-Beobachtungsreihe muss 1979–2025 mit 47 Punkten umfassen.");
if (co2.projections?.length !== 5) fail("CO₂: genau fünf qualifizierte Projektionen erforderlich.");
if (co2.observationProvenance?.sourceFile !== "co2_annmean_gl.txt" || !co2.observationProvenance?.locator?.includes("Zeile 39")) fail("CO₂: genaue NOAA-Fundstelle fehlt.");
if (!co2.historicalReconstruction[0]?.provenance?.locator?.includes("CO2spl")) fail("CO₂: genaue Law-Dome-Fundstelle fehlt.");
if (co2.projections.some(projection => !projection.provenance?.locator?.includes(projection.scenario))) fail("CO₂: genaue IPCC-Szenariospalte fehlt.");
const plastics = payload.curves.find(curve => curve.seriesId === "global_plastics_production_1950_2019");
if (plastics.domainType !== "planetary_boundary" || plastics.domainId !== "novel_entities" || plastics.domainLabel !== "Neue Substanzen") fail("Kunststoffproduktion: Zuordnung zu Neue Substanzen ist ungültig.");

console.log(`GWL-Import gültig: ${payload.curves.length} Kurve(n), SHA-256 ${hash}`);
