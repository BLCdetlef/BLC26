import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const importPath = path.join(projectRoot, "data", "gwl", "blc-curve-export-v1.json");
const payload = JSON.parse(await fs.readFile(importPath, "utf8"));
const fail = message => { throw new Error(message); };

const requiredSeries = new Set(["biosphere_hanpp_1910_2020", "global_co2_noaa_annual", "blue_water_streamflow", "green_water_rootzone_soil_moisture", "global_forest_cover_1992_2022", "nitrogen_fixation_1961_2022", "phosphorus_cropland_1961_2022", "global_surface_omega_arag_oceansoda_1982_2021"]);
const allowedThresholdStatuses = new Set(["crossed", "already_crossed_at_start", "not_crossed", "series_ends_before_known_crossing", "not_assessable"]);
if (payload.format !== "gwl-blc-curve-export-v1" || payload.version !== "1.6" || !Array.isArray(payload.curves)) fail("Unbekanntes GWL-Exportformat.");
if (payload.curves.length !== requiredSeries.size) fail("Das Übergabepaket muss genau acht Kurven enthalten.");
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
  if (curve.curveRole !== "core") fail(`${curve.curveId}: für dieses Kernpaket wird curveRole core erwartet.`);
  if (!requiredSeries.has(curve.seriesId) || seenSeries.has(curve.seriesId)) fail(`${curve.curveId}: unerwartete oder doppelte Kurve.`);
  seenSeries.add(curve.seriesId);
  if (!curve.source?.startsWith("data/knowledge/") || curve.source.includes("..")) fail(`${curve.curveId}: unzulässiger Quellverweis.`);
  if (!Array.isArray(curve.observations) || curve.observations.length < 5) fail(`${curve.curveId}: Beobachtungsreihe fehlt.`);
  for (const kind of ["boundary", "highRisk"]) {
    const assessment = curve.thresholdAssessments?.[kind];
    if (!assessment || !allowedThresholdStatuses.has(assessment.status)) fail(`${curve.curveId}: ungültiger Grenzstatus für ${kind}.`);
  }
  const observationYears = curve.observations.map(point => Number(point?.year));
  if (observationYears.some(year => !Number.isFinite(year))) fail(`${curve.curveId}: ungültiges Beobachtungsjahr.`);
  const firstObservationYear = Math.min(...observationYears);
  const historicalPoints = (curve.historicalReconstruction || []).flatMap(segment => segment.points || []);
  const visibleBreakYears = new Set((curve.methodBreaks || []).filter(marker => marker.showValues === true).map(marker => Number(marker.year)));
  if (historicalPoints.some(point => Number(point?.year) > firstObservationYear || (Number(point?.year) === firstObservationYear && !visibleBreakYears.has(firstObservationYear)))) fail(`${curve.curveId}: Rekonstruktion überlappt die Beobachtungsreihe außerhalb eines sichtbaren Methodenwechsels.`);
  if (curve.reference != null) {
    const reference = curve.reference;
    if (!Number.isFinite(Number(reference.value)) || reference.unit !== curve.unit) fail(`${curve.curveId}: ungültiger oder inkompatibler Referenzwert.`);
    if (reference.type === "planetary_boundaries_model" && reference.modelName !== "Planetare Grenzen") fail(`${curve.curveId}: Modellreferenz ist unvollständig.`);
    const statusFields = ["role", "qualifier", "exceedanceOperator"];
    const hasStatusField = statusFields.some(field => field in reference);
    if (hasStatusField && !statusFields.every(field => field in reference)) fail(`${curve.curveId}: unvollständige Statusmetadaten.`);
    if (hasStatusField && (reference.role !== "boundary" || !["exact", "approximate"].includes(reference.qualifier) || ![">", "<"].includes(reference.exceedanceOperator))) fail(`${curve.curveId}: ungültige Statusmetadaten.`);
    const sourceIds = new Set((curve.sources || []).map(source => source?.id).filter(Boolean));
    if (!Array.isArray(reference.sourceRefs) || !reference.sourceRefs.length || reference.sourceRefs.some(id => !sourceIds.has(id))) fail(`${curve.curveId}: unbekannte Referenzquelle.`);
  }
  for (const projection of curve.projections || []) {
    if (!["robust_scenario_projection", "qualified_scenario_projection"].includes(projection.grade)) fail(`${curve.curveId}: nicht qualifizierte Projektion.`);
  }
}

if (seenSeries.size !== requiredSeries.size) fail("Das Übergabepaket enthält nicht die acht erwarteten Kernkurven.");
const co2 = payload.curves.find(curve => curve.seriesId === "global_co2_noaa_annual");
const co2Historical = (co2.historicalReconstruction || []).flatMap(segment => segment.points || []);
if (co2Historical.length !== 279 || co2Historical[0]?.year !== 1700 || co2Historical.at(-1)?.year !== 1978) fail("CO₂: Law-Dome-Rekonstruktion muss 1700–1978 mit 279 Punkten umfassen.");
if (co2.observations.length !== 47 || co2.observations[0]?.year !== 1979 || co2.observations.at(-1)?.year !== 2025) fail("CO₂: NOAA-Beobachtungsreihe muss 1979–2025 mit 47 Punkten umfassen.");
if (co2.projections?.length !== 5) fail("CO₂: genau fünf qualifizierte Projektionen erforderlich.");

console.log(`GWL-Import gültig: ${payload.curves.length} Kurve(n), SHA-256 ${hash}`);
