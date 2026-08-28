# Evidence applicability review：living skills round-2 family

状态：`historical-artifacts-observed / current-applicability-uncertain / independent-review-complete / acceptance-pending`。
本记录是 whole-planning goal 下 evidence-maintenance item 的一次有界 reconciliation；它不是新
trial、不是对旧 card/run/review 的修订，也不是任何 skill 的接受、迁移或实现授权。

## 1. 要核对的关系

七个 living skill 的 round-2 manifest 都是预注册清单，执行时间和产物声明为 `unknown / not run`，但当前 `evals/skill-evaluation/runs/`
和 `reviews/` 下存在同名或同 round 的产物。与此同时，manifest 中记录的 candidate hash 与当前
`.agents/skills/` 中的 hash 均不相同。需要区分：

1. 这些文件是否只是历史遗留产物，还是可按 manifest 重建的正式 Run；
2. review 对实际输出作出的 `behavior-observed` 判断能否回接到当前候选；
3. 当前 skills 是否有足够证据离开 `.agents/skills/`，或只能继续 incubation/hold。

来源边界是当前 [`protocol.md`](../../evals/skill-evaluation/protocol.md)、七份 round-2 manifest、
`fixtures/round-2.md`、当前候选 `SKILL.md`、实际 run 文件、对应 review 文件和
[`trial-ledger.md`](../../evals/skill-evaluation/trial-ledger.md)。没有把文件存在、
输出非空或 review 文件存在当成完整 Run identity。

## 2. 逐项 reconciliation

| candidate | manifest declared state | filesystem artifacts observed | manifest-declared candidate source edge | current applicability |
|---|---|---|---|---|
| `agent-delegation` | 预注册；execution/output `unknown / not run`；fixture `R2-AD` | isolated baseline、isolated treatment、isolated review | manifest `35c624...b5c5a`；current `f9d4f9...861c` | historical output/review observed；current hash and runtime lineage unknown |
| `agent-expression` | 预注册；execution/output `unknown / not run`；fixture `R2-AE` | baseline、treatment、review | manifest `94ddae...2bed3`；current `7a9adc...0885` | historical output/review observed；current hash and runtime lineage unknown |
| `concept-articulation` | 预注册；execution/output `unknown / not run`；fixture `R2-CA` | baseline、treatment、review | manifest `147de2...40e1a`；current `e50fc9...a7cd4` | historical output/review observed；current hash and runtime lineage unknown |
| `dual-audience-expression` | 预注册；execution/output `unknown / not run`；fixture `R2-DA` | isolated baseline、isolated treatment、isolated review；另有一个未成对的 baseline | manifest `764893...06b8`；current `a05b5a...17a38` | isolated observation exists；formal pair/card linkage and current hash unknown |
| `form-selection` | 预注册；execution/output `unknown / not run`；fixture `R2-FS` | baseline、treatment、review | manifest `1c4a8a...bac6b`；current `54656d...d93ce` | historical output/review observed；current hash and runtime lineage unknown |
| `human-writing` | 预注册；execution/output `unknown / not run`；fixture `R2-HW` | baseline、treatment、review | manifest `67fc61...b108e`；current `ed4d5f...139db` | historical output/review observed；current hash and runtime lineage unknown |
| `skill-formation` | 预注册；execution/output `unknown / not run`；fixture `R2-SF` | baseline、treatment、review | manifest `60e04d...ab8eda`；current `19b55a...b2df6` | historical output/review observed；current hash and runtime lineage unknown |

表中的省略 hash 只用于阅读；完整 hash 见第 4 节。manifest 的 fixture hash 均指向同一个当前可读的
`fixtures/round-2.md` hash，但这只说明 fixture 文件边可回读，不证明各次运行实际收到的逐字输入、
候选激活、模型、harness、权限或 workspace 相同。

## 3. 证据边界与判断

### 3.1 不能把 manifest 的 `not run` 改成已运行

manifest 是 treatment 前的预注册/core card；其中记录的 candidate/source 条件是该 card 的拟议身份，
但这不等于完整 workspace 已被冻结，且 protocol 明确禁止用 post-freeze 认识倒写旧 card。
当前存在 run/review 文件只能支持“历史产物存在”；它不能自动证明这些文件由该 card 生成，也不能
补出缺失的 ledger entry、runner identity、输出身份或 activation proof。七组在当前
`trial-ledger.md` 中均没有可回读的 round-2 entry，因此 lineage 目前断开。

### 3.2 review 的观察上限低于 current applicability

