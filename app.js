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
  const embedLegend = document.getElementById("embedLegend");
  const selectionApi = window.BRUCHLAST_SELECTION;
  const historicalEvents = Array.isArray(window.BRUCHLAST_EVENTS) ? window.BRUCHLAST_EVENTS : [];
  const referenceApi = window.BRUCHLAST_REFERENCE;
  const curveLinkApi = window.BRUCHLAST_CURVE_LINK;
  const svgNamespace = "http://www.w3.org/2000/svg";
  let namedViewRequest = null;
  const isEmbedView = new URL(window.location.href).searchParams.get("view") === "zustand";
  if (isEmbedView) document.documentElement.classList.add("is-embed-view");
  const allowedProjectionGrades = new Set(["robust_scenario_projection", "qualified_scenario_projection"]);
  const allowedCurveRoles = new Set(["core", "deep_dive"]);
  const allowedThresholdStatuses = new Set(["crossed", "already_crossed_at_start", "not_crossed", "series_ends_before_known_crossing", "not_assessable"]);
  const seriesColors = ["#171717", "#b4472d", "#24708a", "#66843c", "#745084", "#9b762d"];
  let allCurves = [];
  let importedExportText = "";
  let selectedCurveId = null;
  let selectedSegment = null;
  let startView = null;
  let updateCurveTable = () => {};
  let certificates = {};
  const certificatePublicationStatus = {};
  const selectedCurveIds = new Set();
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
    { domainId: "eah_material_energy_flows", label: "Rohstoffe", group: "Ergänzende Einflussbereiche" },
    { domainId: "eah_tech_social_environment", label: "Technologische & soziale Umwelt", group: "Ergänzende Einflussbereiche" }
  ]);
  const presentation = Object.freeze({
    global_cement_production_1926_2024_owid_usgs: {
      label: "Globale Zementproduktion",
      detail: "Jährliche globale Produktion hydraulischer Zemente aller Typen · Produktionsstatistik einschließlich amtlicher Schätzwerte",
      unit: "Mrd. t/Jahr"
    },
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
      unit: "% der potenziellen Waldfläche",
      fixedExtent: { minimum: 0, maximum: 100 },
      scaleNote: "Feste Skala 0–100 % der potenziellen Waldfläche. 100 % ist die Bezugsgröße, kein zusätzlicher historischer Datenpunkt.",
      showHistoricalReconstruction: false,
      observationMethod: "Hauptreihe 1992–2022 aus der Copernicus/ESA-CCI-Auswertung des Planetary Health Check 2025. Die Stützwerte wurden näherungsweise aus Figure 28 abgelesen. Die historische Rekonstruktion wird wegen abweichender Walddefinition und Bezugsfläche nicht dargestellt."
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
  function validateObservationSegments(curve) {
    if (curve.observationSegments === undefined) return;
    if (!Array.isArray(curve.observationSegments) || !curve.observationSegments.length) fail(curve.curveId + ': Statistiksegmente fehlen.');
    const sourceIds = new Set((curve.sources || []).map(source => source.id));
    const seen = new Set();
    const joined = [];
    for (const [index, segment] of curve.observationSegments.entries()) {
      if (!segment.id || seen.has(segment.id) || !validPoints(segment.points) || !segment.points.length || !validProvenance(segment.provenance) || !segment.sourceRefs?.length || segment.sourceRefs.some(ref => !sourceIds.has(ref))) fail(curve.curveId + ': ungültiges Statistiksegment.');
      seen.add(segment.id);
      if (segment.points.some(point => !point.sourceRefs?.length || point.sourceRefs.some(ref => !segment.sourceRefs.includes(ref)))) fail(curve.curveId + ': Punktquelle außerhalb des Statistiksegments.');
      if (index && !curve.methodBreaks?.some(marker => Number(marker.year) === Number(segment.points[0].year) && marker.label && marker.detail)) fail(curve.curveId + ': Erklärung des Statistikwechsels fehlt.');
      joined.push(...segment.points);
    }
    if (JSON.stringify(joined) !== JSON.stringify(curve.observations) || joined.some((point, index) => index && Number(point.year) <= Number(joined[index - 1].year))) fail(curve.curveId + ': Statistiksegmente decken die Originalwerte nicht genau einmal chronologisch ab.');
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
      validateObservationSegments(curve);
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
      for (const note of curve.contextNotes || []) {
        if (!note?.id || !note?.label || !note?.value || !note?.detail || !Array.isArray(note.sourceRefs) || !note.sourceRefs.length) fail(`${curve.curveId}: unvollständiger ergänzender Kontext.`);
        const sourceIds = new Set((curve.sources || []).map(source => source?.id).filter(Boolean));
        if (note.sourceRefs.some(sourceRef => !sourceIds.has(sourceRef))) fail(`${curve.curveId}: unbekannte Quelle im ergänzenden Kontext.`);
      }
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
    if (presentation[curve.seriesId]?.scaleNote) appendLabeledText(overview, "Darstellung", presentation[curve.seriesId].scaleNote);
    if (segment.type === "observed" && presentation[curve.seriesId]?.observationMethod) {
      appendLabeledText(overview, "Methode", segment.method);
    }
    if (curve.seriesId === "global_cement_production_1926_2024_owid_usgs") {
      appendLabeledText(overview, "Messgröße", curve.metric);
      appendLabeledText(overview, "Einheit", presentation[curve.seriesId].unit);
    }
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
  function observationSegmentForPoint(curve, point) {
    return curve.observationSegments?.find(segment => segment.points.some(candidate => Number(candidate.year) === Number(point.year)));
  }
  function resolveSegment(curve, selection = selectedSegment) {
    if (selection?.curveId === curve.curveId && selection.type === "observed") {
      const data = curve.observationSegments?.find(segment => segment.id === selection.id);
      if (data) return { ...data, type: "observed", uncertainty: curve.uncertainty, displayPointCount: Math.max(data.points.length === 1 ? 1 : 0, curve.displayObservations.filter(point => data.points.some(candidate => Number(candidate.year) === Number(point.year))).length), derivationKey: "observations" };
    }
    if (selection?.curveId === curve.curveId && selection.type === "historical" && presentation[curve.seriesId]?.showHistoricalReconstruction !== false) {
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
      label: curve.seriesId === "global_cement_production_1926_2024_owid_usgs" ? "Produktionsstatistik" : curve.dataNature === "assessed_model_estimate" ? "Wissenschaftliche Schätzreihe" : "Messwerte",
      period: `${curve.observationCoverage.startYear}–${curve.observationCoverage.endYear}`,
      method: presentation[curve.seriesId]?.observationMethod || curve.methodNote,
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
  function importedExampleLocation(curve, segment, point) {
    const curveIndex = allCurves.indexOf(curve);
    let listKey = "observations", listIndex = -1, displayKey = "displayObservations";
    if (segment.type === "historical") {
      listKey = "historicalReconstruction";
      displayKey = "displayHistoricalReconstruction";
      listIndex = curve[listKey].findIndex(item => item.id === segment.id);
    } else if (segment.type === "projection") {
      listKey = "projections";
      displayKey = "displayProjections";
      listIndex = curve[listKey].findIndex(item => item.id === segment.id);
    }
    const fullPoints = listIndex < 0 ? curve.observations : curve[listKey][listIndex].points;
    const displayIndex = listIndex < 0 ? -1 : curve[displayKey].findIndex(item => item.id === segment.id);
    const shownPoints = displayIndex < 0 ? curve.displayObservations : curve[displayKey][displayIndex].points;
    const pointIndex = fullPoints.findIndex(item => pointKey(item) === pointKey(point));
    const shownIndex = shownPoints.findIndex(item => pointKey(item) === pointKey(point));
    const pointer = listIndex < 0 ? '/curves/' + curveIndex + '/observations/' + pointIndex : '/curves/' + curveIndex + '/' + listKey + '/' + listIndex + '/points/' + pointIndex;
    const displayPointer = displayIndex < 0 ? '/curves/' + curveIndex + '/displayObservations/' + shownIndex : '/curves/' + curveIndex + '/' + displayKey + '/' + displayIndex + '/points/' + shownIndex;
    const locate = (key, segmentId) => {
      const curveStart = importedExportText.indexOf('"curveId": ' + JSON.stringify(curve.curveId));
      if (curveStart < 0) return null;
      let start = importedExportText.indexOf('"' + key + '": [', curveStart);
      if (start < 0) return null;
      if (segmentId) {
        start = importedExportText.indexOf('"id": ' + JSON.stringify(segmentId), start);
        if (start < 0) return null;
        start = importedExportText.indexOf('"points": [', start);
      }
      const pattern = new RegExp('"year":\\s*' + point.year + '\\s*,\\s*"value":\\s*' + String(point.value).replaceAll('.', '\\.') + '(?=\\s*[,}])');
      const match = pattern.exec(importedExportText.slice(start));
      if (!match) return null;
      const yearOffset = start + match.index;
      const valueOffset = yearOffset + match[0].indexOf('"value"');
      return {yearLine: importedExportText.slice(0, yearOffset).split(/\r?\n/).length, valueLine: importedExportText.slice(0, valueOffset).split(/\r?\n/).length};
    };
    return {pointer, displayPointer: shownIndex >= 0 ? displayPointer : null, lines: locate(listKey, listIndex < 0 ? null : segment.id), displayLines: shownIndex >= 0 ? locate(displayKey, displayIndex < 0 ? null : segment.id) : null};
  }
  function appendSegmentValueExample(parent, curve, segment) {
    const example = segment.provenance?.valueExample;
    if (!example) return;
    const point = segment.points.find(item => item.year === example.year);
    const convertedValue = example.sourceValue / example.divisor;
    const storedValue = Number.isInteger(example.roundingDigits) && example.roundingDigits >= 0 && example.roundingDigits <= 12
      ? Number(convertedValue.toFixed(example.roundingDigits)) : convertedValue;
    if (!point || point.value !== storedValue) return;
    const location = importedExampleLocation(curve, segment, point);
    const block = document.createElement("section");
    block.className = "curve-value-example";
    const title = document.createElement("strong");
    title.textContent = "Ein Wert rückwärts nachvollzogen";
    block.appendChild(title);
    const steps = document.createElement("ol");
    const step = (label, text) => {
      const item = document.createElement("li");
      appendLabeledText(item, label, text);
      steps.appendChild(item);
      return item;
    };
    const precise = value => new Intl.NumberFormat("de-DE", {maximumFractionDigits: 12}).format(value);
    step("Anzeige im Diagramm", 'X-Achse: Jahr ' + point.year + '. Y-Wert der Kurve: ' + precise(point.value) + ' ' + curve.unit + '; Tooltip: „' + pointDisplay(point, curve.unit) + '“. ' + (example.axisNote || 'Die Y-Achse zeigt den relativen Verlauf je Kurve und hat keine gemeinsame numerische Skala. Die Rundung im Tooltip verändert den zugrunde liegenden Wert nicht.'));
    const imported = step("Importierte Daten anzeigen", (location.lines ? 'Jahr in Zeile ' + location.lines.yearLine + ', Wert in Zeile ' + location.lines.valueLine + '. ' : '') + 'JSON-Pfad: ' + location.pointer + '/year = ' + point.year + '; ' + location.pointer + '/value = ' + point.value + '.');
    if (location.displayPointer) appendLabeledText(imported, "Sichtbare Punktmarke", (location.displayLines ? 'Jahr in Zeile ' + location.displayLines.yearLine + ', Wert in Zeile ' + location.displayLines.valueLine + '. ' : '') + 'Dieselbe Koordinate unter ' + location.displayPointer + '.');
    const importLink = document.createElement("a");
    importLink.href = config.import.source;
    importLink.target = "_blank";
    importLink.rel = "noopener noreferrer";
    importLink.textContent = "Importierte Daten anzeigen";
    imported.appendChild(importLink);
    const originalText = example.sourceLocator
      ? example.sourceLocator
      : 'CSV-Zeile ' + example.sourceLine + ' (Kopfzeile zählt als Zeile 1), Spalte ' + example.sourceColumnNumber + ' „' + example.sourceColumn + '“: ' + precise(example.sourceValue) + ' ' + example.sourceUnit + '. Identifikation: Entity=World; Code=OWID_WRL; Year=' + example.year + '. Zeilennummer bezieht sich auf den Download vom ' + example.retrievedAt + '; bei einer neuen Datenversion kann sie sich ändern.';
    const original = step("Originaldatensatz öffnen", originalText);
    if (example.sourceRow) {
      const raw = document.createElement("pre");
      raw.textContent = example.sourceHeader + '\n' + example.sourceRow;
      original.appendChild(raw);
    }
    const originalLink = document.createElement("a");
    originalLink.href = example.sourceUrl || segment.provenance.sourceUrl;
    originalLink.target = "_blank";
    originalLink.rel = "noopener noreferrer";
    originalLink.textContent = "Originaldatensatz öffnen";
    original.appendChild(originalLink);
    step("Rechenweg", example.calculationText || (precise(example.sourceValue) + ' ' + example.sourceUnit + ' ÷ ' + precise(example.divisor) + ' = ' + precise(point.value) + ' ' + curve.unit + '. Tooltip gerundet auf höchstens drei Nachkommastellen: ' + point.display + '. Das Jahr ' + point.year + ' wird unverändert übernommen. Keine Interpolation oder Glättung.'));
    block.appendChild(steps);
    parent.appendChild(block);
  }
  function appendSegmentDataDocumentation(panel, curve, segment) {
    const details = document.createElement("details");
    details.className = "curve-data-documentation";
    details.open = false;
    const summary = document.createElement("summary");
    summary.textContent = "Aufbereitung und Auswahlregeln anzeigen";
    details.appendChild(summary);
    appendSegmentValueExample(details, curve, segment);
    const rule = curve.displayDerivation?.[segment.derivationKey];
    if (rule) appendLabeledText(details, "Punktauswahl", `${segment.points?.length || 0} belegte Werte → ${segment.displayPointCount || 0} sichtbare Punkte. ${rule.rule}`);
    appendLabeledText(details, "Liniengrundlage", `Die Linie verwendet alle ${segment.points?.length || segment.points?.length || rule?.inputPointCount || 0} vorhandenen Werte dieses Segments; ausgedünnt werden nur die sichtbaren Punktmarken.`);
    if (segment.type === "observed" && curve.contextNotes?.length) {
      const contextHeading = document.createElement("strong");
      contextHeading.className = "curve-context-heading";
      contextHeading.textContent = "Ergänzender fachlicher Kontext";
      details.appendChild(contextHeading);
      curve.contextNotes.forEach(note => {
        const context = document.createElement("div");
        context.className = "curve-context-note";
        appendLabeledText(context, note.label, note.value);
        const explanation = document.createElement("p");
        explanation.textContent = note.detail;
        context.appendChild(explanation);
        const sources = uniqueSources(curve, note.sourceRefs || []);
        appendLabeledText(context, "Quellen", [...new Set(sources.map(compactSourceName))].join(" · ") || "nicht dokumentiert");
        details.appendChild(context);
      });
    }
    panel.appendChild(details);
  }
  function isLocalEditorHost() {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);
  }
  function certificateUrl(entry) {
    return new URL(entry.file, window.location.href).href;
  }
  async function loadCertificates() {
    try {
      const response = await fetch(new URL("data/certificates.json", window.location.href), { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.schemaVersion !== 1 || !payload.certificates || typeof payload.certificates !== "object") return;
      certificates = payload.certificates;
    } catch {
      certificates = {};
    }
  }
  function appendCertificatePanel(panel, curve) {
    const section = document.createElement("section");
    section.className = "curve-certificate";
    const heading = document.createElement("strong");
    heading.className = "curve-certificate-title";
    heading.textContent = "Prüfbericht und Zertifikat";
    section.appendChild(heading);
    const entry = certificates[curve.seriesId];
    if (entry?.file) {
      const status = document.createElement("p");
      status.className = "curve-certificate-status";
      const badge = document.createElement("span");
      badge.className = `curve-certificate-badge${entry.kind === "example" ? " is-example" : ""}`;
      badge.textContent = entry.kind === "example" ? "Beispiel · kein Zertifikat" : isLocalEditorHost() ? "PDF lokal verfügbar" : "Veröffentlicht";
      status.append(badge, ` ${entry.label || "PDF-Dokument"}`);
      const actions = document.createElement("div");
      actions.className = "curve-certificate-actions";
      const openLink = document.createElement("a");
      openLink.href = certificateUrl(entry);
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      openLink.textContent = "PDF öffnen";
      const downloadLink = document.createElement("a");
      downloadLink.href = certificateUrl(entry);
      downloadLink.download = "";
      downloadLink.textContent = "PDF herunterladen";
      actions.append(openLink, downloadLink);
      section.append(status, actions);
    } else {
      const empty = document.createElement("p");
      empty.className = "curve-certificate-empty";
      empty.textContent = "Für diese Kurve ist noch kein Prüfbericht oder Zertifikat veröffentlicht.";
      section.appendChild(empty);
    }
    if (isLocalEditorHost()) {
      const upload = document.createElement("div");
      upload.className = "curve-certificate-upload";
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf,.pdf";
      input.id = `certificate-upload-${curve.seriesId}`;
      const label = document.createElement("label");
      label.htmlFor = input.id;
      label.textContent = entry?.file ? "PDF ersetzen und veröffentlichen" : "PDF hochladen und veröffentlichen";
      const help = document.createElement("small");
      help.textContent = "Nur PDF bis 2 MB. Die Datei ersetzt die bisherige PDF und wird nach Prüfung automatisch veröffentlicht.";
      const result = document.createElement("output");
      result.className = "curve-certificate-upload-status";
      result.setAttribute("aria-live", "polite");
      result.textContent = certificatePublicationStatus[curve.seriesId] || "";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        if ((file.type && file.type !== "application/pdf") || !file.name.toLocaleLowerCase("de-DE").endsWith(".pdf")) {
          result.textContent = "Bitte eine PDF-Datei auswählen.";
          input.value = "";
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          result.textContent = "Die PDF ist größer als 2 MB.";
          input.value = "";
          return;
        }
        delete certificatePublicationStatus[curve.seriesId];
        result.textContent = "PDF wird gespeichert, geprüft und an GitHub übertragen …";
        input.disabled = true;
        try {
          const response = await fetch(`/api/certificates/${encodeURIComponent(curve.seriesId)}`, {
            method: "PUT",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/pdf",
              "X-Original-Filename": encodeURIComponent(file.name)
            },
            body: file
          });
          if ([404, 405, 501].includes(response.status)) throw new Error("Zum Veröffentlichen BLC26 über die Desktop-Verknüpfung öffnen und die Seite neu laden.");
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Upload fehlgeschlagen.");
          if (!payload.publication) throw new Error("PDF nur lokal gespeichert. Bitte den BLC26-Server neu starten und erneut hochladen.");
          certificates[curve.seriesId] = payload.certificate;
          certificatePublicationStatus[curve.seriesId] = "PDF an GitHub übertragen ✓ · Die öffentliche Seite wird automatisch aktualisiert.";
          renderCurrent();
          openCurveDetails();
        } catch (error) {
          result.textContent = error.message || "Upload fehlgeschlagen.";
          certificatePublicationStatus[curve.seriesId] = result.textContent;
          input.disabled = false;
          input.value = "";
        }
      });
      upload.append(input, label, help, result);
      section.appendChild(upload);
    }
    panel.appendChild(section);
  }
  function pointDisplay(point, unit) {
    const display = point.display || `${point.value} ${unit}`;
    const valueOnly = display.replace(new RegExp(`^${point.year}\\s*[:·]\\s*`), "");
    return `${point.year} · ${valueOnly}`;
  }
  function createLegend(curves, onSelect) {
    const legend = document.createElement("div");
    legend.className = "series-legend";
    const series = document.createElement("div");
    series.className = "legend-series-list";
    curves.forEach(curve => {
      const meta = presentation[curve.seriesId] || { label: curve.label, detail: curve.metric, unit: curve.unit };
      const row = document.createElement("div");
      row.className = "legend-series-row";
      const item = document.createElement("button");
      item.type = "button";
      item.className = `legend-series${curve.curveId === selectedCurveId ? " is-selected" : ""}`;
      if (curve.curveId === selectedCurveId) item.setAttribute("aria-current", "true");
      item.addEventListener("click", () => onSelect(curve));
      item.style.setProperty("--series-color", curveColor(curve));
      const label = document.createElement("strong");
      label.textContent = meta.label;
      item.appendChild(label);
      if (meta.scaleNote) {
        const scale = document.createElement("small");
        scale.textContent = meta.scaleNote;
        item.appendChild(scale);
      }
      row.append(item);
      series.appendChild(row);
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
    const visibleCurves = selectionApi.visibleCurves(allCurves, selectedCurveIds);
    chart.replaceChildren(renderChart(visibleCurves));
    if (isEmbedView && embedLegend) {
      embedLegend.replaceChildren(...visibleCurves.map(curve => {
        const item = document.createElement("span");
        item.className = "embed-legend-item";
        item.style.setProperty("--series-color", curveColor(curve));
        item.textContent = presentation[curve.seriesId]?.label || curve.label;
        return item;
      }));
    }
    legendContent.replaceChildren(createLegend(visibleCurves, curve => chooseSegment(curve)));
    updateCurveTable();
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
      appendCertificatePanel(curveDetailContent, selectedCurve);
    } else {
      curveDetailTitle.textContent = "Kurvendetails";
      closeCurveDetails();
    }
    seriesCount.textContent = `${visibleCurves.length} von ${allCurves.length} Kurven`;
    const result = filterContent.querySelector(".filter-result");
    if (result) result.textContent = `${visibleCurves.length} von ${allCurves.length} Kurven ausgewählt${Object.values(visibleSegments).some(Boolean) ? "" : " · Alle Darstellungsarten sind ausgeschaltet"}`;
  }
  function currentView() {
    return { version: 1, curveIds: allCurves.filter(curve => selectedCurveIds.has(curve.curveId)).map(curve => curve.curveId), segments: { ...visibleSegments } };
  }
  function applyView(view) {
    selectedCurveIds.clear();
    view.curveIds.forEach(id => selectedCurveIds.add(id));
    Object.assign(visibleSegments, view.segments);
  }
  function createFilters(curves) {
    filterContent.replaceChildren();
    const hint = document.createElement("p");
    hint.className = "selection-hint";
    hint.textContent = "Häkchen bestimmen das Diagramm. Suche und Filter durchsuchen nur die Tabelle; deine Auswahl bleibt erhalten.";
    const search = document.createElement("input");
    search.className = "filter-search";
    search.type = "search";
    search.placeholder = "Kurve oder Grundlage suchen";
    search.setAttribute("aria-label", search.placeholder);
    const listFilters = document.createElement("div");
    listFilters.className = "selection-list-filters";
    const createSelect = (label, options) => {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      const select = document.createElement("select");
      options.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
      wrapper.append(select);
      listFilters.append(wrapper);
      return select;
    };
    const domains = [...foundationCatalog];
    curves.forEach(curve => {
      if (!domains.some(domain => domain.domainId === curve.domainId)) domains.push({ domainId: curve.domainId, label: curve.domainLabel });
    });
    const domainSelect = createSelect("Grundlage", [["", "Alle Grundlagen"], ...domains.map(domain => [domain.domainId, domain.label + " (" + curves.filter(curve => curve.domainId === domain.domainId).length + ")"])]);
    const roleSelect = createSelect("Kurventyp", [["", "Alle Kurventypen"], ["core", "Kernkurven"], ["deep_dive", "Vertiefung"]]);
    const onlySelectedLabel = document.createElement("label");
    onlySelectedLabel.className = "selection-only";
    const onlySelected = document.createElement("input");
    onlySelected.type = "checkbox";
    onlySelectedLabel.append(onlySelected, "Nur ausgewählte zeigen");
    const result = document.createElement("p");
    result.className = "filter-result";
    result.setAttribute("role", "status");
    const matches = document.createElement("p");
    matches.className = "selection-hint";
    matches.setAttribute("role", "status");
    const table = document.createElement("table");
    table.className = "curve-selection-table";
    const caption = document.createElement("caption");
    caption.textContent = "Kurvenauswahl";
    const head = document.createElement("thead");
    const headings = document.createElement("tr");
    ["Anzeigen", "Kurve", "Grundlage / Typ"].forEach(text => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = text;
      headings.append(cell);
    });
    head.append(headings);
    const body = document.createElement("tbody");
    const rows = curves.map(curve => {
      const row = document.createElement("tr");
      const checkCell = document.createElement("td");
      const nameCell = document.createElement("td");
      const infoCell = document.createElement("td");
      const name = presentation[curve.seriesId]?.label || curve.label;
      const domain = domains.find(item => item.domainId === curve.domainId)?.label || curve.domainLabel;
      const check = document.createElement("input");
      check.type = "checkbox";
      check.setAttribute("aria-label", name + " anzeigen");
      check.addEventListener("change", () => {
        if (check.checked) selectedCurveIds.add(curve.curveId); else selectedCurveIds.delete(curve.curveId);
        renderCurrent();
      });
      const swatch = document.createElement("span");
      swatch.className = "selection-swatch";
      swatch.style.setProperty("--series-color", curveColor(curve));
      swatch.setAttribute("aria-hidden", "true");
      const label = document.createElement("label");
      check.id = "curve-choice-" + curves.indexOf(curve);
      label.htmlFor = check.id;
      label.textContent = name;
      nameCell.append(swatch, label);
      infoCell.textContent = domain + " · " + (curve.curveRole === "core" ? "Kernkurve" : "Vertiefung");
      checkCell.append(check);
      row.append(checkCell, nameCell, infoCell);
      body.append(row);
      return { curve, row, check, text: (name + " " + curve.label + " " + domain).toLocaleLowerCase("de-DE") };
    });
    table.append(caption, head, body);
    const segmentSection = makeFilterSection("Darstellung", [
      { value: "observed", label: "Hauptreihen", checked: visibleSegments.observed },
      { value: "historical", label: "Historische Rekonstruktionen", checked: visibleSegments.historical },
      { value: "projection", label: "Szenarien", checked: visibleSegments.projection }
    ], (segment, checked) => { visibleSegments[segment] = checked; renderCurrent(); });
    const actions = document.createElement("div");
    actions.className = "filter-actions selection-actions";
    const button = (text, action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = text;
      item.addEventListener("click", action);
      actions.append(item);
      return item;
    };
    button("Startansicht wiederherstellen", () => {
      applyView(startView);
      selectedCurveId = null;
      selectedSegment = null;
      search.value = domainSelect.value = roleSelect.value = "";
      onlySelected.checked = false;
      curveLinkStatus.hidden = true;
      const url = new URL(window.location.href);
      ["curve", "curves", "segments"].forEach(key => url.searchParams.delete(key));
      window.history.replaceState(null, "", url);
      renderCurrent();
    });
    button("Auswahl leeren", () => { selectedCurveIds.clear(); renderCurrent(); });
    button("Tabellentreffer hinzufügen", () => {
      rows.filter(item => !item.row.hidden).forEach(item => selectedCurveIds.add(item.curve.curveId));
      renderCurrent();
    });
    const message = document.createElement("p");
    message.className = "selection-message";
    message.setAttribute("role", "status");
    const linkField = document.createElement("input");
    linkField.className = "filter-search";
    linkField.readOnly = true;
    linkField.hidden = true;
    linkField.setAttribute("aria-label", "Link zur aktuellen Kurvenauswahl");
    button("Auswahl als Link kopieren", async () => {
      const url = selectionApi.selectionUrl(window.location.href, currentView());
      linkField.value = url;
      linkField.hidden = false;
      try {
        await navigator.clipboard.writeText(url);
        message.textContent = "Link zur Auswahl kopiert.";
      } catch {
        linkField.focus();
        linkField.select();
        message.textContent = "Bitte den markierten Link kopieren.";
      }
    });
    if (isLocalEditorHost()) {
      const publicationRow = document.createElement("div");
      publicationRow.className = "start-view-publication";
      const publicationCount = document.createElement("span");
      publicationCount.className = "publication-count";
      publicationCount.setAttribute("role", "status");
      const save = button("Startansicht veröffentlichen", async () => {
        save.disabled = true;
        publicationCount.textContent = "";
        message.textContent = "Startansicht wird gespeichert, geprüft und an GitHub übertragen …";
        try {
          const response = await fetch("api/start-view/publish", {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(currentView())
          });
          if ([404, 405, 501].includes(response.status)) throw new Error("Zum Veröffentlichen den Server auf Port 3000 beenden und BLC26 über start-server.cmd starten.");
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Speichern fehlgeschlagen.");
          if (!payload.publication) throw new Error("Bitte den BLC26-Server neu starten; die Veröffentlichung ist noch nicht verfügbar.");
          startView = selectionApi.validateView(payload.view, allCurves);
          publicationCount.textContent = `${payload.publication.curveCount} Kurven ✓`;
          publicationCount.title = "Anzahl der zuletzt erfolgreich an GitHub übertragenen Kurven";
          message.textContent = "An GitHub übertragen. Die öffentliche Seite wird jetzt automatisch aktualisiert.";
        } catch (error) { message.textContent = error.message; }
        finally { save.disabled = false; }
      });
      publicationRow.append(save, publicationCount);
      actions.append(publicationRow);
    }
    updateCurveTable = () => {
      if (!linkField.hidden && linkField.value !== selectionApi.selectionUrl(window.location.href, currentView())) {
        linkField.hidden = true;
        message.textContent = "";
      }
      const term = search.value.trim().toLocaleLowerCase("de-DE");
      rows.forEach(({ curve, row, check, text }) => {
        check.checked = selectedCurveIds.has(curve.curveId);
        row.hidden = Boolean((term && !text.includes(term)) || (domainSelect.value && curve.domainId !== domainSelect.value) ||
          (roleSelect.value && curve.curveRole !== roleSelect.value) || (onlySelected.checked && !check.checked));
      });
      const count = rows.filter(item => !item.row.hidden).length;
      matches.textContent = count ? count + " Kurven in der Tabelle" : "Keine Treffer. Suche oder Tabellenfilter ändern.";
      segmentSection.querySelectorAll("input").forEach((input, index) => {
        input.checked = visibleSegments[["observed", "historical", "projection"][index]];
      });
    };
    search.addEventListener("input", updateCurveTable);
    [domainSelect, roleSelect, onlySelected].forEach(input => input.addEventListener("change", updateCurveTable));
    filterContent.append(hint, search, listFilters, onlySelectedLabel, result, actions, message, linkField, segmentSection, matches, table);
  }
  function visibleReconstructions(curve) {
    if (presentation[curve.seriesId]?.showHistoricalReconstruction === false) return [];
    const firstObservedYear = Math.min(...curve.observations.map(point => Number(point.year)));
    const visibleBreakYears = new Set((curve.methodBreaks || []).filter(marker => marker.showValues === true).map(marker => Number(marker.year)));
    return (curve.historicalReconstruction || []).map(segment => ({
      ...segment,
      points: segment.points.filter(point => Number(point.year) < firstObservedYear || (Number(point.year) === firstObservedYear && visibleBreakYears.has(firstObservedYear)))
    })).filter(segment => segment.points.length);
  }
  function visibleDisplayReconstructions(curve) {
    if (presentation[curve.seriesId]?.showHistoricalReconstruction === false) return [];
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
    const fixed = presentation[curve.seriesId]?.fixedExtent;
    if (fixed) return fixed;
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
      empty.textContent = "Keine Kurve ausgewählt. Rechts die Kurvenauswahl öffnen und Kurven ankreuzen oder die Startansicht wiederherstellen.";
      figure.appendChild(empty);
      return figure;
    }
    const width = 1400;
    const plotHeight = isEmbedView ? 700 : 460;
    const eventBandHeight = 26;
    const height = plotHeight + eventBandHeight;
    const plot = { left: 116, right: 76, top: eventBandHeight + 48, bottom: 70 };
    const plotBottom = height - plot.bottom;
    const x = year => plot.left + ((year - config.range.start) / (config.range.end - config.range.start)) * (width - plot.left - plot.right);
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${curves.length} überlagerte Zeitreihen auf einer gemeinsamen Zeitachse von 1700 bis 2100` });
    svg.classList.add("series-chart", "combined-series-chart");
    const valuePopover = document.createElement("output");
    valuePopover.className = "curve-value-popover";
    valuePopover.setAttribute("aria-live", "polite");
    valuePopover.hidden = true;
    let touchSelection = null;
    let lastTouchInteractionAt = 0;
    const hideTouchValue = () => {
      valuePopover.hidden = true;
      svg.querySelector(".curve-touch-marker")?.remove();
    };
    const nearestPoint = (points, event, y) => {
      const bounds = svg.getBoundingClientRect();
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * width;
      const pointerY = ((event.clientY - bounds.top) / bounds.height) * height;
      return points.reduce((nearest, point) => {
        const pointX = x(Number(point.year));
        const pointY = y(Number(point.value));
        const distance = ((pointX - pointerX) ** 2) + ((pointY - pointerY) ** 2);
        return !nearest || distance < nearest.distance ? { point, pointX, pointY, distance } : nearest;
      }, null);
    };
    const bindTouchTarget = (curveGroup, curve, type, id, label, points, color, y, pathData) => {
      if (!points.length || !pathData) return;
      const target = svgElement("path", {
        class: "curve-touch-target",
        d: pathData,
        fill: "none",
        stroke: "transparent",
        "stroke-width": 28,
        "aria-hidden": "true"
      });
      const showValue = (event, hintText) => {
        const nearest = nearestPoint(points, event, y);
        if (!nearest) return;
        svg.querySelector(".curve-touch-marker")?.remove();
        svg.appendChild(svgElement("circle", {
          class: "curve-touch-marker",
          cx: nearest.pointX,
          cy: nearest.pointY,
          r: 8,
          fill: "var(--paper)",
          stroke: color
        }));
        valuePopover.replaceChildren();
        const curveName = document.createElement("strong");
        curveName.textContent = label;
        const value = document.createElement("span");
        value.textContent = pointDisplay(nearest.point, curve.unit);
        const hint = document.createElement("small");
        hint.textContent = hintText;
        valuePopover.append(curveName, value, hint);
        valuePopover.style.left = `${(nearest.pointX / width) * 100}%`;
        valuePopover.style.top = `${(nearest.pointY / height) * 100}%`;
        valuePopover.hidden = false;
      };
      const showMouseValue = event => {
        if (event.pointerType !== "mouse") return;
        touchSelection = null;
        showValue(event, "Klicken: Kurvendetails");
      };
      target.addEventListener("pointerenter", showMouseValue);
      target.addEventListener("pointermove", showMouseValue);
      target.addEventListener("pointerleave", event => {
        if (event.pointerType === "mouse") hideTouchValue();
      });
      target.addEventListener("pointerup", event => {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        lastTouchInteractionAt = now;
        const isSecondTap = touchSelection?.curveId === curve.curveId && now - touchSelection.time <= 550;
        if (isSecondTap) {
          touchSelection = null;
          hideTouchValue();
          chooseSegment(curve, type, id);
          return;
        }
        touchSelection = { curveId: curve.curveId, time: now };
        showValue(event, "Nochmals tippen: Kurvendetails");
      });
      target.addEventListener("click", event => {
        event.stopPropagation();
        if (Date.now() - lastTouchInteractionAt < 800) {
          event.preventDefault();
          return;
        }
        chooseSegment(curve, type, id);
      });
      curveGroup.appendChild(target);
    };
    svg.addEventListener("pointerdown", event => {
      if ((event.pointerType === "touch" || event.pointerType === "pen") && !event.target.closest(".curve-touch-target")) {
        touchSelection = null;
        hideTouchValue();
      }
    });
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
        const pathData = makePath(segment.points, x, y);
        const path = svgElement("path", { class: "curve-historical", stroke: color, d: pathData });
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
        bindTouchTarget(curveGroup, curve, "historical", segment.id, meta.label, segment.points, color, y, pathData);
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
        const segments = curve.observationSegments || [{ id: "observations", label: "Messwerte", points: curve.observations }];
        segments.forEach(segment => {
          const pathData = makePath(segment.points, x, y);
          const observedPath = svgElement("path", { class: "curve-observed", stroke: color, d: pathData });
          bindSegmentInteraction(observedPath, curve, "observed", segment.id, meta.label + " · " + segment.label);
          const title = svgElement("title");
          title.textContent = [segment.label, segment.period, segment.geography, segment.method].filter(Boolean).join(" · ");
          observedPath.appendChild(title);
          curveGroup.appendChild(observedPath);
          // A section containing one original value has no drawable line.
          if (segment.points.length === 1 && !curve.displayObservations.some(point => Number(point.year) === Number(segment.points[0].year))) {
            const point = segment.points[0];
            const circle = svgElement("circle", { class: "curve-point", fill: color, stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
            bindSegmentInteraction(circle, curve, "observed", segment.id, meta.label + " · " + segment.label);
            const tooltip = svgElement("title");
            tooltip.textContent = pointDisplay(point, meta.unit) + " · " + segment.label + " · " + segment.method;
            circle.appendChild(tooltip);
            curveGroup.appendChild(circle);
          }
          bindTouchTarget(curveGroup, curve, "observed", segment.id, meta.label, segment.points, color, y, pathData);
        });
      }
      if (visibleSegments.projection) (curve.projections || []).forEach(projection => {
        const first = projection.points.reduce((earliest, point) => Number(point.year) < Number(earliest.year) ? point : earliest, projection.points[0]);
        const last = curve.observations.reduce((latest, point) => Number(point.year) > Number(latest.year) ? point : latest, curve.observations[0]);
        if (visibleSegments.observed && last && first && Number(last.year) < Number(first.year)) {
          const transition = svgElement("path", {
            class: "curve-projection curve-transition",
            stroke: color,
            style: "stroke-dasharray: 6 5",
            d: makePath([last, first], x, y)
          });
          const title = svgElement("title");
          title.textContent = "Übergang vom letzten historischen Wert zum ersten Szenariowert; keine zusätzlichen Datenpunkte";
          transition.appendChild(title);
          bindSegmentInteraction(transition, curve, "projection", projection.id, `${meta.label} · Übergang zum Szenario`);
          curveGroup.appendChild(transition);
        }
        const pathData = makePath(projection.points, x, y);
        const path = svgElement("path", { class: "curve-projection", stroke: color, d: pathData });
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
        bindTouchTarget(curveGroup, curve, "projection", projection.id, meta.label, projection.points, color, y, pathData);
      });
      if (visibleSegments.observed) curve.displayObservations.forEach(point => {
        const circle = svgElement("circle", { class: "curve-point", fill: color, stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
        const observationSegment = observationSegmentForPoint(curve, point);
        bindSegmentInteraction(circle, curve, "observed", observationSegment?.id || "observations", `${meta.label} · ${observationSegment?.label || "Messwerte"}`);
        const tooltip = svgElement("title");
        const dataType = curve.dataNature === "assessed_model_estimate" ? "wissenschaftlich geschätzt" : "beobachtet";
        tooltip.textContent = `${pointDisplay(point, meta.unit)} · ${seriesOriginLabel(curve, point.sourceRefs || curve.observationSourceRefs, "observed")} · ${dataType} · unveränderter Quellenwert`;
        if (observationSegment) tooltip.textContent += " · " + observationSegment.label + " · " + observationSegment.geography;
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
    figure.append(svg, valuePopover);
    const caption = document.createElement("figcaption");
    caption.className = "chart-caption";
    caption.textContent = "Alle Kurven liegen in einer gemeinsamen Zeichenfläche. Ihre vertikale Position zeigt jeweils den Verlauf innerhalb der eigenen Datenspanne und besitzt keine gemeinsame Y-Skala. Originalwerte und Einheiten stehen in den Tooltips; Herkunft und Aufbereitung öffnen sich nach Auswahl einer Kurve im technischen Detailfenster. Automatisch skalierte Kurven erhalten oben und unten jeweils 20 % Darstellungsraum. Die Waldfläche verwendet einen festen Bezugsrahmen von 0–100 % der potenziellen Waldfläche. Historische Ereignisse dienen ausschließlich der zeitlichen Orientierung und belegen keine Ursache-Wirkungs-Beziehung.";
    figure.appendChild(caption);
    return figure;
  }
  async function init() {
    if (!config?.import || !chart || !seriesCount || !importStatus || !legendContent || !gwlContributionLink || !curveDetailPanel || !curveDetailTitle || !curveDetailContent || !filterContent || !panelBackdrop || !curveLinkStatus || !selectionApi || !curveLinkApi) return;
    try {
      const sourceUrl = new URL(config.import.source, window.location.href);
      if (sourceUrl.origin !== window.location.origin) fail("Externe Importquellen sind nicht erlaubt.");
      const response = await fetch(sourceUrl, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) fail(`Lokales Übergabepaket nicht verfügbar (${response.status}).`);
      importedExportText = await response.text();
      const payload = JSON.parse(importedExportText);
      const hash = await verifyExport(payload);
      allCurves = payload.curves;
      await loadCertificates();
      try {
        const response = await fetch("data/start-view.json", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("Startansicht nicht verfügbar.");
        startView = selectionApi.validateView(await response.json(), allCurves, true);
        if (startView.missing.length) {
          curveLinkStatus.hidden = false;
          curveLinkStatus.textContent = "Einige Kurven der Startansicht sind nicht mehr verfügbar. Bitte die Auswahl prüfen.";
        }
      } catch {
        startView = { version: 1, curveIds: [], segments: { observed: true, historical: true, projection: true } };
        curveLinkStatus.hidden = false;
        curveLinkStatus.textContent = "Die Startansicht konnte nicht geladen werden. Bitte Kurven über die Kurvenauswahl hinzufügen.";
      }
      applyView(startView);
      namedViewRequest = selectionApi.requestedNamedView(window.location.href, config.views, allCurves);
      const requestedCurveId = curveLinkApi.requestedCurveId(window.location.href);
      const linkedCurve = curveLinkApi.findCurve(payload.curves, requestedCurveId);
      if (requestedCurveId !== null && !linkedCurve) {
        curveLinkStatus.hidden = false;
        curveLinkStatus.textContent = "Die verlinkte Kurve ist nicht verfügbar. Die Startansicht wird angezeigt.";
      } else if (linkedCurve) {
        selectedCurveIds.clear();
        selectedCurveIds.add(linkedCurve.curveId);
        Object.assign(visibleSegments, { observed: true, historical: true, projection: true });
        selectedCurveId = linkedCurve.curveId;
      } else if (namedViewRequest) {
        applyView(namedViewRequest.view);
      } else {
        try {
          const linkedView = selectionApi.requestedView(window.location.href, allCurves);
          if (linkedView) applyView(linkedView);
        } catch (error) {
          curveLinkStatus.hidden = false;
          curveLinkStatus.textContent = error.message + " Die Startansicht wird angezeigt.";
        }
      }
      createFilters(payload.curves);
      renderCurrent();
      closeCurveDetails();
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
