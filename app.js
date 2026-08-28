(function () {
  "use strict";

  const config = window.BRUCHLAST_DATA;
  const chart = document.getElementById("chart");
  const seriesCount = document.getElementById("seriesCount");
  const importStatus = document.getElementById("importStatus");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const allowedProjectionGrades = new Set(["robust_scenario_projection", "qualified_scenario_projection"]);

  function fail(message) {
    throw new Error(message);
  }

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
    return Array.isArray(points) && points.every(point =>
      Number.isFinite(Number(point?.year)) && Number.isFinite(Number(point?.value))
    );
  }

  async function sha256(value) {
    if (!window.crypto?.subtle) fail("SHA-256-Prüfung ist in diesem Browserkontext nicht verfügbar.");
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function verifyExport(payload) {
    const allowedTopFields = new Set(["format", "version", "manifestVersion", "curves", "integrity"]);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("Übergabepaket ist kein gültiges Objekt.");
    for (const field of Object.keys(payload)) if (!allowedTopFields.has(field)) fail(`Unbekanntes Exportfeld: ${field}`);
    if (payload.format !== config.import.format || payload.version !== config.import.version) fail("Unbekanntes Exportformat.");
    if (!Array.isArray(payload.curves)) fail("Kurvenliste fehlt.");
    if (payload.integrity?.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(payload.integrity?.hash || "")) fail("Integritätsangabe fehlt.");

    const signedPayload = {
      format: payload.format,
      version: payload.version,
      manifestVersion: payload.manifestVersion,
      curves: payload.curves
    };
    const actualHash = await sha256(JSON.stringify(signedPayload));
    if (actualHash !== payload.integrity.hash) fail("Integritätsprüfung fehlgeschlagen. Das Paket wurde verändert oder beschädigt.");

    const seen = new Set();
    for (const curve of payload.curves) {
      if (!curve?.curveId || seen.has(curve.curveId)) fail("Kurven-ID fehlt oder ist doppelt.");
      seen.add(curve.curveId);
      if (!curve.source?.startsWith("data/knowledge/") || curve.source.includes("..")) fail(`${curve.curveId}: unzulässiger Quellverweis.`);
      if (!validPoints(curve.observations) || curve.observations.length < 2) fail(`${curve.curveId}: gültige Beobachtungsreihe fehlt.`);
      for (const segment of curve.historicalReconstruction || []) {
        if (!validPoints(segment.points) || !segment.points.length) fail(`${curve.curveId}: ungültige Rekonstruktion.`);
      }
      for (const projection of curve.projections || []) {
        if (!allowedProjectionGrades.has(projection.grade) || !validPoints(projection.points) || !projection.points.length) {
          fail(`${curve.curveId}: nicht qualifizierte oder ungültige Projektion.`);
        }
      }
    }
    return actualHash;
  }

  function makePath(points, x, y) {
    return points.map((point, index) => `${index ? "L" : "M"}${x(Number(point.year)).toFixed(2)} ${y(Number(point.value)).toFixed(2)}`).join(" ");
  }

  function createLegend(hasHistorical, hasProjections) {
    const legend = document.createElement("div");
    legend.className = "series-legend";
    const entries = [["observed", "Beobachtung"]];
    if (hasHistorical) entries.push(["historical", "Historische Rekonstruktion"]);
    if (hasProjections) entries.push(["projection", "Szenario"]);
    entries.forEach(([type, label]) => {
      const item = document.createElement("span");
      item.className = `legend-${type}`;
      item.textContent = label;
      legend.appendChild(item);
    });
    return legend;
  }

  function renderCurve(curve) {
    const card = document.createElement("article");
    card.className = "series-card";
    card.dataset.curveId = curve.curveId;

    const heading = document.createElement("header");
    heading.className = "series-heading";
    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "series-eyebrow";
    eyebrow.textContent = `${curve.boundaryId} · ${curve.geography}`;
    const title = document.createElement("h3");
    title.textContent = curve.label;
    const metric = document.createElement("p");
    metric.className = "series-metric";
    metric.textContent = [curve.metric, curve.unit].filter(Boolean).join(" · ");
    titleWrap.append(eyebrow, title, metric);
    const count = document.createElement("span");
    count.className = "point-count";
    count.textContent = `${curve.observations.length} Beobachtungspunkte`;
    heading.append(titleWrap, count);
    card.appendChild(heading);

    const width = 1000;
    const height = 230;
    const plot = { left: 52, right: 18, top: 18, bottom: 38 };
    const allPoints = [
      ...curve.observations,
      ...(curve.historicalReconstruction || []).flatMap(segment => segment.points),
      ...(curve.projections || []).flatMap(series => series.points)
    ];
    const values = allPoints.map(point => Number(point.value));
    let minimum = Math.min(...values);
    let maximum = Math.max(...values);
    const padding = Math.max((maximum - minimum) * 0.08, Math.abs(maximum) * 0.01, 0.01);
    minimum -= padding;
    maximum += padding;
    const x = year => plot.left + ((year - config.range.start) / (config.range.end - config.range.start)) * (width - plot.left - plot.right);
    const y = value => height - plot.bottom - ((value - minimum) / (maximum - minimum)) * (height - plot.top - plot.bottom);

    const svg = svgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": `${curve.label}, Zeitreihe 1700 bis 2100`
    });
    svg.classList.add("series-chart");
    svg.appendChild(svgElement("line", { class: "chart-axis", x1: plot.left, y1: height - plot.bottom, x2: width - plot.right, y2: height - plot.bottom }));
    [1700, 1800, 1900, 2000, 2100].forEach(year => {
      svg.appendChild(svgElement("line", { class: "chart-grid", x1: x(year), y1: plot.top, x2: x(year), y2: height - plot.bottom }));
      appendText(svg, "text", year, { class: "axis-label", x: x(year), y: height - 12 });
    });
    (curve.historicalReconstruction || []).forEach(segment => {
      svg.appendChild(svgElement("path", { class: "curve-historical", d: makePath(segment.points, x, y) }));
    });
    svg.appendChild(svgElement("path", { class: "curve-observed", d: makePath(curve.observations, x, y) }));
    (curve.projections || []).forEach((projection, index) => {
      svg.appendChild(svgElement("path", { class: `curve-projection projection-${index % 5}`, d: makePath(projection.points, x, y) }));
    });
    curve.observations.forEach(point => {
      const circle = svgElement("circle", { class: "curve-point", cx: x(Number(point.year)), cy: y(Number(point.value)), r: 3 });
      const tooltip = svgElement("title");
      tooltip.textContent = `${point.year}: ${point.display || `${point.value} ${curve.unit}`}`;
      circle.appendChild(tooltip);
      svg.appendChild(circle);
    });
    card.appendChild(svg);
    card.appendChild(createLegend(Boolean(curve.historicalReconstruction?.length), Boolean(curve.projections?.length)));
    return card;
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
      chart.replaceChildren(...payload.curves.map(renderCurve));
      seriesCount.textContent = `${payload.curves.length} Messreihen`;
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
