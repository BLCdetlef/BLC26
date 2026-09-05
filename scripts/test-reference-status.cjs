const assert = require("node:assert/strict");
const { latestObservation, referenceStatus, validateReference } = require("../reference.js");

const base = {
  curveId: "test",
  unit: "%",
  sources: [{ id: "source", title: "Quelle" }],
  observations: [{ year: 2000, value: 5 }, { year: 2020, value: 11 }],
  historicalReconstruction: [{ points: [{ year: 1900, value: 999 }] }],
  projections: [{ points: [{ year: 2100, value: 999 }] }],
  reference: { role: "boundary", qualifier: "approximate", exceedanceOperator: ">", value: 10, unit: "%", sourceRefs: ["source"] }
};

assert.equal(referenceStatus(base).state, "exceeded");
assert.equal(referenceStatus({ ...base, observations: [{ year: 2020, value: 10 }] }).state, "reached");
assert.equal(referenceStatus({ ...base, observations: [{ year: 2020, value: 9 }] }).state, "not-exceeded");
assert.equal(referenceStatus({ ...base, reference: undefined }).state, "missing");
assert.equal(referenceStatus({ ...base, reference: { type: "planetary_boundaries_model", modelName: "Planetare Grenzen", value: 350, unit: "%", sourceRefs: ["source"] } }).state, "reference-only");
assert.equal(referenceStatus({ ...base, reference: { ...base.reference, exceedanceOperator: "<" }, observations: [{ year: 2020, value: 9 }] }).state, "exceeded");
assert.equal(latestObservation([{ year: 2020, value: 3 }, { year: 2010, value: 8 }]).value, 3);
assert.throws(() => validateReference({ ...base, reference: { ...base.reference, role: "other" } }));
assert.doesNotThrow(() => validateReference({ ...base, reference: { ...base.reference, qualifier: "exact" } }));
assert.throws(() => validateReference({ ...base, reference: { ...base.reference, qualifier: undefined } }));
assert.throws(() => validateReference({ ...base, reference: { ...base.reference, value: "x" } }));
assert.throws(() => validateReference({ ...base, reference: { ...base.reference, unit: "ppm" } }));
assert.throws(() => validateReference({ ...base, reference: { ...base.reference, sourceRefs: ["missing"] } }));
console.log("Referenzstatus geprüft: unterhalb, erreicht, überschritten, fehlend und ungültige Metadaten.");
