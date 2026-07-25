export interface SetupModule {
  id: "multi-agent-delegation";
  changelogPrefix: "workbench.setup.multi-agent-delegation";
  guidance: string;
}

export const multiAgentDelegationModule: SetupModule = {
  id: "multi-agent-delegation",
  changelogPrefix: "workbench.setup.multi-agent-delegation",
  guidance: `## Multi-agent delegation

Treat delegation as a task-shaping decision, not as a fixed tool recipe. When
one request contains two or more concrete, bounded contributions that can
proceed independently, use the active environment's supported delegation and
coordination capabilities when their isolation or parallel progress reduces
attention cost, latency, or interference enough to justify the overhead.
Multiple people, files, or topics do not by themselves justify delegation:
keep coupled judgment, trivial work, and sequential dependencies together.
The main agent retains synthesis, verification, and the final response.`,
};
