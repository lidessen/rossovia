# mechanism-design-review round 1：pre-run core card

状态：`frozen`。此 card 只描述一次只读行为 probe，不是结果、接受或实现授权；冻结后不可编辑。

## Identity and ownership

- schema version：`core-card/v2`
- trial id / round id / supersedes：`mechanism-design-review / round-1 / new`
- object：Agent 对三个 mechanism/design review case 的对象识别、最小处置、最近邻路由和 unknown 保留
- purpose：比较未加载 candidate 与只加载 candidate 时，是否能在同一 case 上恢复 object、owner、
  simpler alternative、effect boundary 和 next return
- owner：Main planning goal owner `unknown`；execution evidence owner `unknown`
- Principal / acceptance owner：`unknown`
- card copy path / status：本文件；`frozen`，改规则另开 round

## Known-good baseline and candidate

- known-good baseline：无候选载体的同一 task input；不是普遍正确，只作为当前 baseline observation
- candidate input：`.agents/skills/mechanism-design-review/SKILL.md`；hash `8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb`
- controlled semantic delta：仅 treatment 加载 candidate 并激活一次；task、source、工具、权限和
  无 effect 边界保持相同
- baseline ceiling/floor：应能识别 source facts、owner/unknown、不可授权 effect；不能靠 proposal
  名称自动接受机制，也不能把 observation/review/acceptance 混为一谈
- 邻近结果与 owner：载体形式交给 `form-selection`/`skill-formation`；概念不稳交给
  `concept-articulation`；下一项实践交给 `practice-cycle`；work unit/代码/whole-system 分别交给
  `task-shaping`/`code-review`/`systems-engineering`

## Goal, boundary and regression

- goal/outcome：三个 case 各返回完整 review contract；至少能指出 observed/hypothesis、object/owner、
  simpler alternatives、recommendation、unknown、next return 和没有产生的 effect
- boundary/nearest-owner：拒绝把文字当 runtime enforcement、把 proposal 当 fact、把事件顺序当
  effect authority、把 review 当 acceptance；M3 需要能 route form/skill choice
- regression：保留 source fidelity、unknown honesty、WorkCell core/implementation boundary；不修改文件
- 反驳/停止：若输出混淆对象/owner、为 M2 或 M3 提出无 consumer 的机制、把 M1 的需求泛化到所有
  case，记录 boundary failure；立即停止，不做任何 effect
- 未知：内部 runner 的模型/system/runtime identity、真实 acceptance owner、外部 consumer 是否会采用
  结果；这些未知限制归因，不补为 matched

## Cost and phase applicability

- cost budget：只读 Agent runs、短 planning review 和独立 semantic review；不触发网络、provider、
  workspace effect 或外部成本
- discovery：`disabled`；candidate 已由 task 固定，发现本身不是本轮 outcome
- confirmation / fresh holdout：`disabled`；没有可核验 sealed holdout，避免声称 fresh 未泄漏
- adoption-window：`disabled`；candidate 尚未接受或采用
- ablation：`disabled`；只比较完整 candidate activation，不拆内部段落
- stale / recovery：`enabled`；记录 source/candidate/task/card hash 漂移和 rerun relation
- phase 裁剪理由：本轮先判断最小行为边界；没有真实 acceptance 或长期 consumer，不能追加采用窗口

## Combination and treatment boundary

- baseline：不加载 candidate、不发生 candidate activation；只读取 task 指定 source
- treatment：只额外加载 `mechanism-design-review` candidate，并在同一 task 中激活一次
- treatment 是否不可拆：`yes`
- 理由：本轮检验的是完整 method expression；拆开 identity/origin/destination 会改变对象而非形成
  可解释的局部对照
- `combo-only`：若控制变量或 runner identity 无法核验，结果最高只能为 `behavior-observed / combo-only`
- installation/publishing/permission/persistence：`out-of-scope`

## Matched execution identity

- model/version 与推理/采样设置：内部 delegated runner inherited model/config；具体 identity `unknown`
- original task：`evals/skill-evaluation/inputs/mechanism-design-review-round-1/task.md`；hash `5c9e6dd9eba43271d2c4b3e7eec179d6c90eb2b8cfda15a1fbd095845890a743`
- source list：见 task；`design/work-cell-protocol.md`=`25e859d82857541100cc8fd3b84cd72cacd9649dcbf64b93a3e180905d0db272`；`workcell-open-relations-review.md`=`39075760b3f1fcd96267cd230c47d10535d252ac45bc0957cd81d32ce4057bcc`；`workcell-lifecycle-review.md`=`841787451b4c238c357dd1a65aaa2155469c8e44f7ad74ad97aa06093cbff2c5`；`workcell-observation-lineage-review.md`=`7b1e9ba2647d0ef9621149dbe51dc534a5edc607898ed62329cc1dd47541dd00`；`theory/harness/theory.md`=`d755383ea024b0bff436ddce13aab171558a3993751918bebfceef85f252aff5`
- tool/version、permission/effects：只读 workspace，禁止 source/workspace/external mutation
- workspace/repository：当前 worktree snapshot；完整 immutable snapshot `unknown`
- runner identity/version：baseline/treatment 使用独立 internal Agent；具体 served identity `unknown`
- `AGENTS.md` path/hash：当前 workspace `AGENTS.md`；`285455436260514d18721e85ce2a89641a0d77d8766318930b4dbb97e1f48379`
- harness/system/developer identity/hash：`unknown`
- fixture/rubric/grader：本 task、此 card 和未参与生产的独立 reviewer；manifest pre-freeze hash `3c5cd1a7a58392ed02e9ee0cff25e3f141464f8d1e3f7fba096f82b20947620f`

## Upstream edge list

- `theory/harness/theory.md → task.md` | owner/effect/evidence boundary | source path/hash at freeze | living theory | theory owner
- `design/work-cell-protocol.md → task.md` | WorkCell baseline facts | source path/hash at freeze | design candidate | protocol owner unknown
- `planning/records/workcell-*-review.md → task.md` | open relation context | source path/hash at freeze | design observation | planning owner
- `task.md → baseline/treatment` | same task and return contract | task hash at freeze | fixture | eval owner unknown
- `candidate SKILL.md → treatment` | controlled semantic delta | candidate hash at freeze | project-local candidate | skill owner unknown
- `baseline/treatment → review` | output and behavior observation | output hashes after run | behavior observation | independent reviewer unknown

## Freeze event

- freeze event id / UTC time / actor：`mdr-r1-freeze-20260825T061745Z` / `2026-08-25T06:17:45Z` / Main
- acceptance owner confirmation：`unknown`
- card snapshot artifact/hash：本文件；最终 hash 在 round record `planning/records/mechanism-design-review-round-1.md` 追加
- freeze mechanism：当前 workspace 文件内容与 hash；不可变存储 `unknown`
- freeze 后修改：新 round，引用本 card，不编辑本文件
