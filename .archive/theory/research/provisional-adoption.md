---
kind: concept-candidate
id: provisional-adoption
status: settled
disposition: canonical-proposal
evidence: source-backed
settlement_route: canonical-proposal-or-archive
owner: "unknown"
consumer: planning-and-harness-methods
review_at: reopen-on-bounded-trial-candidate
---

# 有界试行与暂定采用研究候选

当前状态：`settled / canonical-proposal / source-backed / boundary-formed / formal-adoption-not-authorized`。
这表示暂定采用的概念边界已结算为 proposal，不表示任何具体规则已经正式采用。

关联 main goal：`01a0370c-d215-7680-909f-6145a34dc1bf`。

用户观察到现实中的“试行条例”介于草稿和正式规则之间，可能为 candidates 提供一条能产生真实效果
和反馈、又不偷带正式接受的中间路径。本记录先形成概念边界和最小关系，不创建全局 status enum、政策
registry、runtime gate 或永久 acceptance。

## 1. 对象与概念边界

当前考察的对象不是“一个更成熟的 draft 文件”，而是：

> **有界试行（bounded trial adoption）**：一个尚未取得一般性正式接受的 candidate，在明确的作用域、
> 期限、允许效果、保护条件、观察指标、回返/退出路径和实际 owner 下，被允许暂时影响真实工作，目的在于
> 获得 feasibility、behavior、boundary 或 effect evidence，并据此决定修订、回滚、继续试行或正式评审。

这是一个 candidate 与实际 scope/consumer/owner 的 adoption relation，不是 candidate 的永久本体状态。
“试行”有真实但受限的操作效果；“草稿”默认没有这样的操作授权；“正式接受”则表示对应 owner 已接受
其在声明范围内作为 canonical/current basis。试行证据可以支持下一步，但不能自动完成 acceptance。

## 2. 最近邻与排除

| 最近邻 | 相同处 | 决定性区别 |
| --- | --- | --- |
| `draft` / candidate | 仍有未知、可变、接受未成立 | 没有或不应产生试行范围内的真实操作效果 |
| `experiment` | 都可通过运行取得证据 | experiment 是验证干预/假设的活动；有界试行是对 candidate 施加受限操作关系；一个试行可以包含 experiment，但二者不是同一对象 |
| `baseline` | 都是比较中的当前参照 | baseline 是实验条件，不是 adoption standing |
| `accepted` | 都可能被真实 consumer 读取 | accepted 具有明确的接受关系和 canonical 作用域；试行故意保留有限期、限制和回退 |
| `rollback` / `expired` / `retired` | 都描述后续处置 | 它们是试行结束后的 disposition 或生命周期观察，不是试行的同义词 |
| `experimental specification` | 都可能在正式标准之外收集实现经验 | RFC 的 Experimental 是标准过程中的特定出版类别；本项目只借鉴其 maturity/evidence 分离，不把它照搬成协议状态 |

## 3. 外部类比支持与边界

| 类比 | 支持的关系 | 不直接移植的部分 |
| --- | --- | --- |
| [IETF RFC 2026](https://www.rfc-editor.org/info/rfc2026/) | Proposed/Draft/Standard 与 Experimental 分离；标准化依赖实现和运行经验；Experimental 不是 Internet Standard | IETF 有自己的组织和 maturity authority；不能把本项目的 candidate 直接标为 RFC-style level |
| [ISO Technical Specification / PAS](https://www.iso.org/deliverables-all.html) | TS 可在技术仍发展时发布、允许立即使用并收集反馈；TS 有 review；PAS 有有效期、转化或撤回路径 | ISO 的投票、期限和法律/标准效力不属于本项目；这里只借鉴“可用、可反馈、可复查/退出”结构 |
| [FCA Regulatory Sandbox](https://www.fca.org.uk/firms/innovation/regulatory-sandbox) | 小规模、有限期限、有限参与者、明确目标和 safeguards 的受控 live test；sandbox 不是监管豁免 | 本项目不是监管机构，也不因此获得外部授权；真实高风险效果仍要单独 owner/security decision |
| [GOV.UK policy evaluation guidance](https://www.gov.uk/government/publications/guidance-and-resources-for-evaluating-policy-in-government) | pilot 是规模化前的 rehearsal，可用 RCT、waitlist 或 stepped rollout 获取比较证据 | pilot 不是自动有效，也不能替代长期/外部有效性；具体设计要回到 experiment card |

## 4. 最小结构：不要把它压成一个万能 enum

“试行”同时涉及 candidate 身份、操作效果、证据和接受，使用一个 `status` 或 `maturity` 枚举会把不同
关系混在一起。建议把它表达为以下结构化关系：

```text
candidateRef       → 正在试行的 canonical candidate
adoptionRelation   → bounded-trial（当前暂定 designation，不是全局 enum 承诺）
scope              → 哪些 role / scene / task / consumer 可以使用
allowedEffects     → 可以影响哪些判断/文档/局部动作；禁止哪些外部效果
owner              → 谁批准本次试行、接收回返、决定续试/退出
validity           → start / reviewAt / expiry 或明确触发式回查
baseline           → 当前参照与不改变的共同条件
evidencePlan       → primary outcome、boundary、regression、balancing cost、记录载体
safeguards         → stop、rollback、污染/风险、越界处理
disposition        → continue-trial / revise / rollback / expire / propose-acceptance
acceptance         → 正式接受关系仍独立、可为 unknown
```

其中 `scope`、`validity`、`allowedEffects` 和 `acceptance` 是关系/属性，不应被压成固定 label；`bounded-trial`
可以作为当前文档的 working handle，只有未来出现跨多个真实 consumer、稳定边界和接受需求，才重新做正式
designation。试行不是“半正式”，而是“有限范围内有授权、一般范围内未接受”。

## 5. 适用于本项目的最小进入/退出

### 进入前必须成立

- candidate 的 canonical source、对象边界和最近邻已足够稳定；概念仍不稳时回到 `concept-articulation`；
- 有真实 consumer/owner，或明确记录 `owner unknown` 并只做不产生外部效果的 preparation；
- 有冻结的 experiment/pilot card，至少写清 baseline、treatment、primary outcome、balancing cost、
  污染/失败、stop/rollback 和 return；
- scope、期限/复查点、允许效果和禁止效果可被执行者与 reviewer 回读；
- 试行不会绕过 WorkCell、host/security、acceptance 或 runtime 的既有 owner。

### 结束时只能走显式回返

- `continue-trial`：证据尚不足但风险/成本仍在允许范围，续试必须产生新 review relation；
- `revise`：对象、表达、scope 或实验设计需要改变，开新 revision/card，不倒写旧试行；
- `rollback`：撤销该试行允许的效果，保留已产生的观察和未知；
- `expire`：到 reviewAt/expiry 未取得足够回返，不把沉默写成成功；
- `propose-acceptance`：证据达到约定门槛后提交真正 acceptance owner，仍不由试行记录自动接受。

## 6. 当前处置

本记录现结算为 `settled / canonical-proposal`：概念边界、最近邻、最小结构和进入/退出关系已经形成，
但它仍不是统一 standing vocabulary、全局 status enum、政策 registry、runtime gate 或任何 candidate 的
实际试行授权。正式接受仍由对应 owner 决定。

只有出现真实 candidate、scope、owner、期限、允许效果、rollback、primary outcome 和 acceptance relation
时，才以新 bounded-trial record 重开；没有这些关系不为了填补 draft→accepted 之间的空档制造状态。
