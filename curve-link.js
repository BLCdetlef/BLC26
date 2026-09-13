(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BRUCHLAST_CURVE_LINK = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function requestedCurveId(locationHref) {
    const url = new URL(locationHref);
    return url.searchParams.has("curve") ? url.searchParams.get("curve") : null;
  }

  function findCurve(curves, curveId) {
    if (curveId === null) return null;
    return curves.find(curve => curve.curveId === curveId) || undefined;
  }

  return { requestedCurveId, findCurve };
});
