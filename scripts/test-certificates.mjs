import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maximumPdfBytes } from "./certificate-store.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile(resolve(root, "data", "certificates.json"), "utf8"));
const curveExport = JSON.parse(await readFile(resolve(root, "data", "gwl", "blc-curve-export-v1.json"), "utf8"));
if (manifest.schemaVersion !== 1 || !manifest.certificates || typeof manifest.certificates !== "object") throw new Error("Ungültiges Zertifikatmanifest.");
const seriesIds = new Set(curveExport.curves.map(curve => curve.seriesId));
for (const [seriesId, entry] of Object.entries(manifest.certificates)) {
  if (!seriesIds.has(seriesId)) throw new Error(`Unbekannte Kurve im Zertifikatmanifest: ${seriesId}`);
  if (!entry || !["example", "certificate"].includes(entry.kind)) throw new Error(`Ungültige Dokumentart für ${seriesId}`);
  if (!entry.label || !entry.publishedAt || !entry.file?.endsWith(".pdf")) throw new Error(`Unvollständiger Eintrag für ${seriesId}`);
  const file = resolve(root, entry.file);
  if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error(`Unzulässiger PDF-Pfad für ${seriesId}`);
  const bytes = await readFile(file);
  if (bytes.length > maximumPdfBytes) throw new Error(`PDF größer als 2 MB für ${seriesId}`);
  if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error(`Keine gültige PDF für ${seriesId}`);
}
console.log(`Zertifikatmanifest gültig: ${Object.keys(manifest.certificates).length} PDF(s), höchstens eine je Kurve.`);
