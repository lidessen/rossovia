# mechanism-design-review round 1

状态：`behavior-observed / boundary-supported / attribution-unknown / acceptance-unknown`；本轮处置为
`adapt-and-retest`。它支持继续修订并保留 project-local candidate，不支持 `matched-improvement`、
portable acceptance、WorkCell protocol acceptance、runtime gate 或任何实现授权。

## Frozen card 与运行边界

- card：[`evals/skill-evaluation/manifests/mechanism-design-review-round-1.md`](mechanism-design-review-round-1.md)
- final card hash：`9f33a6c42c20c5dcbe1fb095dfc2c8f1a96e8d600d92ef78fc0db54998aa6648`
- task hash：`5c9e6dd9eba43271d2c4b3e7eec179d6c90eb2b8cfda15a1fbd095845890a743`
- candidate hash：`8f56998d2b9bb4a24f76c5b6384a1b10067947599133cf876bd9bd37b27bbbdb`
- freeze event：`mdr-r1-freeze-20260825T061745Z / 2026-08-25T06:17:45Z / Main`
- task：[`evals/skill-evaluation/inputs/mechanism-design-review-round-1/task.md`](../../evals/skill-evaluation/inputs/mechanism-design-review-round-1/task.md)
- baseline：内部隔离 runner `Pasteur`，原始输出 [`baseline.md`](../../evals/skill-evaluation/runs/mechanism-design-review-round-1/baseline.md)，SHA-256
  `404d5fe474c59812fe1c83fac9245f108017c7e130148bcb2c01a5412fbc7604`
- treatment：内部隔离 runner `Kant`，只额外加载冻结 candidate，原始输出 [`treatment.md`](../../evals/skill-evaluation/runs/mechanism-design-review-round-1/treatment.md)，SHA-256
  `06bb51a936c7a8d47bdc6f17f0bd9f9c8381c479b19f339c173d5e73518c8f5b`

baseline/treatment 使用同一 task、candidate/source snapshot 和返回 contract；运行本身没有修改
workspace。两次运行的完整模型、system prompt、runner/harness identity 没有可独立核验的记录，
因此不能把输出差异归因于 candidate。discovery、confirmation/fresh holdout、adoption-window
和 ablation 未启用；没有真实 sealed holdout 或采用后暴露窗口。

## 运行观察

| case | baseline | treatment | 当前可成立的观察 |
| --- | --- | --- | --- |
| M1：存在跨进程 replay/recovery consumer | `mechanism-candidate` | `mechanism-candidate` | 两者都识别 durable replay/lineage 为可能的 mechanism pressure；treatment 更明确写出跨进程 owner、重启恢复、duplicate/order/gap/retention fixture，但这不是 matched improvement |
| M2：没有 replay consumer，只有 typed Event 与 RunRecord | `no-proposal` | `no-proposal` | 两者都没有凭空创建 event bus、replay store 或 registry；treatment 更明确保留 observation-only 与 reopen 条件 |
| M3：机制、载体和概念尚未稳定 | `route-unknown` | `route-unknown` | 两者都没有把 form/skill/projection/runtime 选择误写成 mechanism；treatment 明确先路由 `form-selection`，概念不稳时路由 `concept-articulation` |

三案的核心 recommendation 一致，因而没有观察到结果层面的 candidate-specific change。treatment
在 owner、硬关系、nearest-owner route、stop/effect boundary 和下一返回条件上的表达更完整；这
是局部边界观察，尚未证明对另一任务、另一 runner 或真实使用者有稳定改善。

## 独立 semantic review

reviewer：`Jason`（Agent `01a03787-cf5d-7383-9110-b1941e3670a3`），未参与 baseline/treatment
生产，本轮只读审查实际 raw outputs、frozen card、candidate 和 planning record。

- `format-valid` 成立，candidate hash 与 frozen manifest 一致；candidate 核心关系有 source 支撑。
- `behavior-observed` 成立，且 M2/M3 有局部 `boundary-supported`；但 matched 不成立：model、runner、
  harness 和完整 workspace identity 都不可独立核验。
