import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import selection from "../curve-selection.js";
import { storeStartView } from "./start-view-store.mjs";

const curves = [
  { curveId: "same-domain-core", domainId: "a", curveRole: "core" },
  { curveId: "same-domain-other", domainId: "a", curveRole: "core" },
  { curveId: "knowledge:another.json#deep/series?x=1&y=2", domainId: "b", curveRole: "deep_dive" }
];
const view = { version: 1, curveIds: [curves[0].curveId, curves[2].curveId], segments: { observed: true, historical: false, projection: true } };
assert.deepEqual(selection.visibleCurves(curves, new Set(view.curveIds)), [curves[0], curves[2]]);
assert.deepEqual(selection.visibleCurves(curves, new Set()), []);
assert.deepEqual(selection.validateView({ ...view, curveIds: [...view.curveIds, view.curveIds[0]] }, curves).curveIds, view.curveIds);
assert.throws(() => selection.validateView({ ...view, curveIds: ["removed"] }, curves));
assert.deepEqual(selection.validateView({ ...view, curveIds: [view.curveIds[0], "removed"] }, curves, true).missing, ["removed"]);
assert.throws(() => selection.validateView({ ...view, segments: { observed: "true" } }, curves));
assert.throws(() => selection.validateView({ ...view, version: 2 }, curves));

const link = selection.selectionUrl("https://example.test/BLC26/?curve=old#fragment", view);
assert.equal(new URL(link).searchParams.has("curve"), false);
assert.equal(new URL(link).hash, "");
assert.deepEqual(selection.requestedView(link, curves), { ...view, missing: [] });
assert.equal(selection.requestedView("https://example.test/", curves), null);
assert.throws(() => selection.requestedView("https://example.test/?curves=removed", curves));
assert.throws(() => selection.requestedView("https://example.test/?curves=same-domain-core&segments=unknown", curves));
const namedViews = { zustand: view };
assert.deepEqual(selection.requestedNamedView("https://example.test/?view=zustand", namedViews, curves), { name: "zustand", view: { ...view, missing: [] } });
assert.equal(selection.requestedNamedView("https://example.test/", namedViews, curves), null);
assert.throws(() => selection.requestedNamedView("https://example.test/?view=unknown", namedViews, curves));
assert.throws(() => selection.requestedNamedView("https://example.test/?view=../zustand", namedViews, curves));
const empty = { ...view, curveIds: [], segments: { observed: false, historical: false, projection: false } };
assert.deepEqual(selection.requestedView(selection.selectionUrl("https://example.test/", empty), curves), { ...empty, missing: [] });

const realExport = JSON.parse(await readFile(new URL("../data/gwl/blc-curve-export-v1.json", import.meta.url), "utf8"));
const realDefault = JSON.parse(await readFile(new URL("../data/start-view.json", import.meta.url), "utf8"));
selection.validateView(realDefault, realExport.curves);
assert.ok(realDefault.curveIds.length && Object.values(realDefault.segments).some(Boolean), "Öffentliche Startansicht darf nicht leer sein.");

// Exercise HTTP, origin checks and persistence in an isolated directory.
const directory = await mkdtemp(join(tmpdir(), "blc-selection-"));
const exportFile = join(directory, "export.json");
const targetFile = join(directory, "start-view.json");
await writeFile(exportFile, JSON.stringify({ curves }));
await writeFile(targetFile, JSON.stringify(view));
const server = createServer((request, response) => storeStartView(request, response, { exportFile, targetFile }));
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const put = (body, headers = {}) => fetch(`${origin}/api/start-view`, {
  method: "PUT", headers: { "Content-Type": "application/json", Origin: origin, ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body)
});
try {
  const response = await put(view);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).view, view);
  assert.deepEqual(JSON.parse(await readFile(targetFile, "utf8")), view);
  const saved = await readFile(targetFile, "utf8");
  for (const [body, headers, status] of [
    [view, { Origin: "https://foreign.example" }, 403],
    [view, { Origin: "" }, 403],
    [view, { Host: "foreign.example", Origin: "http://foreign.example" }, 403],
    [view, { "Content-Type": "text/plain" }, 415],
    ["{broken", {}, 400],
    [{ ...view, curveIds: ["removed"] }, {}, 400],
    [{ ...view, curveIds: [] }, {}, 400],
    [{ ...view, segments: empty.segments }, {}, 400],
    ["x".repeat(65537), {}, 413]
  ]) {
    const rejected = await put(body, headers);
    assert.equal(rejected.status, status);
    await rejected.text();
    assert.equal(await readFile(targetFile, "utf8"), saved, "Abgelehnte Eingaben dürfen die Startansicht nicht verändern.");
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await unlink(exportFile);
  await unlink(targetFile);
  await rmdir(directory);
}
console.log("Kurvenauswahl gültig: freie Kombination, Links, Startkonfiguration und lokales Speichern einschließlich Fehlerfällen geprüft.");