七份 review 都明确或等价地把 matched comparison 判为未成立，并保留了模型/设置、harness、
工具/权限、workspace、候选 hash 或隔离身份等 unknown；可支持的最高共同描述是对已有文本产物的
历史行为观察，不能回接为当前候选的 `matched-improvement`、portable promotion、regression 或
acceptance。`skill-formation` review 对 A 的 `no-proposal` 是当轮 review 的建议，不替代本次
applicability record，也不改变其没有当前 lineage 的事实。

### 3.3 当前源码 hash 漂移使“当前 skill 已被评估”不能成立

七个 manifest 的 manifest-declared candidate hash 与当前 `.agents/skills/*/SKILL.md` 均不同。即使某个旧
run 曾经真实加载过候选，也无法从现有材料知道它加载的是 manifest 版本、后续版本还是另一个上下文
中的内容。因此这些旧观察不能证明当前源码版本的行为，也不能支持把任一载体移到可移植的
`skills/`。

### 3.4 当前目录位置的保守结论

这次 reconciliation 不裁定任何 skill 永久删除，也不裁定它们已被接受。当前可支持的目录决定是：
仍把项目依赖、项目 authority 和当前 evidence unknown 的载体留在 `.agents/skills/` incubation；
没有独立的 portability evidence，不晋升到 `skills/`。这与“目录已存在”无关，而取决于 source、
consumer、可重建 trial 和 acceptance 关系尚未闭合。

## 4. 可回读 hash 与文件边

共同 fixture：

- `evals/skill-evaluation/fixtures/round-2.md`：`e5723eb47f9e12cb458d99daef0f8adc49855759b09f204b2de68a7722df1d48`

逐项的 manifest file、manifest-declared candidate、运行产物和 review hash 如下；manifest-declared candidate
SHA-256 单独列出；这些 hash 证明文件内容可回读，
不证明运行时身份或语义适用性：

- `agent-delegation`：manifest file `028581a262cb674d23e6cda82bd0e44566f9ed569d7c78b525c43d91775d686f`；
  manifest-declared candidate `35c624a5d78e91027cbe69f486c125ea1df98224a93598252a3f46d5d05b5c5a`；current
  `f9d4f9187a85a263bf252449fefb6a6a235ab5340aee5c18d27fc309f718615c`；baseline
  `2772fed5fb84fd9adec462f67e4e1589d21109e20489abbbaff36db301bd38a2`；treatment
  `cb1258054930b72ad06155a40e6ec3ff3324d50a109db27e294e3748194fcc71`；review
  `49190dba0ab61746529c537fefdf462e54f13e302588793d9fb758bac7004c23`。
- `agent-expression`：manifest file `f82f0177c522a2c432daa890c8d3db6a5202eb46f38dfb321857bacb3658506b`；
  manifest-declared candidate `94ddae82abd3e14caa149013dc5e2099c91bfc63c69787de90b6596d9302bed3`；current
  `7a9adcafd3567dfc41630a9367ae95742129ea05527a2d80da821f9e13180885`；baseline
  `ad65d051f988e7d92191e347436179332080515c6d786d747bce19c05b76159a`；treatment
  `7b843f40abd8049c9a1987dd968c2c7ddbbfc3854f6c1bc80a7ccd6d060c7b14`；review
  `15543970ac3666ffa24d3ae190dff69887777e71e24c61b06edcd28a3af1b1a1`。
- `concept-articulation`：manifest file `0fc727a55e39be3694913db1f84794814139c74a984a6475e2f16fe0aac0cc98`；
  manifest-declared candidate `147de22b52863041b6daf65dcafff9bf6bb554a8570b3a25a238d9b1d4540e1a`；current
  `e50fc95044339ed24b7b06c80befa20d7cea2a1213b2951dda191847403a7cd4`；baseline
  `ec5ea0a934740bc39789c4d1c8da370746dba92d23eabe33c5a74db0363d4cda`；treatment
  `0d5274b9f1cdadddfdb8560a6a95bd56d81a727b6e4e3c3fd3835a6bb0a2db85`；review
  `004fbf7ba6eaeaa7cd83408d72481aab5d6fe334c2d63913fb797a6f6fc3dba8`。
- `dual-audience-expression`：manifest file `1ae8a7845a7bc26495dec22b3c88bbcb544c6ab4a30bcdbec8e98bb612a2a8f5`；
  manifest-declared candidate `764893985f7c974c8664246da19a84292966dd38b46c3f123bd41c4ec0c706b8`；current
  `a05b5aa00dfe408b2821728c827bc94a73c3d64f4b60ee6c63d41bda1b217a38`；isolated baseline
  `d90b6b0cad32661ee98303021ab8bfddb004f5d4f4ff03980ec4f464023b9009`；additional baseline
  `7945800d2757e1e69aed15f2253aa01ac5b89ba6f36abf3db40778ef49307f67`；isolated treatment
  `c587c89b69cf84d17149b8f36da53e767b72e81756acc46ca4d15bbc627e90be`；review
  `742ba065bc1a9f57894def0e434acf0f177568b5e57fe9eabf27e39ad089babd`。
