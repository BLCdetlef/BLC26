(function () {
  "use strict";
  const config = window.BRUCHLAST_DATA;
  const chart = document.getElementById("chart");
  const seriesCount = document.getElementById("seriesCount");
  const importStatus = document.getElementById("importStatus");
  const legendContent = document.getElementById("legendContent");
  const gwlContributionLink = document.getElementById("gwlContributionLink");
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
      const observationYears = new Set(curve.observations.map(point => Number(point.year)));
      if (curve.displayObservations.some(point => !observationYears.has(Number(point.year)))) fail(`${curve.curveId}: Darstellungsreihe enthält keinen Originalpunkt.`);
      referenceApi.validateReference(curve);
      for (const kind of ["boundary", "highRisk"]) {
        const assessment = curve.thresholdAssessments?.[kind];
        if (!assessment || !allowedThresholdStatuses.has(assessment.status)) fail(`${curve.curveId}: ungültiger Grenzstatus für ${kind}.`);
      }
      for (const segment of curve.historicalReconstruction || []) if (!validPoints(segment.points) || !segment.points.length) fail(`${curve.curveId}: ungültige Rekonstruktion.`);
      for (const projection of curve.projections || []) {
        if (!allowedProjectionGrades.has(projection.grade) || !validPoints(projection.points) || !projection.points.length) fail(`${curve.curveId}: nicht qualifizierte oder ungültige Projektion.`);
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
  function showReference(panel, curve) {
    const meta = presentation[curve.seriesId] || { label: curve.label, detail: curve.metric, unit: curve.unit };
    const status = referenceApi.referenceStatus(curve);
    panel.replaceChildren();
    panel.hidden = false;
    const heading = document.createElement("strong");
    heading.className = "curve-reference-title";
    heading.textContent = meta.label;
    panel.appendChild(heading);
    if (status.state === "missing" || status.state === "unknown") {
      const message = document.createElement("p");
      message.textContent = status.label;
      panel.appendChild(message);
      appendDataDocumentation(panel, curve);
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
      panel.append(kind, reference, assessment);
      appendReferenceSources(panel, curve, status.reference);
      appendDataDocumentation(panel, curve);
      return;
    }
    const current = document.createElement("p");
    current.textContent = `${curve.dataNature === "assessed_model_estimate" ? "Letzter Schätzwert" : "Letzter Beobachtungswert"} (${status.observation.year}): ${status.observation.display || `${formatNumber(status.observation.value)} ${curve.unit}`}`;
    const assessment = document.createElement("p");
    assessment.className = "curve-reference-status";
    assessment.textContent = status.label;
    panel.append(kind, reference, current, assessment);
    appendReferenceSources(panel, curve, status.reference);
    appendDataDocumentation(panel, curve);
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
    panelBackdrop.addEventListener("click", closePanels);
    document.addEventListener("keydown", event => { if (event.key === "Escape") closePanels(); });
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
      sources.append("Quelle der Modellreferenz: ");
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
  function appendDataDocumentation(panel, curve) {
    const details = document.createElement("details");
    details.className = "curve-data-documentation";
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Datenherkunft und Darstellungsherleitung";
    details.appendChild(summary);
    if (curve.methodNote) appendLabeledText(details, "Methode", curve.methodNote);
    if (curve.uncertainty) appendLabeledText(details, "Einordnung", curve.uncertainty);
    const derivationLabels = {
      observations: curve.dataNature === "assessed_model_estimate" ? "Wissenschaftliche Schätzreihe" : "Messwerte",
      historicalReconstruction: "Rekonstruktion",
      projections: "Modellierung"
    };
    Object.entries(derivationLabels).forEach(([key, label]) => {
      const rule = curve.displayDerivation?.[key];
      if (!rule) return;
      appendLabeledText(details, label, `${rule.inputPointCount} belegte Werte → ${rule.outputPointCount} sichtbare Punkte. ${rule.rule}`);
    });
    const noInterpolation = document.createElement("p");
    noInterpolation.className = "curve-derivation-note";
    noInterpolation.textContent = "Keine Interpolation und keine Werttransformation für die Darstellung.";
    details.appendChild(noInterpolation);
    const sourceMap = new Map((curve.sources || []).map(source => [source.id, source]));
    const groups = [
      [curve.dataNature === "assessed_model_estimate" ? "Wissenschaftliche Schätzreihe" : "Messreihe", curve.observationSourceRefs || []],
      ["Rekonstruktion", (curve.historicalReconstruction || []).flatMap(segment => segment.sourceRefs || [])],
      ["Modellierung", (curve.projections || []).flatMap(series => series.sourceRefs || [])]
    ];
    groups.forEach(([label, refs]) => {
      const uniqueRefs = [...new Set(refs)];
      if (!uniqueRefs.length) return;
      const heading = document.createElement("strong");
      heading.className = "curve-source-heading";
      heading.textContent = `${label} – Quellen`;
      const list = document.createElement("ul");
      list.className = "curve-source-list";
      uniqueRefs.forEach(id => {
        const source = sourceMap.get(id) || { id, title: id };
        const item = document.createElement("li");
        const labelText = [source.title || source.id, source.publisher, source.year].filter(Boolean).join(" · ");
        const href = source.url || (source.doi ? `https://doi.org/${source.doi}` : "");
        if (href) {
          const link = document.createElement("a");
          link.href = href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = labelText;
          item.appendChild(link);
        } else item.textContent = labelText;
        list.appendChild(item);
      });
      details.append(heading, list);
    });
    panel.appendChild(details);
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
      const detail = document.createElement("span");
      detail.textContent = `${meta.detail} · ${meta.unit}`;
      item.append(label, detail);
      series.appendChild(item);
    });
    legend.appendChild(series);
    const types = document.createElement("div");
    types.className = "legend-types";
    [["observed", "Hauptreihe"], ["historical", "Rekonstruktion"], ["projection", "Szenario"]].forEach(([type, label]) => {
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
  function renderCurrent() {
    const visibleCurves = curveLinkApi.visibleCurves(allCurves, selectedDomains, selectedRoles, exactLinkedCurveId);
    chart.replaceChildren(renderChart(visibleCurves));
    legendContent.replaceChildren(createLegend(visibleCurves, curve => {
      selectedCurveId = curve.curveId;
      renderCurrent();
    }));
    const referencePanel = createReferencePanel();
    legendContent.appendChild(referencePanel);
    const selectedCurve = visibleCurves.find(curve => curve.curveId === selectedCurveId);
    const contributionUrl = curveLinkApi.selectedGwlContributionUrl(visibleCurves, selectedCurveId);
    if (contributionUrl) {
      gwlContributionLink.href = contributionUrl;
      gwlContributionLink.hidden = false;
    } else {
      gwlContributionLink.hidden = true;
      gwlContributionLink.removeAttribute("href");
    }
    if (selectedCurve) showReference(referencePanel, selectedCurve);
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
    return (curve.historicalReconstruction || []).map(segment => ({
      ...segment,
      points: segment.points.filter(point => Number(point.year) < firstObservedYear)
    })).filter(segment => segment.points.length);
  }
  function visibleDisplayReconstructions(curve) {
    const firstObservedYear = Math.min(...curve.observations.map(point => Number(point.year)));
    return (curve.displayHistoricalReconstruction || []).map(segment => ({
      ...segment,
      points: segment.points.filter(point => Number(point.year) < firstObservedYear)
    })).filter(segment => segment.points.length);
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
      empty.textContent = "Keine Kurve ausgewählt. Filter links öffnen und mindestens eine Grundlage aktivieren.";
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
      const selectCurve = () => {
        selectedCurveId = curve.curveId;
        renderCurrent();
        if (document.getElementById("legendPanel").getAttribute("aria-hidden") === "true") openPanel("legendPanel");
      };
      curveGroup.addEventListener("click", selectCurve);
      curveGroup.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCurve(); }
      });
      const reconstructions = visibleSegments.historical ? visibleReconstructions(curve) : [];
      reconstructions.forEach(segment => curveGroup.appendChild(svgElement("path", { class: "curve-historical", stroke: color, d: makePath(segment.points, x, y) })));
      if (visibleSegments.historical) visibleDisplayReconstructions(curve).flatMap(segment => segment.points).forEach(point => {
        const circle = svgElement("circle", { class: "curve-point is-historical", fill: "var(--paper)", stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
        const tooltip = svgElement("title");
        tooltip.textContent = `${meta.label} · Rekonstruktion · ${point.year}: ${point.display || `${point.value} ${meta.unit}`}`;
        circle.appendChild(tooltip);
        curveGroup.appendChild(circle);
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
      if (visibleSegments.observed) curveGroup.appendChild(svgElement("path", { class: "curve-observed", stroke: color, d: makePath(curve.observations, x, y) }));
      if (visibleSegments.projection) (curve.projections || []).forEach(projection => curveGroup.appendChild(svgElement("path", { class: "curve-projection", stroke: color, d: makePath(projection.points, x, y) })));
      if (visibleSegments.projection) (curve.displayProjections || []).forEach(projection => projection.points.forEach(point => {
        const circle = svgElement("circle", { class: "curve-point is-projection", fill: "var(--paper)", stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
        const tooltip = svgElement("title");
        tooltip.textContent = point.display
          ? `${meta.label} · ${point.display}`
          : `${meta.label} · ${projection.scenarioLabel || projection.scenario || "Modellierung"} · ${point.year}: ${point.value} ${meta.unit}`;
        circle.appendChild(tooltip);
        curveGroup.appendChild(circle);
      }));
      if (visibleSegments.observed) curve.displayObservations.forEach(point => {
        const circle = svgElement("circle", { class: "curve-point", fill: color, stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
        const tooltip = svgElement("title");
        tooltip.textContent = `${meta.label} · ${point.year}: ${point.display || `${point.value} ${meta.unit}`}`;
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
    caption.textContent = "Alle Kurven liegen in einer gemeinsamen Zeichenfläche. Ihre vertikale Position zeigt jeweils den Verlauf innerhalb der eigenen Datenspanne und besitzt keine gemeinsame Y-Skala. Originalwerte und Einheiten stehen in den Tooltips und in der Legende. Ober- und unterhalb jeder Kurve bleiben jeweils 20 % Darstellungsraum frei. Historische Ereignisse dienen ausschließlich der zeitlichen Orientierung und belegen keine Ursache-Wirkungs-Beziehung.";
    figure.appendChild(caption);
    return figure;
  }
  async function init() {
    if (!config?.import || !chart || !seriesCount || !importStatus || !legendContent || !gwlContributionLink || !filterContent || !panelBackdrop || !curveLinkStatus || !curveLinkApi) return;
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
      if (linkedCurve) openPanel("legendPanel");
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