- acceptance owner 为 `unknown`，adoption-window 未启用，因此不能推出 adoption 或 regression。

逐案结论：

1. **M1：** object 基本成立，是跨进程、可重放的 per-run event relation；protocol、record/evidence、
   coordinator/runtime 的 owner 分解合理，但 retention/acceptance owner、cursor、recovery granularity
   仍未知。`mechanism-candidate` 只表示条件性设计观察，不证明 durable log 已是最小实现。
2. **M2：** object、owner、route、最小处置和 unknown 均成立；应保留 observation surface 与
   RunRecord，不因未来可能需要而创建 bus/store/registry。它是本轮最强的 negative/boundary observation，
   但不是 candidate 带来的 matched improvement。
3. **M3：** 应先稳定 object、failure、owner 和 acceptance，再选最小 carrier；route 到
   `form-selection` 和 `concept-articulation` 基本成立，但由于明确涉及 skill carrier，还应补
   `skill-formation`，不能把 carrier 选择误收进机制审查。

baseline/treatment 的 recommendation 分别一致为 `mechanism-candidate`、`no-proposal`、
`route-unknown`；treatment 主要增加 owner 分解、字段化 unknown、停止边界和更具体 route，不能
支持 `matched-improvement`。baseline 已恢复大部分核心判断，差异可能是表达完整度而非 candidate
造成的行为改善。

## 独立 review 后的处置

round disposition：`adapt-and-retest`。

理由是：没有 matched、acceptance 或 adoption evidence，不能 `adopt`；但 M1/M3 有可保留的
owner/route 改善方向，不能 `retain-baseline` 或 `no-proposal`；没有发现污染，且存在明确的最小
修订和区分性 probe，不选 `uncertain`。

carrier disposition 继续为 `rewrite + retain-incubation`。下一轮只修订三点：

1. 把 M1 consumer 明确标为 fixture-stipulated premise，而非外部 consumer 事实；
2. 将 M1 durable log 降为待比较的机制候选，补 retention/acceptance route；
3. 在 M3 增加 `skill-formation` 路由，并保持 form-selection 与 mechanism review 的先后关系。

不 move 到 `skills/`，不宣称 acceptance，不授权 WorkCell 或 runtime 实现。

## 过程与缺口

- standing：`format-valid` 已由 validator 支持；三案输出构成 `behavior-observed`，局部可构成
  `boundary-supported`，matched attribution `unknown`。
- source：candidate、task、card 与 upstream source hash 已冻结；archive 仍只是历史来源，living
  theory 与 planning record 仍拥有语义/当前 projection。
- acceptance：没有 named acceptance owner、接受 rubric、adoption window 或 regression run；保持
  `acceptance-unknown`。
- effect boundary：没有安装、发布、持久化、权限、runtime state、queue、registry、gate 或外部
  调用；没有产生实现授权。
- identity gap：当前内部 runner 的 full model/system/harness identity 未形成可验证的 run record；
  后续若要声称 matched，需要先补齐或明确降级为 behavior-only。

## 下一轮 return condition

保持载体为 `rewrite + retain-incubation`，但先完成以下最小回返：

- 将 M1 改成带 named consumer、owner-backed contract、normal/duplicate/out-of-order/gap/
  post-restart fixture 的真实设计 case；
- 保留 M2 的 negative case 和 M3 的 nearest-owner routing case，检查候选是否会过度提出机制；
- 让独立 reviewer 盲审实际 raw outputs，并记录 outcome、process、balancing cost 与 unknown；
- 只有在可重建的匹配 runner/source/任务和相称 acceptance 关系存在时，才重新判断是否
  `adopt`、`retain-baseline` 或 `no-proposal`；否则继续 `adapt-and-retest` 或 `uncertain`。

本 round 不改变总 planning 阶段门槛：哲学解读、剩余迁移筛选、方法候选和 WorkCell 设计回返仍
可并行推进；DeepSeek Harness 工作系统设计仍等待 WorkCell 设计接受；WorkCell/base/runtime
实现与用户 harness 构想实现仍未授权。
