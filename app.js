(function () {
  "use strict";
  const config = window.BRUCHLAST_DATA;
  const chart = document.getElementById("chart");
  const seriesCount = document.getElementById("seriesCount");
  const importStatus = document.getElementById("importStatus");
  const legendContent = document.getElementById("legendContent");
  const gwlContributionLink = document.getElementById("gwlContributionLink");
  const curveDetailPanel = document.getElementById("curveDetailPanel");
  const curveDetailTitle = document.getElementById("curveDetailTitle");
  const curveDetailContent = document.getElementById("curveDetailContent");
  const filterContent = document.getElementById("filterContent");
  const panelBackdrop = document.getElementById("panelBackdrop");
  const curveLinkStatus = document.getElementById("curveLinkStatus");
  const historicalEvents = Array.isArray(window.BRUCHLAST_EVENTS) ? window.BRUCHLAST_EVENTS : [];
  const referenceApi = window.BRUCHLAST_REFERENCE;
  const curveLinkApi = window.BRUCHLAST_CURVE_LINK;
  const svgNamespace = "http://www.w3.org/2000/svg";
  const allowedProjectionGrades = new Set(["robust_scenario_projection", "qualified_scenario_projection"]);
  const allowedCurveRoles = new Set(["core", "deep_dive"]);
  const allowedThresholdStatuses = new Set(["crossed", "already_crossed_at_start", "not_crossed", "series_ends_before_known_crossing", "not_assessable"]);
  const seriesColors = ["#171717", "#b4472d", "#24708a", "#66843c", "#745084", "#9b762d"];
  let allCurves = [];
  let selectedCurveId = null;
  let selectedSegment = null;
  let exactLinkedCurveId = null;
  const selectedDomains = new Set();
  const selectedRoles = new Set();
  const visibleSegments = { observed: true, historical: true, projection: true };
  const foundationCatalog = Object.freeze([
    { domainId: "climate_change", label: "Klimawandel", group: "Planetare Grenzen" },
    { domainId: "biosphere_integrity", label: "Biosphärenintegrität", group: "Planetare Grenzen" },
    { domainId: "land_system_change", label: "Landnutzung", group: "Planetare Grenzen" },
    { domainId: "freshwater_change", label: "Süßwasser", group: "Planetare Grenzen" },
    { domainId: "nutrient_cycles", label: "Nährstoffkreisläufe", group: "Planetare Grenzen" },
    { domainId: "ocean_acidification", label: "Ozeanversauerung", group: "Planetare Grenzen" },
    { domainId: "atmospheric_aerosol_loading", label: "Aerosole", group: "Planetare Grenzen" },
    { domainId: "stratospheric_ozone_depletion", label: "Stratosphärisches Ozon", group: "Planetare Grenzen" },
    { domainId: "novel_entities", label: "Neue Substanzen", group: "Planetare Grenzen" },
    { domainId: "eah_material_energy_flows", label: "Stoff- und Energieströme", group: "Ergänzende Einflussbereiche" },
    { domainId: "eah_tech_social_environment", label: "Technologische & soziale Umwelt", group: "Ergänzende Einflussbereiche" }
  ]);
  const presentation = Object.freeze({
    biosphere_hanpp_1910_2020: {
      label: "Menschliche Beanspruchung der Ökosystemproduktion",
      detail: "Anteil der natürlichen Primärproduktion, den Menschen nutzen oder verändern · höher = stärkere Beanspruchung",
      unit: "% HANPP"
    },
    global_co2_noaa_annual: {
      label: "Atmosphärisches CO₂",
      detail: "Globales Jahresmittel der CO₂-Konzentration",
      unit: "ppm"
    },
    green_water_rootzone_soil_moisture: {
      label: "Landfläche mit ungewöhnlicher Bodenfeuchte",
      detail: "Anteil mit ungewöhnlich trockener oder nasser Bodenfeuchte · höher = mehr gestörte Fläche",
      unit: "% der eisfreien Landfläche"
    },
    blue_water_streamflow: {
      label: "Landfläche mit ungewöhnlichem Flussabfluss",
      detail: "Anteil mit ungewöhnlich hohem oder niedrigem Abfluss · höher = mehr gestörte Fläche",
      unit: "% der eisfreien Landfläche"
    },
    global_forest_cover_1992_2022: {
      label: "Verbleibende globale Waldfläche",
      detail: "Anteil an der potenziellen natürlichen Waldfläche · niedriger = weniger Wald",
      unit: "% der potenziellen Waldfläche"
    },
    global_surface_omega_arag_oceansoda_1982_2021: {
      label: "Aragonit-Sättigung des Oberflächenozeans",
      detail: "Globales flächengewichtetes Jahresmittel · niedriger = stärkere Ozeanversauerung",
      unit: "Ωarag"
    },
    nitrogen_fixation_1961_2022: {
      label: "Anthropogene Stickstofffixierung",
      detail: "Globale Fixierung für die Landwirtschaft · höher = stärkere Belastung",
      unit: "Tg N/Jahr"
    },
    phosphorus_cropland_1961_2022: {
      label: "Mineralischer Phosphoreinsatz",
      detail: "Global aggregierte Anwendung auf Ackerflächen · höher = stärkere Belastung",
      unit: "Tg P/Jahr"
    },
    global_plastics_production_1950_2019: {
      label: "Globale Kunststoffproduktion",
      detail: "Jährlich produzierte primäre Kunststoffe · höher = mehr neue Substanzen in der Umwelt",
      unit: "Mio. t/Jahr"
    },
    global_oil_tes_1965_2025: {
      label: "Globale Energieversorgung aus Erdöl",
      detail: "Jährliche globale Total Energy Supply aus Erdöl · höher = größerer fossiler Energiestrom",
      unit: "TWh/Jahr"
    }
  });

  function fail(message) { throw new Error(message); }
  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }
  function appendText(parent, name, text, attributes = {}) {
    const element = svgElement(name, attributes);
    element.textContent = String(text);
    parent.appendChild(element);
    return element;
  }
  function validPoints(points) {
    return Array.isArray(points) && points.every(point => Number.isFinite(Number(point?.year)) && Number.isFinite(Number(point?.value)));
  }
  function validProvenance(provenance) {
    return provenance && typeof provenance === "object" && !Array.isArray(provenance)
      && typeof provenance.sourceFile === "string" && /^https:\/\//i.test(provenance.sourceUrl || "")
      && typeof provenance.locator === "string" && Array.isArray(provenance.fields) && provenance.fields.length
      && typeof provenance.extraction === "string" && typeof provenance.transformation === "string";
  }
  function pointKey(point) {
    return `${Number(point?.year)}:${Number(point?.value)}`;
  }
  function validateDisplaySegments(curve, fullSegments, displaySegments, label) {
    if (!Array.isArray(displaySegments) || displaySegments.length !== fullSegments.length) fail(`${curve.curveId}: Darstellungssegmente für ${label} fehlen.`);
    const fullById = new Map(fullSegments.map(segment => [segment.id, segment]));
    for (const displaySegment of displaySegments) {
      const fullSegment = fullById.get(displaySegment.id);
      if (!fullSegment || !validPoints(displaySegment.points) || !displaySegment.points.length) fail(`${curve.curveId}: ungültiges Darstellungssegment für ${label}.`);
      const originals = new Set(fullSegment.points.map(pointKey));
      if (displaySegment.points.some(point => !originals.has(pointKey(point)))) fail(`${curve.curveId}: ${label} enthält einen nicht belegten Zwischenwert.`);
    }
  }
  function formatNumber(value) {
    return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 6 }).format(Number(value));
  }
  async function sha256(value) {
    if (!window.crypto?.subtle) fail("SHA-256-Prüfung ist in diesem Browserkontext nicht verfügbar.");
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  async function verifyExport(payload) {
    const allowedTopFields = new Set(["format", "version", "manifestVersion", "curves", "integrity"]);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("Übergabepaket ist kein gültiges Objekt.");
    for (const field of Object.keys(payload)) if (!allowedTopFields.has(field)) fail(`Unbekanntes Exportfeld: ${field}`);
    if (payload.format !== config.import.format || payload.version !== config.import.version) fail("Unbekanntes Exportformat.");
    if (!Array.isArray(payload.curves) || !payload.curves.length) fail("Das Übergabepaket enthält keine Kurven.");
    if (payload.integrity?.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(payload.integrity?.hash || "")) fail("Integritätsangabe fehlt.");
    const signedPayload = { format: payload.format, version: payload.version, manifestVersion: payload.manifestVersion, curves: payload.curves };
    const actualHash = await sha256(JSON.stringify(signedPayload));
    if (actualHash !== payload.integrity.hash) fail("Integritätsprüfung fehlgeschlagen. Das Paket wurde verändert oder beschädigt.");
    const seen = new Set();
    const seenSeries = new Set();
    for (const curve of payload.curves) {
      if (!curve?.curveId || seen.has(curve.curveId)) fail("Kurven-ID fehlt oder ist doppelt.");
      seen.add(curve.curveId);
      if (!curve.domainType || !curve.domainId || !curve.domainLabel) fail(`${curve.curveId}: fachliche Kategorie fehlt.`);
      if (seenSeries.has(curve.seriesId)) fail(`${curve.seriesId}: Kurve ist doppelt enthalten.`);
      if (!allowedCurveRoles.has(curve.curveRole)) fail(`${curve.curveId}: ungültige curveRole.`);
      seenSeries.add(curve.seriesId);
      if (!curve.source?.startsWith("data/knowledge/") || curve.source.includes("..")) fail(`${curve.curveId}: unzulässiger Quellverweis.`);
      if (!["observed", "assessed_model_estimate"].includes(curve.dataNature)) fail(`${curve.curveId}: Art der Hauptreihe fehlt oder ist ungültig.`);
      if (!validPoints(curve.observations) || curve.observations.length < 2) fail(`${curve.curveId}: gültige Beobachtungsreihe fehlt.`);
      if (!validPoints(curve.displayObservations) || curve.displayObservations.length < 2) fail(`${curve.curveId}: gültige Darstellungsreihe fehlt.`);
      if (curve.observationProvenance && !validProvenance(curve.observationProvenance)) fail(`${curve.curveId}: ungültige Herkunft der Hauptreihe.`);
      const observationYears = new Set(curve.observations.map(point => Number(point.year)));
      if (curve.displayObservations.some(point => !observationYears.has(Number(point.year)))) fail(`${curve.curveId}: Darstellungsreihe enthält keinen Originalpunkt.`);
      referenceApi.validateReference(curve);
      for (const kind of ["boundary", "highRisk"]) {
        const assessment = curve.thresholdAssessments?.[kind];
        if (!assessment || !allowedThresholdStatuses.has(assessment.status)) fail(`${curve.curveId}: ungültiger Grenzstatus für ${kind}.`);
      }
      for (const segment of curve.historicalReconstruction || []) if (!validPoints(segment.points) || !segment.points.length || (segment.provenance && !validProvenance(segment.provenance))) fail(`${curve.curveId}: ungültige Rekonstruktion.`);
      for (const projection of curve.projections || []) {
        if (!allowedProjectionGrades.has(projection.grade) || !validPoints(projection.points) || !projection.points.length || (projection.provenance && !validProvenance(projection.provenance))) fail(`${curve.curveId}: nicht qualifizierte oder ungültige Projektion.`);
      }
      validateDisplaySegments(curve, curve.historicalReconstruction || [], curve.displayHistoricalReconstruction, "Rekonstruktionen");
      validateDisplaySegments(curve, curve.projections || [], curve.displayProjections, "Projektionen");
      if (curve.displayDerivation?.interpolation !== false || !Array.isArray(curve.displayDerivation?.transformations) || curve.displayDerivation.transformations.length) fail(`${curve.curveId}: transparente Darstellungsherleitung fehlt.`);
    }
    return actualHash;
  }
  function makePath(points, x, y) {
    return points.map((point, index) => `${index ? "L" : "M"}${x(Number(point.year)).toFixed(2)} ${y(Number(point.value)).toFixed(2)}`).join(" ");
  }
  function createReferencePanel() {
    const panel = document.createElement("aside");
    panel.className = "curve-reference";
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");
    return panel;
  }
  function showSegmentDetails(panel, curve, segment) {
    panel.replaceChildren();
    panel.hidden = false;
    const overview = document.createElement("div");
    overview.className = "curve-reference-overview";
    panel.appendChild(overview);
    appendLabeledText(overview, "Segment", segment.label);
    if (segment.period) appendLabeledText(overview, "Zeitraum", segment.period);
    if (segment.type !== "observed") {
      if (segment.method) appendLabeledText(overview, "Methode", segment.method);
      if (segment.uncertainty) appendLabeledText(overview, "Einordnung", segment.uncertainty);
      appendSegmentProvenance(panel, curve, segment);
      appendSegmentDataDocumentation(panel, curve, segment);
      return;
    }
    const status = referenceApi.referenceStatus(curve);
    if (status.state === "missing" || status.state === "unknown") {
      const message = document.createElement("p");
      message.textContent = status.label;
      overview.appendChild(message);
      appendSegmentProvenance(panel, curve, segment);
      appendSegmentDataDocumentation(panel, curve, segment);
      return;
    }
    const kind = document.createElement("p");
    kind.textContent = "Modellreferenz nach dem Modell der Planetaren Grenzen";
    const reference = document.createElement("p");
    reference.textContent = status.reference.display || `Referenzwert: ${status.reference.qualifier === "approximate" ? "etwa " : ""}${status.reference.value} ${status.reference.unit}`;
    if (status.state === "reference-only") {
      const assessment = document.createElement("p");
      assessment.className = "curve-reference-status";
      assessment.textContent = status.label;
      overview.append(kind, reference, assessment);
      appendReferenceSources(overview, curve, status.reference);
      appendSegmentProvenance(panel, curve, segment);
      appendSegmentDataDocumentation(panel, curve, segment);
      return;
    }
    const current = document.createElement("p");
    current.textContent = `${curve.dataNature === "assessed_model_estimate" ? "Letzter Schätzwert" : "Letzter Beobachtungswert"} (${status.observation.year}): ${status.observation.display || `${formatNumber(status.observation.value)} ${curve.unit}`}`;
    const assessment = document.createElement("p");
    assessment.className = "curve-reference-status";
    assessment.textContent = status.label;
    overview.append(kind, reference, current, assessment);
    appendReferenceSources(overview, curve, status.reference);
    appendSegmentProvenance(panel, curve, segment);
    appendSegmentDataDocumentation(panel, curve, segment);
  }
  function curveColor(curve) {
    const index = Math.max(0, allCurves.findIndex(item => item.curveId === curve.curveId));
    return seriesColors[index % seriesColors.length];
  }
  function openPanel(panelId) {
    const panel = document.getElementById(panelId);
    const handle = document.querySelector(`[aria-controls="${panelId}"]`);
    closePanels();
    panel.setAttribute("aria-hidden", "false");
    panel.inert = false;
    handle.setAttribute("aria-expanded", "true");
    panelBackdrop.hidden = false;
  }
  function closePanels() {
    document.querySelectorAll(".side-panel").forEach(panel => { panel.setAttribute("aria-hidden", "true"); panel.inert = true; });
    document.querySelectorAll(".panel-handle").forEach(handle => handle.setAttribute("aria-expanded", "false"));
    panelBackdrop.hidden = true;
  }
  function openCurveDetails() {
    curveDetailPanel.setAttribute("aria-hidden", "false");
    curveDetailPanel.inert = false;
  }
  function closeCurveDetails() {
    curveDetailPanel.setAttribute("aria-hidden", "true");
    curveDetailPanel.inert = true;
  }
  function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const shouldOpen = panel.getAttribute("aria-hidden") === "true";
    if (shouldOpen) {
      openPanel(panelId);
      panel.querySelector("button, input")?.focus();
    } else closePanels();
  }
  function setupPanels() {
    document.querySelectorAll(".panel-handle").forEach(handle => handle.addEventListener("click", () => togglePanel(handle.getAttribute("aria-controls"))));
    document.querySelectorAll("[data-close-panel]").forEach(button => button.addEventListener("click", closePanels));
    document.querySelector("[data-close-detail]").addEventListener("click", closeCurveDetails);
    panelBackdrop.addEventListener("click", closePanels);
    document.addEventListener("keydown", event => { if (event.key === "Escape") { closePanels(); closeCurveDetails(); } });
  }
  function tryLandscapeLock() {
    if (matchMedia("(max-width: 760px)").matches && screen.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }
  function appendReferenceSources(panel, curve, reference) {
    const sourceMap = new Map((curve.sources || []).map(source => [source.id, source]));
    const sourceItems = reference.sourceRefs.map(id => sourceMap.get(id) || { id, title: id });
    if (sourceItems.length) {
      const sources = document.createElement("p");
      sources.className = "curve-reference-sources";
      sources.append("Quelle des Grenzwerts: ");
      sourceItems.forEach((source, index) => {
        if (index) sources.append("; ");
        const href = source.url || (source.doi ? `https://doi.org/${source.doi}` : "");
        if (!href) {
          sources.append(source.title || source.id);
          return;
        }
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = source.title || source.id;
        sources.appendChild(link);
      });
      panel.appendChild(sources);
    }
  }
  function appendLabeledText(parent, label, text) {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    paragraph.append(strong, text);
    parent.appendChild(paragraph);
  }
  function sourceForRef(curve, ref) {
    return (curve.sources || []).find(source => source.id === ref) || { id: ref, title: ref };
  }
  function compactSourceName(source) {
    const text = `${source.id || ""} ${source.publisher || ""} ${source.title || ""}`;
    if (/law dome/i.test(text)) return "Law Dome";
    if (/intergovernmental panel|\bipcc\b/i.test(text)) return "IPCC AR6";
    if (/\bnoaa\b|national oceanic and atmospheric/i.test(text)) return "NOAA";
    if (/copernicus/i.test(text)) return "Copernicus";
    if (/world meteorological|\bwmo\b/i.test(text)) return "WMO";
    if (/indicators of global climate change|integrated global carbon component|\bigcc\b/i.test(text)) return "IGCC";
    if (/world health organization|\bwho\b/i.test(text)) return "WHO";
    if (/planetary health check/i.test(text)) return `Planetary Health Check${source.year ? ` ${source.year}` : ""}`;
    if (/virkki/i.test(text)) return `Virkki et al.${source.year ? ` ${source.year}` : ""}`;
    if (/porkka/i.test(text)) return `Porkka et al.${source.year ? ` ${source.year}` : ""}`;
    if (/pongratz/i.test(text)) return `Pongratz et al.${source.year ? ` ${source.year}` : ""}`;
    if (/oceansoda|four decades of trends|ma, d\.|ma et al/i.test(text)) return `OceanSODA / Ma et al.${source.year ? ` ${source.year}` : ""}`;
    if (/global surface ocean acidification indicators/i.test(text)) return `NOAA/Jiang${source.year ? ` ${source.year}` : ""}`;
    return source.publisher || source.title || source.id;
  }
  function sourceHref(source) {
    return source.url || (source.doi ? `https://doi.org/${source.doi}` : "");
  }
  function uniqueSources(curve, refs) {
    return [...new Set(refs)].map(ref => sourceForRef(curve, ref));
  }
  function shortSourceName(curve, refs) {
    const source = refs?.length ? sourceForRef(curve, refs[0]) : null;
    return source ? compactSourceName(source) : "Quelle siehe Legende";
  }
  function seriesOriginLabel(curve, refs, kind) {
    const source = shortSourceName(curve, refs);
    if (kind === "observed") return `${source}-${curve.dataNature === "assessed_model_estimate" ? "Schätzreihe" : "Messreihe"}`;
    if (kind === "historical") return `${source}-Rekonstruktion`;
    return `${source}-Szenario`;
  }
  function resolveSegment(curve, selection = selectedSegment) {
    if (selection?.curveId === curve.curveId && selection.type === "historical") {
      const data = (curve.historicalReconstruction || []).find(item => item.id === selection.id);
      const display = (curve.displayHistoricalReconstruction || []).find(item => item.id === selection.id);
      if (data) return { ...data, type: "historical", label: data.label || "Rekonstruktion", displayPointCount: display?.points?.length || 0, derivationKey: "historicalReconstruction" };
    }
    if (selection?.curveId === curve.curveId && selection.type === "projection") {
      const data = (curve.projections || []).find(item => item.id === selection.id);
      const display = (curve.displayProjections || []).find(item => item.id === selection.id);
      if (data) return { ...data, type: "projection", label: data.scenarioLabel || data.scenario || "Modellierung", displayPointCount: display?.points?.length || 0, derivationKey: "projections" };
    }
    return {
      type: "observed",
      id: "observations",
      label: curve.dataNature === "assessed_model_estimate" ? "Wissenschaftliche Schätzreihe" : "Messwerte",
      period: `${curve.observationCoverage.startYear}–${curve.observationCoverage.endYear}`,
      method: curve.methodNote,
      uncertainty: curve.uncertainty,
      sourceRefs: curve.observationSourceRefs || [],
      provenance: curve.observationProvenance,
      points: curve.observations,
      displayPointCount: curve.displayObservations.length,
      derivationKey: "observations"
    };
  }
  function appendSegmentProvenance(panel, curve, segment) {
    const section = document.createElement("section");
    section.className = "curve-provenance";
    const heading = document.createElement("strong");
    heading.className = "curve-provenance-title";
    heading.textContent = "Datenherkunft dieses Segments";
    section.appendChild(heading);
    const sources = uniqueSources(curve, segment.sourceRefs || []);
    appendLabeledText(section, "Quelle", [...new Set(sources.map(compactSourceName))].join(" · ") || "nicht dokumentiert");
    const provenance = segment.provenance;
    if (provenance?.sourceFile) appendLabeledText(section, "Quelldatei", provenance.sourceFile);
    if (provenance?.locator) appendLabeledText(section, "Fundstelle", provenance.locator);
    if (provenance?.fields?.length) appendLabeledText(section, "Ausgelesene Felder", provenance.fields.join("; "));
    if (provenance?.extraction) appendLabeledText(section, "Übernommener Bereich", provenance.extraction);
    if (provenance?.transformation) appendLabeledText(section, "Verarbeitung", provenance.transformation);
    if (!provenance) appendLabeledText(section, "Fundstelle", "Für dieses Segment ist die genaue Fundstelle im Export noch nicht dokumentiert.");
    const actions = document.createElement("div");
    actions.className = "curve-provenance-actions";
    const primaryHref = provenance?.sourceUrl || (sources[0] ? sourceHref(sources[0]) : "");
    if (primaryHref) {
      const originalDataLink = document.createElement("a");
      originalDataLink.href = primaryHref;
      originalDataLink.target = "_blank";
      originalDataLink.rel = "noopener noreferrer";
      originalDataLink.textContent = "Originaldatensatz öffnen";
      actions.appendChild(originalDataLink);
    }
    const importedDataLink = document.createElement("a");
    importedDataLink.href = config.import.source;
    importedDataLink.target = "_blank";
    importedDataLink.rel = "noopener noreferrer";
    importedDataLink.textContent = "Importierte Daten anzeigen";
    actions.appendChild(importedDataLink);
    section.appendChild(actions);
    panel.appendChild(section);
  }
  function appendSegmentDataDocumentation(panel, curve, segment) {
    const details = document.createElement("details");
    details.className = "curve-data-documentation";
    details.open = false;
    const summary = document.createElement("summary");
    summary.textContent = "Aufbereitung und Auswahlregeln anzeigen";
    details.appendChild(summary);
    const rule = curve.displayDerivation?.[segment.derivationKey];
    if (rule) appendLabeledText(details, "Punktauswahl", `${segment.points?.length || 0} belegte Werte → ${segment.displayPointCount || 0} sichtbare Punkte. ${rule.rule}`);
    appendLabeledText(details, "Liniengrundlage", `Die Linie verwendet alle ${segment.points?.length || rule?.inputPointCount || 0} vorhandenen Werte dieses Segments; ausgedünnt werden nur die sichtbaren Punktmarken.`);
    panel.appendChild(details);
  }
  function pointDisplay(point, unit) {
    const display = point.display || `${point.value} ${unit}`;
    const valueOnly = display.replace(new RegExp(`^${point.year}:\\s*`), "");
    return `${point.year} · ${valueOnly}`;
  }
  function createLegend(curves, onSelect) {
    const legend = document.createElement("div");
    legend.className = "series-legend";
    const series = document.createElement("div");
    series.className = "legend-series-list";
    curves.forEach(curve => {
      const meta = presentation[curve.seriesId] || { label: curve.label, detail: curve.metric, unit: curve.unit };
      const item = document.createElement("button");
      item.type = "button";
      item.className = `legend-series${curve.curveId === selectedCurveId ? " is-selected" : ""}`;
      if (curve.curveId === selectedCurveId) item.setAttribute("aria-current", "true");
      item.addEventListener("click", () => onSelect(curve));
      item.style.setProperty("--series-color", curveColor(curve));
      const label = document.createElement("strong");
      label.textContent = meta.label;
      item.appendChild(label);
      series.appendChild(item);
    });
    legend.appendChild(series);
    const types = document.createElement("div");
    types.className = "legend-types";
    [["observed", "Hauptreihe · ausgefüllter Punkt"], ["historical", "Rekonstruktion · offener Punkt"], ["projection", "Szenario · gepunktete Linie"], ["threshold", "Erstes Überschreiten eines Grenzwerts"]].forEach(([type, label]) => {
      const item = document.createElement("span");
      item.className = `legend-${type}`;
      item.textContent = label;
      types.appendChild(item);
    });
    legend.appendChild(types);
    return legend;
  }
  function makeFilterSection(title, options, onChange, open = false) {
    const section = document.createElement("details");
    section.className = "filter-section";
    section.open = open;
    const summary = document.createElement("summary");
    summary.textContent = title;
    const list = document.createElement("div");
    list.className = "filter-options";
    let currentGroup = "";
    options.forEach(option => {
      if (option.group && option.group !== currentGroup) {
        currentGroup = option.group;
        const groupLabel = document.createElement("div");
        groupLabel.className = "filter-group-label";
        groupLabel.textContent = currentGroup;
        list.appendChild(groupLabel);
      }
      const label = document.createElement("label");
      label.className = `filter-option${option.disabled ? " is-empty" : ""}`;
      label.dataset.filterText = option.label.toLocaleLowerCase("de-DE");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = option.checked;
      input.disabled = Boolean(option.disabled);
      input.addEventListener("change", () => onChange(option.value, input.checked));
      const text = document.createElement("span");
      text.textContent = option.label;
      const count = document.createElement("small");
      count.textContent = option.count == null ? "" : String(option.count);
      label.append(input, text, count);
      list.appendChild(label);
    });
    section.append(summary, list);
    return section;
  }
  function chooseSegment(curve, type = "observed", id = "observations") {
    selectedCurveId = curve.curveId;
    selectedSegment = { curveId: curve.curveId, type, id };
    renderCurrent();
    openCurveDetails();
  }
  function renderCurrent() {
    const visibleCurves = curveLinkApi.visibleCurves(allCurves, selectedDomains, selectedRoles, exactLinkedCurveId);
    chart.replaceChildren(renderChart(visibleCurves));
    legendContent.replaceChildren(createLegend(visibleCurves, curve => {
      chooseSegment(curve);
    }));
    const selectedCurve = visibleCurves.find(curve => curve.curveId === selectedCurveId);
    curveDetailContent.replaceChildren();
    curveDetailContent.scrollTop = 0;
    const contributionUrl = curveLinkApi.selectedGwlContributionUrl(visibleCurves, selectedCurveId);
    if (contributionUrl) {
      gwlContributionLink.href = contributionUrl;
      gwlContributionLink.hidden = false;
    } else {
      gwlContributionLink.hidden = true;
      gwlContributionLink.removeAttribute("href");
    }
    if (selectedCurve) {
      const meta = presentation[selectedCurve.seriesId] || { label: selectedCurve.label };
      const segment = resolveSegment(selectedCurve);
      selectedSegment = { curveId: selectedCurve.curveId, type: segment.type, id: segment.id };
      curveDetailTitle.textContent = `${meta.label} · ${segment.label}`;
      const referencePanel = createReferencePanel();
      curveDetailContent.appendChild(referencePanel);
      showSegmentDetails(referencePanel, selectedCurve, segment);
    } else {
      curveDetailTitle.textContent = "Kurvendetails";
      closeCurveDetails();
    }
    seriesCount.textContent = `${visibleCurves.length} von ${allCurves.length} Kurven`;
    const result = filterContent.querySelector(".filter-result");
    if (result) result.textContent = `${visibleCurves.length} Kurven werden angezeigt`;
  }
  function createFilters(curves) {
    filterContent.replaceChildren();
    const search = document.createElement("input");
    search.className = "filter-search";
    search.type = "search";
    search.placeholder = "Grundlage suchen";
    search.setAttribute("aria-label", "Grundlage suchen");
    const knownDomainIds = new Set(foundationCatalog.map(item => item.domainId));
    const additionalDomains = [...new Map(curves.filter(curve => !knownDomainIds.has(curve.domainId)).map(curve => [curve.domainId, curve.domainLabel])).entries()]
      .map(([domainId, label]) => ({ domainId, label, group: "Weitere Grundlagen" }));
    const domains = [...foundationCatalog, ...additionalDomains];
    const domainSection = makeFilterSection("Grundlage", domains.map(domain => {
      const count = curves.filter(curve => curve.domainId === domain.domainId).length;
      return { value: domain.domainId, label: domain.label, group: domain.group, checked: selectedDomains.has(domain.domainId), disabled: count === 0, count };
    }), (domainId, checked) => {
      exactLinkedCurveId = null;
      if (checked) selectedDomains.add(domainId); else selectedDomains.delete(domainId);
      renderCurrent();
    }, true);
    const roleSection = makeFilterSection("Kurventyp", [
      { value: "core", label: "Kernkurven", checked: selectedRoles.has("core"), count: curves.filter(curve => curve.curveRole === "core").length },
      { value: "deep_dive", label: "Vertiefung", checked: selectedRoles.has("deep_dive"), count: curves.filter(curve => curve.curveRole === "deep_dive").length }
    ], (role, checked) => {
      exactLinkedCurveId = null;
      if (checked) selectedRoles.add(role); else selectedRoles.delete(role);
      renderCurrent();
    });
    const segmentSection = makeFilterSection("Darstellung", [
      { value: "observed", label: "Beobachtungen", checked: true },
      { value: "historical", label: "Historische Rekonstruktionen", checked: true },
      { value: "projection", label: "Szenarien", checked: true }
    ], (segment, checked) => { visibleSegments[segment] = checked; renderCurrent(); });
    const actions = document.createElement("div");
    actions.className = "filter-actions";
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.textContent = "Alle";
    const noneButton = document.createElement("button");
    noneButton.type = "button";
    noneButton.textContent = "Keine";
    const syncChecks = checked => {
      exactLinkedCurveId = null;
      [domainSection, roleSection].forEach(section => section.querySelectorAll('input[type="checkbox"]').forEach(input => { if (!input.disabled) input.checked = checked; }));
      selectedDomains.clear(); selectedRoles.clear();
      if (checked) {
        domains.filter(domain => curves.some(curve => curve.domainId === domain.domainId)).forEach(domain => selectedDomains.add(domain.domainId));
        ["core", "deep_dive"].forEach(role => selectedRoles.add(role));
      }
      renderCurrent();
    };
    allButton.addEventListener("click", () => syncChecks(true));
    noneButton.addEventListener("click", () => syncChecks(false));
    actions.append(allButton, noneButton);
    const result = document.createElement("p");
    result.className = "filter-result";
    search.addEventListener("input", () => {
      const term = search.value.trim().toLocaleLowerCase("de-DE");
      domainSection.querySelectorAll(".filter-option").forEach(option => { option.hidden = Boolean(term) && !option.dataset.filterText.includes(term); });
    });
    filterContent.append(search, domainSection, roleSection, segmentSection, actions, result);
  }
  function visibleReconstructions(curve) {
    const firstObservedYear = Math.min(...curve.observations.map(point => Number(point.year)));
    const visibleBreakYears = new Set((curve.methodBreaks || []).filter(marker => marker.showValues === true).map(marker => Number(marker.year)));
    return (curve.historicalReconstruction || []).map(segment => ({
      ...segment,
      points: segment.points.filter(point => Number(point.year) < firstObservedYear || (Number(point.year) === firstObservedYear && visibleBreakYears.has(firstObservedYear)))
    })).filter(segment => segment.points.length);
  }
  function visibleDisplayReconstructions(curve) {
    const firstObservedYear = Math.min(...curve.observations.map(point => Number(point.year)));
    const visibleBreakYears = new Set((curve.methodBreaks || []).filter(marker => marker.showValues === true).map(marker => Number(marker.year)));
    return (curve.displayHistoricalReconstruction || []).map(segment => ({
      ...segment,
      points: segment.points.filter(point => Number(point.year) < firstObservedYear || (Number(point.year) === firstObservedYear && visibleBreakYears.has(firstObservedYear)))
    })).filter(segment => segment.points.length);
  }
  function isSelectedSegment(curve, type, id) {
    return selectedSegment?.curveId === curve.curveId && selectedSegment.type === type && selectedSegment.id === id;
  }
  function bindSegmentInteraction(element, curve, type, id, label) {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `${label}: technische Details anzeigen`);
    if (isSelectedSegment(curve, type, id)) element.classList.add("is-segment-selected");
    const select = event => {
      event.stopPropagation();
      chooseSegment(curve, type, id);
    };
    element.addEventListener("click", select);
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(event); }
    });
    return element;
  }
  function extent(curve) {
    const points = [...curve.observations, ...visibleReconstructions(curve).flatMap(segment => segment.points), ...(curve.projections || []).flatMap(series => series.points)];
    const values = points.map(point => Number(point.value));
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const dataSpan = maximum - minimum || Math.max(Math.abs(maximum), 1);
    const padding = dataSpan / 3; // Daten belegen 60 %: je 20 % Abstand oben und unten.
    return { minimum: minimum - padding, maximum: maximum + padding };
  }
  function renderHistoricalEvents(svg, x, plotTop, plotBottom) {
    historicalEvents.forEach(event => {
      const start = Math.max(config.range.start, Number(event.start));
      const end = Math.min(config.range.end, Number(event.end ?? event.start));
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < config.range.start || start > config.range.end) return;
      const group = svgElement("g", {
        class: `historical-event${event.end == null ? " is-point" : " is-duration"}`,
        tabindex: "0",
        role: "img",
        "aria-label": event.detail
      });
      const startX = x(start);
      const endX = x(end);
      const width = Math.max(endX - startX, event.end == null ? 2 : 4);
      const centerX = startX + width / 2;
      group.appendChild(svgElement("rect", {
        class: "historical-event-band",
        x: startX,
        y: plotTop,
        width,
        height: plotBottom - plotTop
      }));
      group.appendChild(svgElement("line", {
        class: "historical-event-guide",
        x1: centerX,
        y1: plotTop,
        x2: centerX,
        y2: plotBottom
      }));
      const labelX = centerX + (Number(event.labelOffset) || 0);
      const labelY = 40;
      appendText(group, "text", event.label, {
        class: "historical-event-label",
        x: labelX,
        y: labelY,
        transform: `rotate(-45 ${labelX} ${labelY})`
      });
      const title = svgElement("title");
      title.textContent = event.detail;
      group.appendChild(title);
      svg.appendChild(group);
    });
  }
  function renderChart(curves) {
    const figure = document.createElement("figure");
    figure.className = "combined-chart";
    if (!curves.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Keine Kurve ausgewählt. Filter rechts öffnen und mindestens eine Grundlage aktivieren.";
      figure.appendChild(empty);
      return figure;
    }
    const width = 1400;
    const plotHeight = 460;
    const eventBandHeight = 26;
    const height = plotHeight + eventBandHeight;
    const plot = { left: 116, right: 76, top: eventBandHeight + 48, bottom: 70 };
    const plotBottom = height - plot.bottom;
    const x = year => plot.left + ((year - config.range.start) / (config.range.end - config.range.start)) * (width - plot.left - plot.right);
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${curves.length} überlagerte Zeitreihen auf einer gemeinsamen Zeitachse von 1700 bis 2100` });
    svg.classList.add("series-chart", "combined-series-chart");
    renderHistoricalEvents(svg, x, plot.top, plotBottom);
    for (let year = config.range.start; year <= config.range.end; year += 50) {
      svg.appendChild(svgElement("line", { class: "chart-grid", x1: x(year), y1: plot.top, x2: x(year), y2: plotBottom }));
      appendText(svg, "text", year, { class: "axis-label", x: x(year), y: height - 24 });
    }
    [0.2, 0.5, 0.8].forEach(position => {
      const y = plot.top + position * (height - plot.top - plot.bottom);
      svg.appendChild(svgElement("line", { class: "chart-grid chart-grid-horizontal", x1: plot.left, y1: y, x2: width - plot.right, y2: y }));
    });
    svg.appendChild(svgElement("line", { class: "chart-axis", x1: plot.left, y1: plotBottom, x2: width - plot.right, y2: plotBottom }));
    svg.appendChild(svgElement("line", { class: "chart-axis", x1: plot.left, y1: plot.top, x2: plot.left, y2: plotBottom }));
    appendText(svg, "text", "Jahr", { class: "axis-title", x: (plot.left + width - plot.right) / 2, y: height - 8 });
    const yAxisTitleX = 90;
    appendText(svg, "text", "Relativer Verlauf je Kurve", { class: "axis-title", x: yAxisTitleX, y: (plot.top + plotBottom) / 2, transform: `rotate(-90 ${yAxisTitleX} ${(plot.top + plotBottom) / 2})` });
    curves.forEach(curve => {
      const color = curveColor(curve);
      const meta = presentation[curve.seriesId] || { label: curve.label, detail: curve.metric, unit: curve.unit };
      const limits = extent(curve);
      const span = limits.maximum - limits.minimum;
      const y = value => plotBottom - ((value - limits.minimum) / span) * (plotBottom - plot.top);
      const curveGroup = svgElement("g", { class: `curve-series curve-role-${curve.curveRole}${curve.curveId === selectedCurveId ? " is-selected" : ""}`, tabindex: "0", role: "button", "aria-label": `${meta.label}: Zusatzinformationen anzeigen` });
      const selectCurve = event => {
        if (event && event.target !== curveGroup) return;
        chooseSegment(curve);
      };
      curveGroup.addEventListener("click", selectCurve);
      curveGroup.addEventListener("keydown", event => {
        if (event.target === curveGroup && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectCurve(); }
      });
      const reconstructions = visibleSegments.historical ? visibleReconstructions(curve) : [];
      const displayReconstructions = visibleSegments.historical ? visibleDisplayReconstructions(curve) : [];
      reconstructions.forEach(segment => {
        const path = svgElement("path", { class: "curve-historical", stroke: color, d: makePath(segment.points, x, y) });
        bindSegmentInteraction(path, curve, "historical", segment.id, `${meta.label} · ${segment.label || "Rekonstruktion"}`);
        curveGroup.appendChild(path);
        const displaySegment = displayReconstructions.find(item => item.id === segment.id);
        (displaySegment?.points || []).forEach(point => {
          const circle = svgElement("circle", { class: "curve-point is-historical", fill: "var(--paper)", stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
          bindSegmentInteraction(circle, curve, "historical", segment.id, `${meta.label} · ${segment.label || "Rekonstruktion"}`);
          const tooltip = svgElement("title");
          tooltip.textContent = `${pointDisplay(point, meta.unit)} · ${seriesOriginLabel(curve, segment.sourceRefs, "historical")} · rekonstruiert · unveränderter Quellenwert`;
          circle.appendChild(tooltip);
          curveGroup.appendChild(circle);
        });
      });
      const historicalPoints = reconstructions.flatMap(segment => segment.points);
      if (historicalPoints.length && curve.observations.length) {
        const lastHistoricalPoint = historicalPoints.reduce((latest, point) => Number(point.year) > Number(latest.year) ? point : latest);
        const firstObservedPoint = curve.observations.reduce((earliest, point) => Number(point.year) < Number(earliest.year) ? point : earliest);
        if (Number(lastHistoricalPoint.year) < Number(firstObservedPoint.year)) {
          curveGroup.appendChild(svgElement("path", {
            class: "curve-historical curve-transition",
            stroke: color,
            d: makePath([lastHistoricalPoint, firstObservedPoint], x, y)
          }));
        }
      }
      if (visibleSegments.observed) {
        const observedPath = svgElement("path", { class: "curve-observed", stroke: color, d: makePath(curve.observations, x, y) });
        bindSegmentInteraction(observedPath, curve, "observed", "observations", `${meta.label} · Messwerte`);
        curveGroup.appendChild(observedPath);
      }
      if (visibleSegments.projection) (curve.projections || []).forEach(projection => {
        const path = svgElement("path", { class: "curve-projection", stroke: color, d: makePath(projection.points, x, y) });
        bindSegmentInteraction(path, curve, "projection", projection.id, `${meta.label} · ${projection.scenarioLabel || projection.scenario || "Modellierung"}`);
        curveGroup.appendChild(path);
        const displayProjection = (curve.displayProjections || []).find(item => item.id === projection.id);
        (displayProjection?.points || []).forEach(point => {
          const circle = svgElement("circle", { class: "curve-point is-projection", fill: "var(--paper)", stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
          bindSegmentInteraction(circle, curve, "projection", projection.id, `${meta.label} · ${projection.scenarioLabel || projection.scenario || "Modellierung"}`);
          const tooltip = svgElement("title");
          tooltip.textContent = `${pointDisplay(point, meta.unit)} · ${seriesOriginLabel(curve, projection.sourceRefs, "projection")} · modelliert · unveränderter Quellenwert`;
          circle.appendChild(tooltip);
          curveGroup.appendChild(circle);
        });
      });
      if (visibleSegments.observed) curve.displayObservations.forEach(point => {
        const circle = svgElement("circle", { class: "curve-point", fill: color, stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
        bindSegmentInteraction(circle, curve, "observed", "observations", `${meta.label} · Messwerte`);
        const tooltip = svgElement("title");
        const dataType = curve.dataNature === "assessed_model_estimate" ? "wissenschaftlich geschätzt" : "beobachtet";
        tooltip.textContent = `${pointDisplay(point, meta.unit)} · ${seriesOriginLabel(curve, point.sourceRefs || curve.observationSourceRefs, "observed")} · ${dataType} · unveränderter Quellenwert`;
        circle.appendChild(tooltip);
        curveGroup.appendChild(circle);
      });
      [["boundary", "Planetare Grenze"], ["highRisk", "Hoher Risikobereich"]].forEach(([kind, label]) => {
        const assessment = curve.thresholdAssessments?.[kind];
        const point = assessment?.firstCrossingPoint;
        if (!visibleSegments.observed || curve.curveRole !== "core" || !point) return;
        const marker = svgElement("line", {
          class: `curve-threshold-crossing is-${kind}`,
          stroke: color,
          x1: x(Number(point.year)),
          y1: y(Number(point.value)) - 8,
          x2: x(Number(point.year)),
          y2: y(Number(point.value)) + 8,
          role: "img",
          "aria-label": `${label}: ${assessment.status === "already_crossed_at_start" ? "beim ersten Messpunkt bereits überschritten" : "erstmals im Datensatz überschritten"}, ${point.year}`
        });
        bindSegmentInteraction(marker, curve, "observed", "observations", `${meta.label} · Messwerte`);
        const title = svgElement("title");
        title.textContent = marker.getAttribute("aria-label");
        marker.appendChild(title);
        curveGroup.appendChild(marker);
      });
      svg.appendChild(curveGroup);
    });
    figure.appendChild(svg);
    const caption = document.createElement("figcaption");
    caption.className = "chart-caption";
    caption.textContent = "Alle Kurven liegen in einer gemeinsamen Zeichenfläche. Ihre vertikale Position zeigt jeweils den Verlauf innerhalb der eigenen Datenspanne und besitzt keine gemeinsame Y-Skala. Originalwerte und Einheiten stehen in den Tooltips; Herkunft und Aufbereitung öffnen sich nach Auswahl einer Kurve im technischen Detailfenster. Ober- und unterhalb jeder Kurve bleiben jeweils 20 % Darstellungsraum frei. Historische Ereignisse dienen ausschließlich der zeitlichen Orientierung und belegen keine Ursache-Wirkungs-Beziehung.";
    figure.appendChild(caption);
    return figure;
  }
  async function init() {
    if (!config?.import || !chart || !seriesCount || !importStatus || !legendContent || !gwlContributionLink || !curveDetailPanel || !curveDetailTitle || !curveDetailContent || !filterContent || !panelBackdrop || !curveLinkStatus || !curveLinkApi) return;
    try {
      const sourceUrl = new URL(config.import.source, window.location.href);
      if (sourceUrl.origin !== window.location.origin) fail("Externe Importquellen sind nicht erlaubt.");
      const response = await fetch(sourceUrl, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) fail(`Lokales Übergabepaket nicht verfügbar (${response.status}).`);
      const payload = await response.json();
      const hash = await verifyExport(payload);
      allCurves = payload.curves;
      payload.curves.forEach(curve => { selectedDomains.add(curve.domainId); selectedRoles.add(curve.curveRole); });
      const requestedCurveId = curveLinkApi.requestedCurveId(window.location.href);
      const linkedCurve = curveLinkApi.findCurve(payload.curves, requestedCurveId);
      if (requestedCurveId !== null && !linkedCurve) {
        curveLinkStatus.hidden = false;
        curveLinkStatus.textContent = "Die verlinkte Kurve ist nicht verfügbar. Sie wurde möglicherweise entfernt oder die Direktlink-ID ist unbekannt.";
      } else if (linkedCurve) {
        selectedCurveId = linkedCurve.curveId;
        exactLinkedCurveId = linkedCurve.curveId;
        selectedDomains.clear();
        selectedRoles.clear();
        selectedDomains.add(linkedCurve.domainId);
        selectedRoles.add(linkedCurve.curveRole);
      }
      createFilters(payload.curves);
      renderCurrent();
      if (linkedCurve) openCurveDetails();
      importStatus.className = "import-status is-valid";
      importStatus.textContent = `Import verifiziert · SHA-256 ${hash.slice(0, 12)}… · Manifest ${payload.manifestVersion}`;
    } catch (error) {
      chart.replaceChildren();
      const message = document.createElement("p");
      message.className = "empty-state is-error";
      message.textContent = "Import gesperrt. Das lokale Übergabepaket konnte nicht sicher verifiziert werden.";
      chart.appendChild(message);
      seriesCount.textContent = "0 Messreihen";
      importStatus.className = "import-status is-invalid";
      importStatus.textContent = error instanceof Error ? error.message : "Unbekannter Importfehler.";
      console.error("BLC-Import abgebrochen:", error);
    }
  }
  setupPanels();
  tryLandscapeLock();
  window.addEventListener("orientationchange", tryLandscapeLock);
  init();
})();