- `form-selection`：manifest file `d54eb8a323b5a27fb8ab2d0ee7d9e19cc95ac55770e51457a497df3e76470821`；
  manifest-declared candidate `1c4a8a6672edf5967118a7e404389a34d8771d24f489e2a3a386b316492bac6b`；current
  `54656d76eebc0a4d293519849e271ed75a999d1d7066ba06cd943f24324d93ce`；baseline
  `08030cfc5c4fc03238ed00bc2331210d3dd560464923ac9967222f112c8f717a`；treatment
  `8fc132710da3ae65ae812e36841bf826f5cea28a09ce49814299166a2dcdfe13`；review
  `2c1182dbad5d62343e893ad1d0f7758dc8c6e5cf1b33dc8893f872f6a34aa0b6`。
- `human-writing`：manifest file `a0bf2ebfa056494cad2f249ee517ef93097a44945511b2a9376db3b395853308`；
  manifest-declared candidate `67fc61fef467a3cad01268ff6bcc1384ff72fe7102c3c4e9ebc41806daab108e`；current
  `ed4d5f77f2383d19f052d26c7423162bcac9c15ec5886c9602c1ac7ac5b139db`；baseline
  `549599463667d49e0bbe7dc400356e1cc0ce9292fa631152f7359b7f654bfa73`；treatment
  `d97ac5fa55b7e09999dd23694f5e0fbeed7e34dd72a091a2090dcdf41cb42fec`；review
  `f40e42ff531cf8a91c548071d6d8e9227ae5bffdfb9c29c9cad243d7e1daa013`。
- `skill-formation`：manifest file `9aaee079a71464b37c2fba082ff98770039e2c333005f173bbb4ff213f7c88f3`；
  manifest-declared candidate `60e04d161bc84ba049b4d0d86ee2245335bc008c2d3b48dda0ca3dd491ab8eda`；current
  `19b55a89021d0b9b046478681e4bb077bbf496f5772f79ce31d668f41fbb2df6`；baseline
  `5a0251d4284e05d39a450fc52fe59eba2ff0648da8c96e9f200e69371588b69d`；treatment
  `7c7f01b5f63a4296dd08ffde361615d6fb38146ad89678994d881879b814aed1`；review
  `943f59d3203a1dcdf4e84c5346b5d48b5fd68ef54dee4647fc0f6acb3cdc8389`。

本记录的 hash 只用于确认文件边是否发生变化；它们不补足运行身份、激活证明或 card lineage。

## 5. 处置与下一 return

- reconciliation item：`uncertain / historical-only / hold`；不把任何旧 artifact 补写成 current Run，
  不将 review 建议提升为接受决定。
- carrier placement：七个 skill 继续留在 `.agents/skills/` incubation；当前没有 portable promotion
  依据，也没有本记录单独触发 delete、rewrite 或 move。
- 本轮不编辑 manifest、Run、review、fixture 或候选 skill，不补造 ledger 事实，不为填 coverage 直接
  rerun，不创建新的评估工具或 harness。
- 只有以下关系恢复后，才值得开一个新的、有当前 candidate hash 的 round：named eval/runner owner；
  manifest 与 run/review 的明确 lineage；逐次 task/source/card/candidate/output hash；完整 model、
  harness、工具、权限、workspace 与 activation/non-activation identity；fresh context 和 reviewer
  独立性；以及 candidate owner、consumer、acceptance owner。新 round 不能编辑本轮历史材料。
- 如果无法恢复这些关系，则保留历史观察并关闭“由 round-2 直接支持当前 skill 迁移/接受”的分支为
  `no-proposal-now`；不要把“文件存在”解释为“方法已判断过”。

## Independent review

`Hubble`（Agent `01a03875-9202-7892-8413-2c6b693b23d3`）独立复核两轮：初轮要求修正 manifest
状态和 hash 标签，Main 修订后 final accept。复核确认本记录准确区分预注册 manifest、历史 artifact、
正式 Run、review 与 ledger；保留 hash mismatch、缺少 lineage、不成对 artifact、runtime/activation
unknown；没有把历史 `behavior-observed` 提升为 current matched、portable 或 acceptance。该 review
不取得 skill、目录迁移、接受、WorkCell、DeepSeek 或实现授权。
