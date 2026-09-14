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

  function gwlContributionUrl(curve) {
    if (!curve?.boundaryId || !curve?.itemId) return null;
    const url = new URL("https://blcdetlef.github.io/gwl-panel/");
    url.search = new URLSearchParams({ boundary: curve.boundaryId, item: curve.itemId }).toString();
    return url.href;
  }

  function selectedGwlContributionUrl(curves, curveId) {
    return gwlContributionUrl(findCurve(curves, curveId));
  }

  return { requestedCurveId, findCurve, gwlContributionUrl, selectedGwlContributionUrl };
});
