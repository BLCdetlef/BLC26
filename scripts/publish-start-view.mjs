import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execute = promisify(execFile);
const repository = "C:/Users/haud/Documents/GitHub/BLC26";
const remote = "https://github.com/BLCdetlef/BLC26.git";
const publicationLocks = new Set();
export const publicationChecks = [
  "scripts/verify-gwl-import.mjs", "scripts/test-curve-selection.mjs",
  "scripts/test-curve-links.cjs", "scripts/test-reference-status.cjs",
  "scripts/test-certificates.mjs", "scripts/test-start-view-publication.mjs",
  "scripts/test-certificate-upload.mjs"
];

export function createFilePublisher(root, run = async (command, args) => {
  try {
    const result = await execute(command, args, { cwd: root, timeout: 120000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return result.stdout.trim();
  } catch (error) {
    throw new Error((error.stderr || error.stdout || error.message).trim());
  }
}) {
  const git = (...args) => run("git", args);
  async function inspect(files, stagedFiles = false) {
    const top = await git("rev-parse", "--show-toplevel");
    const branch = await git("branch", "--show-current");
    const origin = await git("remote", "get-url", "origin");
    const status = await git("status", "--short", "--branch");
    if (resolve(top).toLowerCase() !== resolve(repository).toLowerCase() || resolve(root).toLowerCase() !== resolve(repository).toLowerCase() || origin !== remote) {
      throw new Error("Veröffentlichung gestoppt: Projektpfad oder GitHub-Repository stimmt nicht.");
    }
    if (branch !== "main") throw new Error("Veröffentlichung ist nur auf main möglich.");
    const changes = status.split(/\r?\n/).filter(line => !line.startsWith("##") && line);
    if (changes.some(line => !files.includes(line.slice(3)) || ![" M", "??", ...(stagedFiles ? ["M ", "A "] : [])].includes(line.slice(0, 2)))) {
      throw new Error("Bitte andere lokale oder vorgemerkte Änderungen zuerst abschließen. Es werden ausschließlich die Dateien dieser Veröffentlichung übertragen.");
    }
  }
  return async function publish({ files, message, result, description }, persist) {
    const lock = resolve(root).toLowerCase();
    if (publicationLocks.has(lock)) throw new Error("Eine Veröffentlichung läuft bereits. Bitte warten.");
    publicationLocks.add(lock);
    let saved = false;
    try {
      await inspect(files);
      await git("fetch", "origin", "main");
      const base = await git("rev-parse", "refs/remotes/origin/main");
      const before = await git("rev-parse", "HEAD");
      await git("merge-base", "--is-ancestor", base, before);
      // A retry may push earlier commits for these files, never unrelated commits.
      const ahead = await git("rev-list", `${base}..${before}`);
      for (const commit of ahead.split(/\r?\n/).filter(Boolean)) {
        const parents = await git("rev-list", "--parents", "-n", "1", commit);
        const paths = await git("diff-tree", "--no-commit-id", "--name-only", "-r", commit);
        if (parents.split(/\s+/).length !== 2 || paths.split(/\r?\n/).filter(Boolean).some(path => !files.includes(path))) {
          throw new Error("Andere lokale Commits sind noch nicht veröffentlicht. Bitte zuerst separat abschließen.");
        }
      }
      await inspect(files);
      await persist();
      saved = true;
      await inspect(files);
      for (const check of publicationChecks) await run(process.execPath, [check]);
      await git("diff", "--check");
      await inspect(files);
      if (await git("rev-parse", "HEAD") !== before) throw new Error("Der Git-Stand wurde während der Prüfung geändert. Bitte erneut versuchen.");
      const changed = await git("diff", "HEAD", "--", ...files);
      const untracked = await git("ls-files", "--others", "--exclude-standard", "--", ...files);
      if (changed || untracked) {
        await git("add", "--", ...files);
        await git("diff", "--cached", "--check");
        await inspect(files, true);
        await git("commit", "--only", "-m", message, "--", ...files);
      }
      await inspect(files);
      const commit = await git("rev-parse", "HEAD");
      const publishedPaths = await git("diff", "--name-only", base, commit);
      if (publishedPaths.split(/\r?\n/).filter(Boolean).some(path => !files.includes(path))) throw new Error("Andere Änderungen vor dem Push erkannt. Veröffentlichung gestoppt.");
      await git("push", "origin", `${commit}:refs/heads/main`);
      const remoteHead = await git("ls-remote", "origin", "refs/heads/main");
      if (remoteHead.split(/\s+/)[0] !== commit) throw new Error("Der neue GitHub-Stand konnte nicht bestätigt werden. Bitte erneut versuchen.");
      return { commit, ...result, deployment: "pending" };
    } catch (error) {
      throw new Error(`${saved ? `${description} lokal gespeichert, aber nicht erfolgreich an GitHub übertragen. ` : ""}${error.message}`);
    } finally {
      publicationLocks.delete(lock);
    }
  };
}

export function createStartViewPublisher(root, run) {
  const publish = createFilePublisher(root, run);
  return (view, persist) => publish({
    files: ["data/start-view.json"], description: "Startansicht",
    message: `Veröffentliche Startansicht mit ${view.curveIds.length} Kurven`,
    result: { curveCount: view.curveIds.length }
  }, persist);
}

export function createCertificatePublisher(root, run) {
  const publish = createFilePublisher(root, run);
  return (seriesId, persist) => {
    if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(seriesId)) throw new Error("Ungültige Kurvenkennung.");
    return publish({
      files: ["data/certificates.json", `certificates/${seriesId}.pdf`],
      description: "Zertifikat", message: `Veröffentliche Zertifikat für ${seriesId}`,
      result: { seriesId }
    }, persist);
  };
}
