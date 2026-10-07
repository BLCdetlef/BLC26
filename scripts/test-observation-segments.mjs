import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const imported = JSON.parse(fs.readFileSync(new URL('../data/gwl/blc-curve-export-v1.json', import.meta.url), 'utf8'));
const curve = imported.curves.find(c => c.seriesId === 'germany_living_space_per_capita_1950_2025');
assert.ok(curve);
assert.equal(curve.observations.length,45);
assert.deepEqual(curve.observationSegments.map(s=>s.points.length),[9,4,16,1,11,4]);
assert.deepEqual(curve.observationSegments.flatMap(s=>s.points),curve.observations);
assert.equal(curve.boundaryId,'mental-load');
assert.equal(curve.itemId,'germany-living-space-per-capita');
assert.equal(curve.projections.length,0);
const validation=app.slice(app.indexOf('  function validateObservationSegments('),app.indexOf('  async function verifyExport('));
const validateContext={curve,fail:m=>{throw Error(m)},validPoints:ps=>Array.isArray(ps)&&ps.every(p=>Number.isFinite(p.year)&&Number.isFinite(p.value)),validProvenance:p=>p&&p.locator&&p.sourceUrl};
vm.runInNewContext(validation+';validateObservationSegments(curve);',validateContext);
for(const mutate of [c=>c.observationSegments[0].points.pop(),c=>c.observationSegments[1].sourceRefs=['unknown'],c=>c.methodBreaks=[]]) {
 const bad=structuredClone(curve);mutate(bad);
 assert.throws(()=>vm.runInNewContext(validation+';validateObservationSegments(curve);',{...validateContext,curve:bad}));
}
const resolution=app.slice(app.indexOf('  function observationSegmentForPoint('),app.indexOf('  function appendSegmentProvenance('));
const ctx={curve,selection:null,selectedSegment:null,presentation:{}};
vm.runInNewContext(resolution+';this.resolve=resolveSegment;this.forPoint=observationSegmentForPoint;',ctx);
for(const s of curve.observationSegments){const resolved=ctx.resolve(curve,{curveId:curve.curveId,type:'observed',id:s.id});assert.equal(resolved.id,s.id);assert.deepEqual(resolved.provenance,s.provenance);assert.deepEqual(resolved.points,s.points);assert.equal(ctx.forPoint(curve,s.points[0]).id,s.id);}
const start=app.indexOf('      if (visibleSegments.observed) {',app.indexOf('  function renderChart('));
const end=app.indexOf('      if (visibleSegments.projection)',start);
assert.ok(start>0&&end>start);
function render(c,visible=true){const children=[];const context={curve:c,visibleSegments:{observed:visible},x:v=>v,y:v=>v,color:'black',meta:{label:c.label,unit:c.unit},pointDisplay:p=>String(p.value),makePath:ps=>JSON.stringify(ps),bindSegmentInteraction(){},bindTouchTarget(){},curveGroup:{appendChild:e=>children.push(e)},svgElement:(tag,attrs)=>({tag,attrs,appendChild(){}})};vm.runInNewContext(app.slice(start,end),context);return children;}
const rendered=render(curve);const paths=rendered.filter(p=>p.tag==='path');assert.equal(paths.length,6);assert.equal(rendered.filter(p=>p.tag==='circle').length,1);paths.forEach((p,i)=>assert.deepEqual(JSON.parse(p.attrs.d),curve.observationSegments[i].points));
assert.equal(render(curve,false).length,0);
assert.equal(render(imported.curves.find(c=>!c.observationSegments)).length,1);
assert.ok(!app.includes('curve-method-break-year'));
assert.ok(!app.includes('showMarker'));
console.log('PASS: GWL-Wohnfläche, 45 Originalwerte, sechs getrennte Linien, Abschnittsauswahl mit korrekter Herkunft; ungültige Segmente gesperrt.');
