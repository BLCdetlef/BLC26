import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { storeStartView } from "./start-view-store.mjs";
import { createStartViewPublisher } from "./publish-start-view.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3000;
const publishStartView = createStartViewPublisher(root);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const certificateManifestFile = resolve(root, "data", "certificates.json");
const certificateDirectory = resolve(root, "certificates");
const curveExportFile = resolve(root, "data", "gwl", "blc-curve-export-v1.json");
const maximumPdfBytes = 20 * 1024 * 1024;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumPdfBytes) throw new Error("Die PDF ist größer als 20 MB.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function storeCertificate(request, response, seriesId) {
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(seriesId)) return sendJson(response, 400, { error: "Ungültige Kurvenkennung." });
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/pdf")) return sendJson(response, 415, { error: "Es sind nur PDF-Dateien erlaubt." });
  const curveExport = JSON.parse(await readFile(curveExportFile, "utf8"));
  if (!curveExport.curves?.some(curve => curve.seriesId === seriesId)) return sendJson(response, 404, { error: "Die Kurve ist im freigegebenen BLC-Export nicht vorhanden." });
  const body = await readRequestBody(request);
  if (body.length < 5 || body.subarray(0, 5).toString("ascii") !== "%PDF-") return sendJson(response, 400, { error: "Die Datei besitzt keinen gültigen PDF-Dateikopf." });
  await mkdir(certificateDirectory, { recursive: true });
  const target = resolve(certificateDirectory, `${seriesId}.pdf`);
  await writeFile(target, body);
  let manifest = { schemaVersion: 1, certificates: {} };
  try {
    manifest = JSON.parse(await readFile(certificateManifestFile, "utf8"));
  } catch {}
  if (manifest.schemaVersion !== 1 || !manifest.certificates || typeof manifest.certificates !== "object") manifest = { schemaVersion: 1, certificates: {} };
  const encodedOriginalName = String(request.headers["x-original-filename"] || "");
  let originalName = "Prüfbericht oder Zertifikat";
  try {
    originalName = decodeURIComponent(encodedOriginalName).replace(/\.pdf$/i, "").trim().slice(0, 100) || originalName;
  } catch {}
  const certificate = {
    file: relative(root, target).replaceAll("\\", "/"),
    label: originalName,
    kind: "certificate",
    publishedAt: new Date().toISOString().slice(0, 10)
  };
  manifest.certificates[seriesId] = certificate;
  await writeFile(certificateManifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  sendJson(response, 200, { certificate });
}

async function respond(request, response) {
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    if (request.method === "PUT" && ["/api/start-view", "/api/start-view/publish"].includes(pathname)) {
      await storeStartView(request, response, { exportFile: curveExportFile, targetFile: resolve(root, "data", "start-view.json"), publish: pathname.endsWith("/publish") ? publishStartView : undefined });
      return;
    }
    if (request.method === "PUT" && pathname.startsWith("/api/certificates/")) {
      try {
        await storeCertificate(request, response, pathname.slice("/api/certificates/".length));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Die PDF konnte nicht gespeichert werden.";
        sendJson(response, message.includes("größer als 20 MB") ? 413 : 500, { error: message });
      }
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Methode nicht erlaubt." });
    const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = resolve(root, requested);
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error("Unzulässiger Pfad");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Keine Datei");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Nicht gefunden");
  }
}

let ready = 0;
for (const address of ["127.0.0.1", "::1"]) {
  createServer(respond).listen(port, address, () => {
    ready += 1;
    if (ready === 2) console.log(`BRUCHLASTchart läuft unter http://localhost:${port}`);
  });
}
