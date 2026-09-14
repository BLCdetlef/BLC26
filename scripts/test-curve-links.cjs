"use strict";

const assert = require("node:assert/strict");
const { requestedCurveId, findCurve, gwlContributionUrl, selectedGwlContributionUrl } = require("../curve-link.js");

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

console.log("Kurvenlinks gültig: Direktlinks, sichere GWL-Ziele, fehlende IDs und Auswahlwechsel geprüft.");
