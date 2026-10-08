import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execute = promisify(execFile);
const repository = "C:/Users/haud/Documents/GitHub/BLC26";
const remote = "https://github.com/BLCdetlef/BLC26.git";
const file = "data/start-view.json";
export const publicationChecks = [
  "scripts/verify-gwl-import.mjs", "scripts/test-curve-selection.mjs",
  "scripts/test-curve-links.cjs", "scripts/test-reference-status.cjs",
  "scripts/test-certificates.mjs", "scripts/test-start-view-publication.mjs"
];

export function createStartViewPublisher(root, run = async (command, args) => {
  try {
    const result = await execute(command, args, { cwd: root, timeout: 120000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return result.stdout.trim();
  } catch (error) {
    throw new Error((error.stderr || error.stdout || error.message).trim());
  }
}) {
  let busy = false;
  const git = (...args) => run("git", args);
  async function inspect(stagedStartView = false) {
    const top = await git("rev-parse", "--show-toplevel");
    const branch = await git("branch", "--show-current");
    const origin = await git("remote", "get-url", "origin");
    const status = await git("status", "--short", "--branch");
    if (resolve(top).toLowerCase() !== resolve(repository).toLowerCase() || resolve(root).toLowerCase() !== resolve(repository).toLowerCase() || origin !== remote) {
      throw new Error("Veröffentlichung gestoppt: Projektpfad oder GitHub-Repository stimmt nicht.");
    }
    if (branch !== "main") throw new Error("Veröffentlichung ist nur auf main möglich.");
    const changes = status.split(/\r?\n/).filter(line => !line.startsWith("##") && line);
    if (changes.some(line => line !== ` M ${file}` && !(stagedStartView && line === `M  ${file}`))) {
      throw new Error("Bitte andere lokale oder vorgemerkte Änderungen zuerst abschließen. Es wird ausschließlich die Startansicht veröffentlicht.");
    }
  }
  return async function publish(view, persist) {
    if (busy) throw new Error("Eine Veröffentlichung läuft bereits. Bitte warten.");
    busy = true;
    let saved = false;
    try {
      await inspect();
      await git("fetch", "origin", "main");
      const base = await git("rev-parse", "refs/remotes/origin/main");
      const before = await git("rev-parse", "HEAD");
      await git("merge-base", "--is-ancestor", base, before);
      // A retry may push an earlier start-view commit, never unrelated local commits.
      const ahead = await git("rev-list", `${base}..${before}`);
      for (const commit of ahead.split(/\r?\n/).filter(Boolean)) {
        const parents = await git("rev-list", "--parents", "-n", "1", commit);
        const paths = await git("diff-tree", "--no-commit-id", "--name-only", "-r", commit);
        if (parents.split(/\s+/).length !== 2 || paths.split(/\r?\n/).filter(Boolean).some(path => path !== file)) {
          throw new Error("Andere lokale Commits sind noch nicht veröffentlicht. Bitte zuerst separat abschließen.");
        }
      }
      await inspect();
      await persist();
      saved = true;
      await inspect();
      for (const check of publicationChecks) await run(process.execPath, [check]);
      await git("diff", "--check");
      await inspect();
      if (await git("rev-parse", "HEAD") !== before) throw new Error("Der Git-Stand wurde während der Prüfung geändert. Bitte erneut versuchen.");
      if (await git("diff", "HEAD", "--", file)) {
        await git("add", "--", file);
        await git("diff", "--cached", "--check");
        await inspect(true);
        await git("commit", "--only", "-m", `Veröffentliche Startansicht mit ${view.curveIds.length} Kurven`, "--", file);
      }
      await inspect();
      const commit = await git("rev-parse", "HEAD");
      const publishedPaths = await git("diff", "--name-only", base, commit);
      if (publishedPaths.split(/\r?\n/).filter(Boolean).some(path => path !== file)) throw new Error("Andere Änderungen vor dem Push erkannt. Veröffentlichung gestoppt.");
      await git("push", "origin", `${commit}:refs/heads/main`);
      const remoteHead = await git("ls-remote", "origin", "refs/heads/main");
      if (remoteHead.split(/\s+/)[0] !== commit) throw new Error("Der neue GitHub-Stand konnte nicht bestätigt werden. Bitte erneut versuchen.");
      return { commit, curveCount: view.curveIds.length, deployment: "pending" };
    } catch (error) {
      throw new Error(`${saved ? "Startansicht lokal gespeichert, aber nicht erfolgreich an GitHub übertragen. " : ""}${error.message}`);
    } finally {
      busy = false;
    }
  };
}
