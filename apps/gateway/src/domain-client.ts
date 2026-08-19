/**
 * Domain-client boundary for the Presentation assembly layer.
 *
 * This module is the single place where the gateway's CLI and web surfaces
 * reach Rossovia domain operations. Today it forwards directly to the
 * Workbench domain modules in the same repository; when the product moves to
 * a resident gateway daemon, this module becomes the HTTP client of that
 * daemon and nothing else in `apps/gateway` needs to change.
 *
 * Ownership follows decision 055: domain facts (Project/Task/Mission truth,
 * acceptance) stay with Workbench; this module only exposes call surfaces.
 */
export {
  createLocalTaskControlPlane,
} from "../../workbench/src/local-task-control-plane";
export {
  listPrincipalTaskWorkers,
  reconcilePrincipalTaskAttempt,
  runPrincipalTask,
} from "../../workbench/src/task-run";
export { showPrincipalTaskAttempts } from "../../workbench/src/task-attempts";
export { loadPrincipalTasks } from "../../workbench/src/tasks";
export { listProjects } from "../../workbench/src/projects";
export { runMissionCommand } from "../../workbench/src/missions";
