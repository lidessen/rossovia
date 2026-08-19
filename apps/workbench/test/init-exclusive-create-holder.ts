import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { initializeHome, nodeHomeIo, type HomeIo } from "../src/home";

/**
 * A test-only process boundary for the deterministic init-versus-migration
 * race: it runs the production initializeHome with an injected HomeIo seam
 * that holds initialization exactly at the exclusive creation of one
 * canonical file — after observing that file absent — until a release file
 * appears. The owning test starts a migration while init is held there, lets
 * the migration publish the winner, then releases init. The exclusive
 * O_EXCL creation must fail with EEXIST and load/validate the winner, so the
 * winner can never be overwritten. No production code reads this boundary;
 * ordinary initializeHome API/CLI behavior is unchanged.
 */
function main(): void {
  const [home, observedPath, barrierPath, releasePath] = process.argv.slice(2);
  if (!home || !observedPath || !barrierPath || !releasePath) {
    process.stderr.write("usage: init-exclusive-create-holder <home> <observed-path> <barrier> <release>\n");
    process.exitCode = 2;
    return;
  }
  const seam: HomeIo = {
    createFileExclusive(path, data) {
      if (path === observedPath) {
        // Observe the canonical file at the exact creation decision, record
        // the observation for the owning test, and hold until released.
        let observed = "absent";
        try {
          readFileSync(path, "utf8");
          observed = "present";
        } catch {
          // The path is absent: this stale observation must never let the
          // creation overwrite a winner published after the observation.
        }
        writeFileSync(`${barrierPath}.tmp`, observed, "utf8");
        renameSync(`${barrierPath}.tmp`, barrierPath);
        const deadline = Date.now() + 30_000;
        while (!existsSync(releasePath) && Date.now() <= deadline) {
          Bun.sleepSync(10);
        }
        if (!existsSync(releasePath)) {
          process.stderr.write("init-exclusive-create-holder: release barrier never appeared\n");
          process.exitCode = 1;
          return;
        }
      }
      nodeHomeIo.createFileExclusive(path, data);
    },
  };
  console.log(JSON.stringify(initializeHome(home, seam), null, 2));
}

main();
