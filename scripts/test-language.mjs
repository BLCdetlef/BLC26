import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import reference from "../reference.js";
import selection from "../curve-selection.js";

const files = await Promise.all(["locales/en.js", "locales/en-data.js", "i18n.js"].map(file => readFile(new URL("../" + file, import.meta.url), "utf8")));
const payload = JSON.parse(await readFile(new URL("../data/gwl/blc-curve-export-v1.json", import.meta.url), "utf8"));
const original = JSON.stringify(payload);
function load(href, saved = null, blockedStorage = false) {
  const window = { location: { href }, localStorage: { getItem() { if (blockedStorage) throw new Error("blocked"); return saved; } } };
  const context = vm.createContext({ window, URL, Intl });
  files.forEach(code => vm.runInContext(code, context));
  return window.BRUCHLAST_I18N;
}
const de = load("https://example.test/");
const en = load("https://example.test/?lang=en", "de");
assert.equal(de.language, "de");
assert.equal(en.locale, "en-GB");
assert.equal(load("https://example.test/", "en").language, "en");
assert.equal(load("https://example.test/?lang=de", "en").language, "de");
assert.equal(load("https://example.test/?lang=unsupported", null, true).language, "de");
assert.equal(load("https://example.test/?lang=en", null, true).language, "en");
assert.equal(en.t("{0} von {1} Kurven", 5, 28), "5 of 28 curves");
assert.equal(de.t("{0} von {1} Kurven", 5, 28), "5 von 28 Kurven");
assert.equal(en.t("constructor"), "constructor");
assert.equal(en.t("toString"), "toString");

function verifyNumbers(before, after) {
  if (typeof before === "number") assert.equal(after, before);
  else if (before && typeof before === "object") for (const [key, value] of Object.entries(before)) verifyNumbers(value, after[key]);
}
for (const curve of payload.curves) {
  assert.equal(de.localizeCurve(curve), curve);
  const english = en.localizeCurve(curve);
  verifyNumbers(curve, english);
  for (const key of ["curveId", "seriesId", "boundaryId", "itemId", "domainId", "source", "dataNature"]) assert.equal(english[key], curve[key]);
  assert.equal(JSON.stringify(english.sources), JSON.stringify(curve.sources));
  assert.equal(english.reference?.modelName, curve.reference?.modelName);
  assert.notEqual(english.label, curve.label, "Every curve needs an English display name.");
  reference.validateReference(english);
  const germanStatus = reference.referenceStatus(curve);
  const englishStatus = reference.referenceStatus(english);
  assert.equal(englishStatus.state, germanStatus.state);
  assert.equal(englishStatus.observation?.value, germanStatus.observation?.value);
  for (const segment of [english, ...english.historicalReconstruction, ...english.projections]) {
    const provenance = segment.observationProvenance || segment.provenance;
    const rawSegment = segment === english ? curve : [...curve.historicalReconstruction, ...curve.projections].find(item => item.id === segment.id);
    const rawProvenance = rawSegment.observationProvenance || rawSegment.provenance;
    assert.equal(provenance?.sourceRow, rawProvenance?.sourceRow);
    assert.equal(provenance?.sourceHeader, rawProvenance?.sourceHeader);
    assert.equal(provenance?.sourceUrl, rawProvenance?.sourceUrl);
  }
}
assert.equal(JSON.stringify(payload), original, "Translation must not mutate the signed import.");
const forest = en.localizeCurve(payload.curves.find(curve => curve.seriesId === "global_forest_cover_1992_2022"));
assert.equal(forest.displayObservations[0].display, "≈ 60.2 %");
const view = {version: 1, curveIds: [payload.curves[0].curveId], segments: {observed: true, historical: false, projection: true}};
const url = selection.selectionUrl("https://example.test/?lang=en&curve=old", view);
assert.equal(new URL(url).searchParams.get("lang"), "en");
assert.deepEqual(selection.requestedView(url, payload.curves).curveIds, view.curveIds);
console.log("Language selection, numerical invariants, reference assessment and source quotations verified for all 28 curves.");
