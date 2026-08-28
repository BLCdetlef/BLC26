import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const importPath = path.join(projectRoot, "data", "gwl", "blc-curve-export-v1.json");
const payload = JSON.parse(await fs.readFile(importPath, "utf8"));
const fail = message => { throw new Error(message); };

if (payload.format !== "gwl-blc-curve-export-v1" || payload.version !== "1.0" || !Array.isArray(payload.curves)) fail("Unbekanntes GWL-Exportformat.");
if (payload.integrity?.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(payload.integrity?.hash || "")) fail("Integritätsblock fehlt.");
const signedPayload = { format: payload.format, version: payload.version, manifestVersion: payload.manifestVersion, curves: payload.curves };
const hash = crypto.createHash("sha256").update(JSON.stringify(signedPayload), "utf8").digest("hex");
if (hash !== payload.integrity.hash) fail("SHA-256-Prüfung fehlgeschlagen.");

const seen = new Set();
for (const curve of payload.curves) {
  if (!curve?.curveId || seen.has(curve.curveId)) fail("Fehlende oder doppelte Kurven-ID.");
  seen.add(curve.curveId);
  if (!curve.source?.startsWith("data/knowledge/") || curve.source.includes("..")) fail(`${curve.curveId}: unzulässiger Quellverweis.`);
  if (!Array.isArray(curve.observations) || curve.observations.length < 2) fail(`${curve.curveId}: Beobachtungsreihe fehlt.`);
  for (const projection of curve.projections || []) {
    if (!["robust_scenario_projection", "qualified_scenario_projection"].includes(projection.grade)) fail(`${curve.curveId}: nicht qualifizierte Projektion.`);
  }
}

console.log(`GWL-Import gültig: ${payload.curves.length} Kurve(n), SHA-256 ${hash}`);
