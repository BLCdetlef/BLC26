import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto, createHash } from "node:crypto";
import vm from "node:vm";
import referenceApi from "../reference.js";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const payload = JSON.parse(readFileSync(new URL("../data/knowledge/germany_living_space_per_capita.json", import.meta.url), "utf8"));
const curve = payload.curves[0];
const helperStart = source.indexOf("  function fail(");
const helperEnd = source.indexOf("  function createReferencePanel(");
const context = vm.createContext({ window: { crypto: webcrypto }, TextEncoder, config: { import: { format: payload.format, version: payload.version } }, referenceApi,
  allowedCurveRoles: new Set(["core","deep_dive"]), allowedProjectionGrades: new Set(["robust_scenario_projection","qualified_scenario_projection"]), allowedThresholdStatuses: new Set(["not_assessable"]),
  Intl, svgNamespace: "http://www.w3.org/2000/svg", document: { createElementNS: (_,tag) => ({tag,attributes:{},children:[],setAttribute(key,value){this.attributes[key]=value;},appendChild(child){this.children.push(child);return child;}}) }
});
vm.runInContext(source.slice(helperStart,helperEnd)+"\nthis.verify = verifyExport; this.path = makePath; this.element = svgElement; this.text = appendText;",context);
await context.verify(payload);
const corrupted = structuredClone(payload);
corrupted.curves[0].observations[0].value = 999;
await assert.rejects(context.verify(corrupted),/Integritätsprüfung/);
const reseal = payload => {
  const { integrity, ...signed } = payload;
  payload.integrity={algorithm:"SHA-256",hash:createHash("sha256").update(JSON.stringify(signed)).digest("hex")};
  return payload;
};
const missing = structuredClone(payload);
missing.curves[0].observationSegments.pop();
await assert.rejects(context.verify(reseal(missing)),/unvollständig/);
const duplicate = structuredClone(payload);
duplicate.curves[0].observationSegments[1].points.push(duplicate.curves[0].observations[0]);
await assert.rejects(context.verify(reseal(duplicate)),/nicht eindeutig/);
assert.equal(curve.observations.length,45);
assert.equal(curve.observationSegments.length,6);
assert.equal(curve.observations.find(point=>point.year===1990).value,34.8);
assert.equal(curve.observations.find(point=>point.year===2016).value,46.3);
assert.equal(curve.observations.at(-1).value,49.5);
assert.equal(curve.projections.length,0);
assert.ok(curve.displayObservations.some(point=>point.year===2010));
for (const segment of curve.observationSegments) {
  assert.ok(curve.displayObservations.some(point=>point.year===segment.points[0].year));
  assert.ok(curve.displayObservations.some(point=>point.year===segment.points.at(-1).year));
}

// Execute the application's actual observed-segment renderer, including break markers.
const start = source.indexOf("      if (visibleSegments.observed) {\n        const segments =");
const end = source.indexOf("      if (visibleSegments.projection)",start);
assert.ok(start>0 && end>start);
const group=context.element("g");
Object.assign(context,{curve,visibleSegments:{observed:true},curveGroup:group,color:"black",meta:{label:curve.label},x:value=>value,y:value=>value,bindSegmentInteraction(){},bindTouchTarget(){}});
vm.runInContext(source.slice(start,end),context);
const paths=group.children.filter(child=>child.tag==="path");
assert.equal(paths.length,6);
for(let index=0;index<paths.length;index++) {
  const points=curve.observationSegments[index].points;
  assert.equal(paths[index].attributes.d,context.path(points,value=>value,value=>value));
}
assert.equal(group.children.filter(child=>child.attributes.class==="curve-method-break").length,5);
const oldCurve={...curve,observationSegments:undefined,methodBreaks:undefined};
context.curve=oldCurve;
context.curveGroup=context.element("g");
vm.runInContext(source.slice(start,end),context);
assert.equal(context.curveGroup.children.length,1,"Existing curves keep their continuous observed path.");

const resolveStart=source.indexOf("  function resolveSegment(");
const resolveEnd=source.indexOf("  function appendSegmentProvenance(",resolveStart);
Object.assign(context,{presentation:{},selectedSegment:null});
vm.runInContext(source.slice(resolveStart,resolveEnd)+"\nthis.resolve = resolveSegment;",context);
for(const segment of curve.observationSegments) {
  const resolved=context.resolve(curve,{curveId:curve.curveId,type:"observed",id:segment.id});
  assert.equal(resolved.label,segment.label);
  assert.equal(resolved.provenance.sourceUrl,segment.provenance.sourceUrl);
  assert.equal(resolved.points.length,segment.points.length);
}
const gwl=JSON.parse(readFileSync(new URL("../data/gwl/blc-curve-export-v1.json",import.meta.url),"utf8"));
assert.equal(gwl.integrity.hash,"6d67027390253ae0adb1abf63f694549afd8d9e508c411cfc5eb0aad54c6ac44","GWL export remains unchanged.");
console.log("PASS: Wohnflächenwerte, SHA-256, vollständige Segmente, unterbrochene Linien, Methodenmarker und segmentbezogene Provenienz.");
