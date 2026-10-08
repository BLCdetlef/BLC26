import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { storeStartView } from "./start-view-store.mjs";
import { createStartViewPublisher, createCertificatePublisher } from "./publish-start-view.mjs";
import { storeCertificate } from "./certificate-store.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 3000;
const publishStartView = createStartViewPublisher(root);
const publishCertificate = createCertificatePublisher(root);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const curveExportFile = resolve(root, "data", "gwl", "blc-curve-export-v1.json");

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

async function respond(request, response) {
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    if (request.method === "PUT" && ["/api/start-view", "/api/start-view/publish"].includes(pathname)) {
      await storeStartView(request, response, { exportFile: curveExportFile, targetFile: resolve(root, "data", "start-view.json"), publish: pathname.endsWith("/publish") ? publishStartView : undefined });
      return;
    }
    if (request.method === "PUT" && pathname.startsWith("/api/certificates/")) {
      await storeCertificate(request, response, pathname.slice("/api/certificates/".length), { root, exportFile: curveExportFile, publish: publishCertificate });
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
