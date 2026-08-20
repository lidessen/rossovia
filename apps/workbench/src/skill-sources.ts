/**
 * The host-facing skill source projection.
 *
 * This is deliberately a policy projection, not a loader or a filesystem
 * scanner. A harness adapter owns discovery and body loading; Workbench only
 * explains which source families are eligible for each audience and when
 * their metadata/body may enter context.
 */

export const SKILL_SOURCE_PROJECTION_VERSION = "rosso.skill-source-projection.v1";

export type SkillAudience = "main-agent" | "worker";
export type SkillSourceKind = "picked" | "builtin" | "user-custom";
export type SkillVisibility = "always-visible" | "on-demand" | "searchable";
export type SkillSourceStanding = "declared" | "not-granted" | "unavailable";

export interface SkillSourceProjection {
  readonly id: string;
  readonly label: string;
  readonly audience: SkillAudience;
  readonly kind: SkillSourceKind;
  readonly visibility: SkillVisibility;
  readonly standing: SkillSourceStanding;
  /** A source locator, never a secret or a body copy. */
  readonly sourceRef: string;
  readonly bodyPolicy: "load-on-activation" | "load-on-match" | "not-granted";
  readonly note: string;
}

export interface SkillAudienceProjection {
  readonly audience: SkillAudience;
  readonly label: string;
  readonly sources: readonly SkillSourceProjection[];
  readonly boundary: string;
}

export interface SkillSourceProjectionResult {
  readonly version: typeof SKILL_SOURCE_PROJECTION_VERSION;
  readonly standing: "available";
  readonly source: "host-skill-source-policy";
  readonly policySources: readonly string[];
  readonly audiences: readonly SkillAudienceProjection[];
  readonly boundaries: readonly string[];
}

/**
 * Return the current host policy without pretending that policy is a runtime
 * loader. The source refs are stable logical locators until a harness adapter
 * supplies concrete roots for the current project/session.
 */
export function currentSkillSourceProjection(): SkillSourceProjectionResult {
  const mainAgentSources: readonly SkillSourceProjection[] = [
    {
      id: "main-agent.picked",
      label: "Pick skills",
      audience: "main-agent",
      kind: "picked",
      visibility: "on-demand",
      standing: "declared",
      sourceRef: "host-skill-source-policy:main-agent/picked",
      bodyPolicy: "load-on-activation",
      note: "显式选中的技能；只在当前任务需要时激活。",
    },
    {
      id: "main-agent.builtin",
      label: "Main Agent 内置 skills",
      audience: "main-agent",
      kind: "builtin",
      visibility: "always-visible",
      standing: "declared",
      sourceRef: "host-skill-source-policy:main-agent/builtin",
      bodyPolicy: "load-on-activation",
      note: "主 Agent 的稳定方法入口；常驻的是精简目录，不是完整正文。",
    },
    {
      id: "main-agent.user-custom",
      label: "主 Agent 用户自定义 skills",
      audience: "main-agent",
      kind: "user-custom",
      visibility: "searchable",
      standing: "declared",
      sourceRef: "host-skill-source-policy:main-agent/user-custom",
      bodyPolicy: "load-on-match",
      note: "用户可发现的自定义技能；匹配后才读取完整内容。",
    },
  ];
  const workerSources: readonly SkillSourceProjection[] = [
    {
      id: "worker.picked",
      label: "Worker Pick skills",
      audience: "worker",
      kind: "picked",
      visibility: "on-demand",
      standing: "declared",
      sourceRef: "host-skill-source-policy:worker/picked",
      bodyPolicy: "load-on-activation",
      note: "由主 Agent 为本次 worker 明确挑选的最小技能集合。",
    },
    {
      id: "worker.builtin",
      label: "Worker 内置 skills",
      audience: "worker",
      kind: "builtin",
      visibility: "always-visible",
      standing: "declared",
      sourceRef: "host-skill-source-policy:worker/builtin",
      bodyPolicy: "load-on-activation",
      note: "worker 的精简方法入口；不继承主 Agent 的完整技能目录。",
    },
    {
      id: "worker.user-custom",
      label: "Worker 用户自定义 skills",
      audience: "worker",
      kind: "user-custom",
      visibility: "on-demand",
      standing: "not-granted",
      sourceRef: "host-skill-source-policy:worker/user-custom",
      bodyPolicy: "not-granted",
      note: "默认不授予 worker；只有未来显式的 worker capability policy 才能开放。",
    },
  ];
  return {
    version: SKILL_SOURCE_PROJECTION_VERSION,
    standing: "available",
    source: "host-skill-source-policy",
    policySources: [
      "ROSSOVIA.md",
      ".rossovia/config/skill-sources.json (optional project override)",
      "ROSSO_HOME/config/skill-sources.json (user policy; target default ~/.rossovia)",
    ],
    audiences: [
      {
        audience: "main-agent",
        label: "内置主 Agent",
        sources: mainAgentSources,
        boundary: "主 Agent 可看到三类来源，但完整 skill 正文仍按需进入当前任务。",
      },
      {
        audience: "worker",
        label: "Worker",
        sources: workerSources,
        boundary: "worker 使用独立且精简的来源集合；默认没有用户自定义 skills。",
      },
    ],
    boundaries: [
      "根目录 skills/ 是可安装的项目 Skill 集合，不自动等于主 Agent 或 worker 的内置目录。",
      "always-visible 只表示可见的精简目录，不表示把完整 SKILL.md 常驻注入上下文。",
      "on-demand 与 searchable 都只返回必要的元数据，正文在激活或匹配后读取。",
      "来源、可见性和正文加载由 harness adapter 执行；Settings 只投影有效策略。",
    ],
  };
}
