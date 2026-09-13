"use strict";

const assert = require("node:assert/strict");
const { requestedCurveId, findCurve } = require("../curve-link.js");

const curveId = "knowledge:data/knowledge/example.json#stable_series";
const curves = [{ curveId, domainId: "example", curveRole: "core" }];

assert.equal(requestedCurveId("https://example.test/"), null);
assert.equal(requestedCurveId(`https://example.test/?curve=${encodeURIComponent(curveId)}`), curveId);
assert.equal(requestedCurveId("https://example.test/?curve="), "");
assert.equal(requestedCurveId("https://example.test/?curve=first&curve=second"), "first");
assert.equal(findCurve(curves, curveId), curves[0]);
assert.equal(findCurve(curves, "removed-id"), undefined);
assert.equal(findCurve(curves, null), null);

console.log("Kurven-Direktlinks gültig: URL-Dekodierung und exakte curveId-Auflösung geprüft.");
