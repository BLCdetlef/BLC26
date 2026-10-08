import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import selection from "../curve-selection.js";

// Only the local editor may write the public default; static hosting stays read-only.
export async function storeStartView(request, response, { exportFile, targetFile, publish }) {
  const reply = (status, payload) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(payload));
  };
  const host = String(request.headers.host || "");
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host) || request.headers.origin !== `http://${host}`) {
    return reply(403, { error: "Speichern ist nur aus der lokalen BLC26-Ansicht erlaubt." });
  }
  if (request.headers["content-type"] !== "application/json") return reply(415, { error: "JSON erforderlich." });
  let view;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 65536) return reply(413, { error: "Die Auswahl ist zu groß." });
      chunks.push(chunk);
    }
    const payload = JSON.parse(await readFile(exportFile, "utf8"));
    const checked = selection.validateView(JSON.parse(Buffer.concat(chunks).toString("utf8")), payload.curves);
    view = { version: checked.version, curveIds: checked.curveIds, segments: checked.segments };
    if (!view.curveIds.length || !Object.values(view.segments).some(Boolean)) {
      return reply(400, { error: "Bitte mindestens eine Kurve und eine Darstellungsart für die Startansicht auswählen." });
    }
  } catch (error) {
    return reply(400, { error: error instanceof SyntaxError ? "Ungültiges JSON." : error.message });
  }
  const temporary = `${targetFile}.${randomUUID()}.tmp`;
  try {
    const persist = async () => {
      await writeFile(temporary, `${JSON.stringify(view, null, 2)}\n`, "utf8");
      await rename(temporary, targetFile);
    };
    const publication = publish ? await publish(view, persist) : (await persist(), undefined);
    reply(200, { view, publication });
  } catch (error) {
    reply(500, { error: publish ? error.message : "Die Startansicht konnte nicht gespeichert werden." });
  } finally {
    await rm(temporary, { force: true });
  }
}
