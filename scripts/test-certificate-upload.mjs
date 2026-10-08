import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { mkdtemp, mkdir, readFile, writeFile, readdir, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { storeCertificate, maximumPdfBytes } from "./certificate-store.mjs";

const root = await mkdtemp(join(tmpdir(), "blc-certificate-"));
await mkdir(join(root, "data"));
await mkdir(join(root, "certificates"));
const exportFile = join(root, "export.json");
const manifestFile = join(root, "data/certificates.json");
await writeFile(exportFile, JSON.stringify({ curves: [{ seriesId: "forest" }] }));
await writeFile(manifestFile, JSON.stringify({ schemaVersion: 1, certificates: {} }));
let publicationCalls = 0, failPublication = false;
const publish = async (seriesId, persist) => {
  publicationCalls++;
  await persist();
  if (failPublication) throw new Error("GitHub nicht erreichbar");
  return { seriesId, commit: "test", deployment: "pending" };
};
const server = createServer((request, response) => storeCertificate(request, response, request.url.slice(1), { root, exportFile, publish }));
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const put = (body, headers = {}, id = "forest", stream = false) => fetch(`${origin}/${id}`, {
  method: "PUT", headers: { Origin: origin, "Content-Type": "application/pdf", "X-Original-Filename": encodeURIComponent("Waldprüfung.pdf"), ...headers },
  body: stream ? Readable.toWeb(Readable.from([body])) : body, ...(stream ? { duplex: "half" } : {})
});
const pdf = Buffer.from("%PDF-1.4\nfixture\n%%EOF\n");
try {
  const uploaded = await put(pdf);
  assert.equal(uploaded.status, 200);
  const result = await uploaded.json();
  assert.equal(result.publication.seriesId, "forest");
  assert.equal(result.certificate.label, "Waldprüfung");
  assert.deepEqual(await readFile(join(root, "certificates/forest.pdf")), pdf);
  const saved = await readFile(manifestFile, "utf8");
  for (const [body, headers, id, status] of [
    [pdf, { Origin: "https://foreign.test" }, "forest", 403],
    [pdf, { Origin: "" }, "forest", 403],
    [pdf, { "Content-Type": "image/png" }, "forest", 415],
    [pdf, { "X-Original-Filename": "image.png" }, "forest", 415],
    [Buffer.from("not a PDF"), {}, "forest", 400],
    [Buffer.alloc(0), {}, "forest", 400],
    [pdf, {}, "unknown", 404],
    [pdf, {}, "bad!id", 400],
    [Buffer.alloc(maximumPdfBytes + 1), {}, "forest", 413]
  ]) {
    const rejected = await put(body, headers, id);
    assert.equal(rejected.status, status);
    await rejected.text();
    assert.equal(await readFile(manifestFile, "utf8"), saved);
    assert.deepEqual(await readFile(join(root, "certificates/forest.pdf")), pdf);
  }
  assert.equal(publicationCalls, 1, "Abgelehnte Dateien dürfen keine Veröffentlichung auslösen.");
  const oversizedStream = await put(Buffer.alloc(maximumPdfBytes + 1), {}, "forest", true);
  assert.equal(oversizedStream.status, 413);
  await oversizedStream.text();
  assert.equal(publicationCalls, 1);
  const boundary = Buffer.alloc(maximumPdfBytes);
  pdf.copy(boundary);
  const acceptedBoundary = await put(boundary);
  assert.equal(acceptedBoundary.status, 200, "Genau 2 MB sind erlaubt.");
  await acceptedBoundary.json();
  failPublication = true;
  const failed = await put(pdf);
  assert.equal(failed.status, 500);
  assert.match((await failed.json()).error, /GitHub nicht erreichbar/);
  assert.deepEqual(await readFile(join(root, "certificates/forest.pdf")), pdf, "Bei einem Push-Fehler bleibt die neue PDF lokal erhalten.");
  failPublication = false;
  const repeated = await put(pdf);
  assert.equal(repeated.status, 200);
  await repeated.json();
  assert.equal((await readdir(join(root, "certificates"))).length, 1, "Temporäre Dateien werden entfernt.");
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  for (const name of await readdir(join(root, "certificates"))) await unlink(join(root, "certificates", name));
  await unlink(manifestFile);
  await unlink(exportFile);
  await rmdir(join(root, "certificates"));
  await rmdir(join(root, "data"));
  await rmdir(root);
}
console.log("PDF-Upload geprüft: Typ, Dateikopf, Kurvenkennung, Origin, 2-MB-Grenze einschließlich Streaming, Veröffentlichung und Wiederholung.");
