import { z } from "zod";

/**
 * The host-selected Task authority admitted to a concrete AI SDK/Pi driver.
 * It changes the actual projected tool surface, not only the prompt; the
 * value stays provider-neutral, so it is the one minimal owner shared by
 * every driver and the host-tool wiring inside this Integration island.
 */
export const TaskToolSetSchema = z.enum(["manage", "read-update", "read-only"]);
export type TaskToolSet = z.infer<typeof TaskToolSetSchema>;
