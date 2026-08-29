(function () {
  "use strict";
  const config = window.BRUCHLAST_DATA;
  const chart = document.getElementById("chart");
  const seriesCount = document.getElementById("seriesCount");
  const importStatus = document.getElementById("importStatus");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const allowedProjectionGrades = new Set(["robust_scenario_projection", "qualified_scenario_projection"]);
  const seriesColors = ["#171717", "#b4472d", "#24708a", "#66843c", "#745084", "#9b762d"];

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
    curves.forEach((curve, index) => {
      const item = document.createElement("div");
      item.className = "legend-series";
      item.style.setProperty("--series-color", seriesColors[index % seriesColors.length]);
      const label = document.createElement("strong");
      label.textContent = curve.label;
      const meta = document.createElement("span");
      meta.textContent = [curve.boundaryId, curve.unit].filter(Boolean).join(" · ");
      item.append(label, meta);
      legend.appendChild(item);
    });
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
  function renderChart(curves) {
    const figure = document.createElement("figure");
    figure.className = "combined-chart";
    const width = 1400;
    const height = 620;
    const plot = { left: 76, right: 28, top: 26, bottom: 58 };
    const x = year => plot.left + ((year - config.range.start) / (config.range.end - config.range.start)) * (width - plot.left - plot.right);
    const y = normalized => height - plot.bottom - (normalized / 100) * (height - plot.top - plot.bottom);
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${curves.length} freigegebene Langzeitkurven auf einer gemeinsamen Zeitachse von 1700 bis 2100` });
    svg.classList.add("series-chart", "combined-series-chart");
    svg.appendChild(svgElement("line", { class: "chart-axis", x1: plot.left, y1: height - plot.bottom, x2: width - plot.right, y2: height - plot.bottom }));
    for (let year = config.range.start; year <= config.range.end; year += 50) {
      svg.appendChild(svgElement("line", { class: "chart-grid", x1: x(year), y1: plot.top, x2: x(year), y2: height - plot.bottom }));
      appendText(svg, "text", year, { class: "axis-label", x: x(year), y: height - 22 });
    }
    [0, 25, 50, 75, 100].forEach(value => {
      svg.appendChild(svgElement("line", { class: "chart-grid chart-grid-horizontal", x1: plot.left, y1: y(value), x2: width - plot.right, y2: y(value) }));
      appendText(svg, "text", `${value}%`, { class: "axis-label axis-label-y", x: plot.left - 14, y: y(value) + 5 });
    });
    appendText(svg, "text", "relative Verlaufsspanne", { class: "axis-title", transform: `translate(18 ${height / 2}) rotate(-90)` });
    curves.forEach((curve, curveIndex) => {
      const color = seriesColors[curveIndex % seriesColors.length];
      const allPoints = [...curve.observations, ...(curve.historicalReconstruction || []).flatMap(segment => segment.points), ...(curve.projections || []).flatMap(series => series.points)];
      const values = allPoints.map(point => Number(point.value));
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const span = maximum - minimum || 1;
      const normalized = points => points.map(point => ({ ...point, value: ((Number(point.value) - minimum) / span) * 100 }));
      (curve.historicalReconstruction || []).forEach(segment => svg.appendChild(svgElement("path", { class: "curve-historical", stroke: color, d: makePath(normalized(segment.points), x, y) })));
      svg.appendChild(svgElement("path", { class: "curve-observed", stroke: color, d: makePath(normalized(curve.observations), x, y) }));
      (curve.projections || []).forEach(projection => svg.appendChild(svgElement("path", { class: "curve-projection", stroke: color, d: makePath(normalized(projection.points), x, y) })));
      curve.observations.forEach(point => {
        const normalizedValue = ((Number(point.value) - minimum) / span) * 100;
        const circle = svgElement("circle", { class: "curve-point", fill: color, stroke: color, cx: x(Number(point.year)), cy: y(normalizedValue), r: 3.2 });
        const tooltip = svgElement("title");
        tooltip.textContent = `${curve.label} · ${point.year}: ${point.display || `${point.value} ${curve.unit}`}`;
        circle.appendChild(tooltip);
        svg.appendChild(circle);
      });
    });
    figure.append(svg, createLegend(curves));
    const caption = document.createElement("figcaption");
    caption.textContent = "Jede Kurve ist auf ihre eigene Wertespanne (Minimum = 0 %, Maximum = 100 %) normiert. Originalwerte und Einheiten erscheinen an den Datenpunkten.";
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
