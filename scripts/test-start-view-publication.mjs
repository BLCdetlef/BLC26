import assert from "node:assert/strict";
import { createStartViewPublisher, createCertificatePublisher, publicationChecks } from "./publish-start-view.mjs";

const root = "C:/Users/haud/Documents/GitHub/BLC26";
const view = { curveIds: ["one", "two"] };
function fixture(options = {}) {
  const commands = [];
  let saved = false, staged = false, committed = false;
  const run = async (command, args) => {
    commands.push([command, ...args]);
    const key = args.join(" ");
    if (command !== "git") {
      if (options.failCheck) throw new Error("Prüfung fehlgeschlagen");
      return "ok";
    }
    if (key === "rev-parse --show-toplevel") return options.wrongRoot ? "C:/wrong" : root;
    if (key === "branch --show-current") return options.branch || "main";
    if (key === "remote get-url origin") return options.remote || "https://github.com/BLCdetlef/BLC26.git";
    if (key === "status --short --branch") return "## main...origin/main\n" + (options.dirty ? " M app.js" : options.certificate && !committed ? staged ? "M  data/certificates.json\nA  certificates/forest.pdf" : " M data/certificates.json\n?? certificates/forest.pdf" : staged ? "M  data/start-view.json" : saved && !committed ? " M data/start-view.json" : "");
    if (key === "rev-parse refs/remotes/origin/main") return "base";
    if (key === "rev-parse HEAD") return committed ? "new" : options.ahead ? "pending" : "base";
    if (args[0] === "merge-base" && options.behind) throw new Error("Remote ist voraus");
    if (args[0] === "rev-list" && args[1] !== "--parents") return options.ahead ? "pending" : "";
    if (args[0] === "rev-list") return "pending base";
    if (args[0] === "diff-tree") return options.unrelatedCommit ? "app.js" : "data/start-view.json";
    if (key === "diff HEAD -- data/start-view.json") return options.unchanged ? "" : "diff";
    if (key === "ls-files --others --exclude-standard -- data/certificates.json certificates/forest.pdf") return "certificates/forest.pdf";
    if (args[0] === "add") staged = true;
    if (args[0] === "commit") { committed = true; staged = false; }
    if (args[0] === "push" && options.failPush) throw new Error("Netzwerkfehler");
    if (args[0] === "ls-remote") return `${options.mismatch ? "other" : committed ? "new" : options.ahead ? "pending" : "base"}\trefs/heads/main`;
    return "";
  };
  const publish = options.certificate ? createCertificatePublisher(root, run) : createStartViewPublisher(root, run);
  const persist = async () => { saved = true; };
  return { publish, persist, commands, saved: () => saved };
}
const happy = fixture();
assert.deepEqual(await happy.publish(view, happy.persist), { commit: "new", curveCount: 2, deployment: "pending" });
assert.equal(happy.commands.filter(([command]) => command !== "git").length, publicationChecks.length);
const commitIndex = happy.commands.findIndex(([, command]) => command === "commit");
const pushIndex = happy.commands.findIndex(([, command]) => command === "push");
assert.ok(commitIndex > happy.commands.findIndex(([, command]) => command === "diff"));
assert.ok(pushIndex > commitIndex);
assert.deepEqual(happy.commands[pushIndex], ["git", "push", "origin", "new:refs/heads/main"]);
for (const options of [{ wrongRoot: true }, { branch: "other" }, { remote: "https://wrong.test" }, { dirty: true }, { behind: true }, { ahead: true, unrelatedCommit: true }]) {
  const blocked = fixture(options);
  await assert.rejects(blocked.publish(view, blocked.persist));
  assert.equal(blocked.saved(), false);
  assert.ok(!blocked.commands.some(([, command]) => ["add", "commit", "push"].includes(command)));
}
const failed = fixture({ failCheck: true });
await assert.rejects(failed.publish(view, failed.persist), /lokal gespeichert/);
assert.ok(!failed.commands.some(([, command]) => ["commit", "push"].includes(command)));
const network = fixture({ failPush: true });
await assert.rejects(network.publish(view, network.persist), /Netzwerkfehler/);
const retry = fixture({ ahead: true, unchanged: true });
assert.equal((await retry.publish(view, retry.persist)).commit, "pending");
assert.ok(!retry.commands.some(([, command]) => command === "commit"));
const mismatch = fixture({ mismatch: true });
await assert.rejects(mismatch.publish(view, mismatch.persist), /nicht bestätigt/);
const concurrent = fixture();
let release;
const hold = new Promise(resolve => { release = resolve; });
const running = concurrent.publish(view, async () => { await hold; await concurrent.persist(); });
await assert.rejects(concurrent.publish(view, concurrent.persist), /läuft bereits/);
release();
await running;
const certificate = fixture({ certificate: true });
assert.equal((await certificate.publish("forest", certificate.persist)).seriesId, "forest");
assert.deepEqual(certificate.commands.find(([, command]) => command === "add"), ["git", "add", "--", "data/certificates.json", "certificates/forest.pdf"]);
assert.deepEqual(certificate.commands.find(([, command]) => command === "commit").slice(-3), ["--", "data/certificates.json", "certificates/forest.pdf"]);
const blockedCertificate = fixture({ certificate: true, dirty: true });
await assert.rejects(blockedCertificate.publish("forest", blockedCertificate.persist));
assert.equal(blockedCertificate.saved(), false);
const crossLock = fixture();
let releaseCross;
const crossHold = new Promise(resolve => { releaseCross = resolve; });
const crossRunning = crossLock.publish(view, async () => { await crossHold; await crossLock.persist(); });
const otherPublisher = fixture({ certificate: true });
await assert.rejects(otherPublisher.publish("forest", otherPublisher.persist), /läuft bereits/);
releaseCross();
await crossRunning;
console.log("Startansicht-Veröffentlichung geprüft: Git-Grenzen, Prüfungen, Commit, Push, Bestätigung, Wiederholung und Parallelzugriff.");
