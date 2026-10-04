(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BRUCHLAST_SELECTION = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const segmentNames = ["observed", "historical", "projection"];

  function validateView(view, curves, allowMissing = false) {
    if (view?.version !== 1 || !Array.isArray(view.curveIds) ||
        view.curveIds.some(id => typeof id !== "string" || !id) ||
        !view.segments || segmentNames.some(key => typeof view.segments[key] !== "boolean")) {
      throw new Error("Die Kurvenauswahl hat ein ungültiges Format.");
    }
    const known = new Set(curves.map(curve => curve.curveId));
    const missing = view.curveIds.filter(id => !known.has(id));
    if (missing.length && !allowMissing) throw new Error("Die Auswahl enthält nicht verfügbare Kurven.");
    return {
      version: 1,
      curveIds: [...new Set(view.curveIds.filter(id => known.has(id)))],
      segments: Object.fromEntries(segmentNames.map(key => [key, view.segments[key]])),
      missing
    };
  }

  function visibleCurves(curves, ids) {
    return curves.filter(curve => ids.has(curve.curveId));
  }

  function selectionUrl(href, view) {
    const url = new URL(href);
    url.search = "";
    url.hash = "";
    (view.curveIds.length ? view.curveIds : [""]).forEach(id => url.searchParams.append("curves", id));
    url.searchParams.set("segments", segmentNames.filter(key => view.segments[key]).join(","));
    return url.href;
  }

  function requestedView(href, curves) {
    const params = new URL(href).searchParams;
    if (!params.has("curves")) return null;
    const segments = params.has("segments") ? params.get("segments").split(",").filter(Boolean) : segmentNames;
    if (segments.some(key => !segmentNames.includes(key))) throw new Error("Der Link enthält eine unbekannte Darstellung.");
    return validateView({ version: 1, curveIds: params.getAll("curves").filter(Boolean),
      segments: Object.fromEntries(segmentNames.map(key => [key, segments.includes(key)])) }, curves);
  }

  function requestedNamedView(href, views, curves) {
    const name = new URL(href).searchParams.get("view");
    if (name === null) return null;
    if (!/^[a-z0-9-]+$/.test(name) || !Object.prototype.hasOwnProperty.call(views || {}, name)) {
      throw new Error("Der Link enthält eine unbekannte Ansicht.");
    }
    return { name, view: validateView(views[name], curves) };
  }

  return { validateView, visibleCurves, selectionUrl, requestedView, requestedNamedView };
});
