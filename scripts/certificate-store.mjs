import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const maximumPdfBytes = 2 * 1024 * 1024;

export async function storeCertificate(request, response, seriesId, { root, exportFile, publish }) {
  const reply = (status, payload) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(payload));
  };
  const host = String(request.headers.host || "");
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host) || request.headers.origin !== `http://${host}`) return reply(403, { error: "Veröffentlichen ist nur aus der lokalen BLC26-Ansicht erlaubt." });
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(seriesId)) return reply(400, { error: "Ungültige Kurvenkennung." });
  if (String(request.headers["content-type"] || "").toLowerCase().split(";")[0].trim() !== "application/pdf") return reply(415, { error: "Es sind nur PDF-Dateien erlaubt." });
  let originalName;
  try { originalName = decodeURIComponent(String(request.headers["x-original-filename"] || "")); } catch { return reply(400, { error: "Ungültiger Dateiname." }); }
  if (!originalName.toLowerCase().endsWith(".pdf")) return reply(415, { error: "Es sind nur Dateien mit der Endung .pdf erlaubt." });
  if (Number(request.headers["content-length"]) > maximumPdfBytes) return reply(413, { error: "Die PDF ist größer als 2 MB." });
  try {
    const curveExport = JSON.parse(await readFile(exportFile, "utf8"));
    if (!curveExport.curves?.some(curve => curve.seriesId === seriesId)) return reply(404, { error: "Die Kurve ist im freigegebenen BLC-Export nicht vorhanden." });
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > maximumPdfBytes) return reply(413, { error: "Die PDF ist größer als 2 MB." });
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    if (body.length < 5 || body.subarray(0, 5).toString("ascii") !== "%PDF-") return reply(400, { error: "Die Datei besitzt keinen gültigen PDF-Dateikopf." });
    const certificate = {
      file: `certificates/${seriesId}.pdf`,
      label: originalName.replace(/\.pdf$/i, "").trim().slice(0, 100) || "Prüfbericht oder Zertifikat",
      kind: "certificate", publishedAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date())
    };
    const publication = await publish(seriesId, async () => {
      const manifestFile = resolve(root, "data/certificates.json");
      // Read inside the shared publication lock; never discard an existing manifest.
      const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
      if (manifest.schemaVersion !== 1 || !manifest.certificates || typeof manifest.certificates !== "object" || Array.isArray(manifest.certificates)) throw new Error("Ungültiges Zertifikatmanifest.");
      manifest.certificates[seriesId] = certificate;
      await mkdir(resolve(root, "certificates"), { recursive: true });
      const target = resolve(root, certificate.file);
      const token = randomUUID();
      const pdfTemporary = `${target}.${token}.tmp`;
      const manifestTemporary = `${manifestFile}.${token}.tmp`;
      try {
        await writeFile(pdfTemporary, body);
        await writeFile(manifestTemporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
        await rename(pdfTemporary, target);
        await rename(manifestTemporary, manifestFile);
      } finally {
        await rm(pdfTemporary, { force: true });
        await rm(manifestTemporary, { force: true });
      }
    });
    reply(200, { certificate, publication });
  } catch (error) {
    reply(500, { error: error.message || "Die PDF konnte nicht veröffentlicht werden." });
  }
}
