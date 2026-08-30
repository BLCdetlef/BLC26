(function () {
  "use strict";
  const config = window.BRUCHLAST_DATA;
  const chart = document.getElementById("chart");
  const seriesCount = document.getElementById("seriesCount");
  const importStatus = document.getElementById("importStatus");
  const historicalEvents = Array.isArray(window.BRUCHLAST_EVENTS) ? window.BRUCHLAST_EVENTS : [];
  const svgNamespace = "http://www.w3.org/2000/svg";
  const allowedProjectionGrades = new Set(["robust_scenario_projection", "qualified_scenario_projection"]);
  const seriesColors = ["#171717", "#b4472d", "#24708a", "#66843c", "#745084", "#9b762d"];
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
    blue_water_streamflow: {
      label: "Landfläche mit ungewöhnlichem Flussabfluss",
      detail: "Anteil mit ungewöhnlich hohem oder niedrigem Abfluss · höher = mehr gestörte Fläche",
      unit: "% der eisfreien Landfläche"
    },
    global_forest_cover_1992_2022: {
      label: "Verbleibende globale Waldfläche",
      detail: "Anteil an der potenziellen natürlichen Waldfläche · niedriger = weniger Wald",
      unit: "% der potenziellen Waldfläche"
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
    if (!Array.isArray(payload.curves)) fail("Kurvenliste fehlt.");
    if (payload.integrity?.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(payload.integrity?.hash || "")) fail("Integritätsangabe fehlt.");
    const signedPayload = { format: payload.format, version: payload.version, manifestVersion: payload.manifestVersion, curves: payload.curves };
    const actualHash = await sha256(JSON.stringify(signedPayload));
    if (actualHash !== payload.integrity.hash) fail("Integritätsprüfung fehlgeschlagen. Das Paket wurde verändert oder beschädigt.");
    const seen = new Set();
    for (const curve of payload.curves) {
      if (!curve?.curveId || seen.has(curve.curveId)) fail("Kurven-ID fehlt oder ist doppelt.");
      seen.add(curve.curveId);
      if (!curve.source?.startsWith("data/knowledge/") || curve.source.includes("..")) fail(`${curve.curveId}: unzulässiger Quellverweis.`);
      if (!validPoints(curve.observations) || curve.observations.length < 2) fail(`${curve.curveId}: gültige Beobachtungsreihe fehlt.`);
      for (const segment of curve.historicalReconstruction || []) if (!validPoints(segment.points) || !segment.points.length) fail(`${curve.curveId}: ungültige Rekonstruktion.`);
      for (const projection of curve.projections || []) {
        if (!allowedProjectionGrades.has(projection.grade) || !validPoints(projection.points) || !projection.points.length) fail(`${curve.curveId}: nicht qualifizierte oder ungültige Projektion.`);
      }
    }
    return actualHash;
  }
  function makePath(points, x, y) {
    return points.map((point, index) => `${index ? "L" : "M"}${x(Number(point.year)).toFixed(2)} ${y(Number(point.value)).toFixed(2)}`).join(" ");
  }
  function createLegend(curves) {
    const legend = document.createElement("div");
    legend.className = "series-legend";
    const series = document.createElement("div");
    series.className = "legend-series-list";
    curves.forEach((curve, curveIndex) => {
      const meta = presentation[curve.seriesId] || { label: curve.label, detail: curve.metric, unit: curve.unit };
      const item = document.createElement("div");
      item.className = "legend-series";
      item.style.setProperty("--series-color", seriesColors[curveIndex % seriesColors.length]);
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
    [["observed", "Beobachtung"], ["historical", "Rekonstruktion"], ["projection", "Szenario"]].forEach(([type, label]) => {
      const item = document.createElement("span");
      item.className = `legend-${type}`;
      item.textContent = label;
      types.appendChild(item);
    });
    legend.appendChild(types);
    return legend;
  }
  function extent(curve) {
    const points = [...curve.observations, ...(curve.historicalReconstruction || []).flatMap(segment => segment.points), ...(curve.projections || []).flatMap(series => series.points)];
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
      const labelY = 106;
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
    const width = 1400;
    const plotHeight = 460;
    const eventBandHeight = 112;
    const height = plotHeight + eventBandHeight;
    const plot = { left: 42, right: 28, top: eventBandHeight + 48, bottom: 64 };
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
    curves.forEach((curve, curveIndex) => {
      const color = seriesColors[curveIndex % seriesColors.length];
      const meta = presentation[curve.seriesId] || { label: curve.label, detail: curve.metric, unit: curve.unit };
      const limits = extent(curve);
      const span = limits.maximum - limits.minimum;
      const y = value => plotBottom - ((value - limits.minimum) / span) * (plotBottom - plot.top);
      (curve.historicalReconstruction || []).forEach(segment => svg.appendChild(svgElement("path", { class: "curve-historical", stroke: color, d: makePath(segment.points, x, y) })));
      svg.appendChild(svgElement("path", { class: "curve-observed", stroke: color, d: makePath(curve.observations, x, y) }));
      (curve.projections || []).forEach(projection => svg.appendChild(svgElement("path", { class: "curve-projection", stroke: color, d: makePath(projection.points, x, y) })));
      curve.observations.forEach(point => {
        const circle = svgElement("circle", { class: "curve-point", fill: color, stroke: color, cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3.2 });
        const tooltip = svgElement("title");
        tooltip.textContent = `${meta.label} · ${point.year}: ${point.display || `${point.value} ${meta.unit}`}`;
        circle.appendChild(tooltip);
        svg.appendChild(circle);
      });
    });
    figure.append(svg, createLegend(curves));
    const caption = document.createElement("figcaption");
    caption.textContent = "Alle Kurven liegen in einer gemeinsamen Zeichenfläche. Ihre vertikale Position zeigt jeweils den Verlauf innerhalb der eigenen Datenspanne und besitzt keine gemeinsame Y-Skala. Originalwerte und Einheiten stehen in den Tooltips und in der Legende. Ober- und unterhalb jeder Kurve bleiben jeweils 20 % Darstellungsraum frei. Historische Ereignisse dienen ausschließlich der zeitlichen Orientierung und belegen keine Ursache-Wirkungs-Beziehung.";
    figure.appendChild(caption);
    return figure;
  }
  async function init() {
    if (!config?.import || !chart || !seriesCount || !importStatus) return;
    try {
      const sourceUrl = new URL(config.import.source, window.location.href);
      if (sourceUrl.origin !== window.location.origin) fail("Externe Importquellen sind nicht erlaubt.");
      const response = await fetch(sourceUrl, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) fail(`Lokales Übergabepaket nicht verfügbar (${response.status}).`);
      const payload = await response.json();
      const hash = await verifyExport(payload);
      chart.replaceChildren(renderChart(payload.curves));
      seriesCount.textContent = `${payload.curves.length} Kurven · 1 Diagramm`;
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
  init();
})();
