"use strict";

const assert = require("node:assert/strict");
const { requestedCurveId, findCurve, visibleCurves, gwlContributionUrl, selectedGwlContributionUrl } = require("../curve-link.js");

const curveId = "knowledge:data/knowledge/example.json#stable_series";
const curves = [{ curveId, domainId: "example", curveRole: "core" }];

assert.equal(requestedCurveId("https://example.test/"), null);
assert.equal(requestedCurveId(`https://example.test/?curve=${encodeURIComponent(curveId)}`), curveId);
assert.equal(requestedCurveId("https://example.test/?curve="), "");
assert.equal(requestedCurveId("https://example.test/?curve=first&curve=second"), "first");
assert.equal(findCurve(curves, curveId), curves[0]);
assert.equal(findCurve(curves, "removed-id"), undefined);
assert.equal(findCurve(curves, null), null);

const firstCurve = { curveId: "first", boundaryId: "fresh water", itemId: "blue/water?flow", label: "Darf nicht in die URL" };
const secondCurve = { curveId: "second", boundaryId: "climate", itemId: "global-warming", notes: "intern" };
const selectableCurves = [firstCurve, secondCurve];
assert.equal(
  gwlContributionUrl(firstCurve),
  "https://blcdetlef.github.io/gwl-panel/?boundary=fresh+water&item=blue%2Fwater%3Fflow"
);
assert.equal(gwlContributionUrl({ boundaryId: "climate" }), null);
assert.equal(gwlContributionUrl({ itemId: "global-warming" }), null);
assert.equal(gwlContributionUrl({ boundaryId: "", itemId: "global-warming" }), null);
assert.equal(gwlContributionUrl(null), null);
assert.equal(selectedGwlContributionUrl(selectableCurves, null), null);
assert.equal(selectedGwlContributionUrl(selectableCurves, "first"), gwlContributionUrl(firstCurve));
assert.equal(selectedGwlContributionUrl(selectableCurves, "second"), gwlContributionUrl(secondCurve));
assert.equal(selectedGwlContributionUrl(selectableCurves, "removed"), null);
assert.equal(selectedGwlContributionUrl([firstCurve], "second"), null);
assert.equal(gwlContributionUrl(secondCurve).includes("intern"), false);
assert.equal(gwlContributionUrl(firstCurve).includes("Darf"), false);

const nitrogenId = "knowledge:data/knowledge/gwl_nutrient_cycles_nitrogen_v0.2.json#nitrogen_fixation_1961_2022";
const phosphorusId = "knowledge:data/knowledge/gwl_nutrient_cycles_phosphorus_v0.2.json#phosphorus_cropland_1961_2022";
const nutrientCurves = [
  { curveId: nitrogenId, domainId: "nutrient_cycles", curveRole: "core", boundaryId: "nutrients", itemId: "nitrogen" },
  { curveId: phosphorusId, domainId: "nutrient_cycles", curveRole: "core", boundaryId: "nutrients", itemId: "phosphorus" },
  { curveId: "another-curve", domainId: "climate_change", curveRole: "core", boundaryId: "climate", itemId: "global-warming" }
];
const allDomains = new Set(["nutrient_cycles", "climate_change"]);
const coreRoles = new Set(["core"]);
const visibleForLink = href => {
  const linked = findCurve(nutrientCurves, requestedCurveId(href));
  return linked
    ? visibleCurves(nutrientCurves, new Set([linked.domainId]), new Set([linked.curveRole]), linked.curveId)
    : [];
};
const nitrogenLink = `https://example.test/?curve=${encodeURIComponent(nitrogenId)}`;
const phosphorusLink = `https://example.test/?curve=${encodeURIComponent(phosphorusId)}`;
assert.deepEqual(visibleForLink(nitrogenLink).map(curve => curve.curveId), [nitrogenId]);
assert.equal(gwlContributionUrl(visibleForLink(nitrogenLink)[0]), "https://blcdetlef.github.io/gwl-panel/?boundary=nutrients&item=nitrogen");
assert.deepEqual(visibleForLink(phosphorusLink).map(curve => curve.curveId), [phosphorusId]);
assert.equal(gwlContributionUrl(visibleForLink(phosphorusLink)[0]), "https://blcdetlef.github.io/gwl-panel/?boundary=nutrients&item=phosphorus");
assert.deepEqual(visibleForLink("https://example.test/?curve=another-curve").map(curve => curve.curveId), ["another-curve"]);
assert.deepEqual(visibleForLink("https://example.test/?curve=unknown"), []);
assert.deepEqual(visibleCurves(nutrientCurves, allDomains, coreRoles).map(curve => curve.curveId), [nitrogenId, phosphorusId, "another-curve"]);
assert.deepEqual(visibleForLink(nitrogenLink).map(curve => curve.curveId), [nitrogenId]);

console.log("Kurvenlinks gültig: Direktlinks, sichere GWL-Ziele, fehlende IDs und Auswahlwechsel geprüft.");
