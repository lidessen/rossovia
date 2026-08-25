# planning-inbox round 3：old-vs-new 综合处置

## 结论

处置：`retain as project-local incubating candidate / behavior-observed / adapt-and-observe`。

保留当前 new snapshot 对应的 `.agents/skills/planning-inbox/` 候选，但不宣称它取得
matched-improvement、稳定成本改善、portable skill 接受或可移入 `skills/`。old snapshot 继续
作为 rollback anchor；本轮没有触发 rollback，因为 A–E 的 new 输出都守住 semantic floor，
且没有 major regression。

这项 retain 只说明：三处有设计依据的最小修订可以继续进入项目内 dogfood。它不说明 new
在每个任务上更好。盲评实际是 old 一项略优、new 一项略优、三项打平。

## 证据重连

- 预注册静态 review：`accept / behavior unknown`；允许比较，不预授予 retain。
- 正式运行：A–E old/new 共十个输出都有可见 `turn.completed`；请求模型是
  `gpt-5.6-luna`，served model 仍为 `unknown`；没有可见 tool event。
- 失败边界：B–E 先前八次 sandbox 初始化失败没有模型输出，已单独保存在
  `runs/planning-inbox-round-3/failed-sandbox-attempt/`，不计入行为样本或成本。
- 盲评揭示：A old 略优，D new 小幅胜出，B/C/E 打平；十个输出全部高于或等于 semantic
  floor。
- 因果上限：system/developer prompt、完整 harness、served model、权限、fresh-context、
  snapshot 激活与物理隔离仍有 unknown；因此只报告同一冻结输入关系下的输出观察。

## 三处 delta 的观察

1. **稳定 source 的 ID/path/lineage 回指。** 没有造成 raw 丢失。B 的 capture-only 负向 probe
   仍逐字保留原话；C 涉及 clear 时也保留了 history-before-clear、中断和 hold 关系。
2. **只展开会改变处置的区别，并集中共同边界。** new 的五个输出文件合计更短，但 A 没有
   像 old 那样形成更清楚的批次级关系摘要，因此这一规则尚未表现为稳定的语义或 token 优势。
3. **source 未给 owner 时写 `owner unknown`。** D 的 new 因明确保留 `owner unknown` 与 runtime
   阻塞边界而小幅胜出；A/E 也没有把工程、实验、研究等候选路由写成现任正式 owner。

## 成本观察

| 指标 | old | new | 观察 |
|---|---:|---:|---|
| 输出文件字节 | 14,141 | 13,325 | new 少 816，约 5.8% |
| input tokens | 82,738 | 83,473 | new 多 735，约 0.9% |
| output tokens | 6,412 | 6,917 | new 多 505，约 7.9% |
| reasoning tokens | 2,759 | 3,481 | new 多 722，约 26.2% |

因此“可见文本更短”没有转化成 token 成本下降，不能把压缩目标写成已实现。单次、非 matched
运行也不足以把 token 差异归因给 snapshot。这里保留字节、token 与语义三种观察的差异，不用
统一总分掩盖冲突。

## Main acceptance 与下一观察窗口

Main 接受上述有限 retain：当前 new 继续作为 `.agents/skills/` 内的项目候选，用于处理真实
`planning/inbox.md`；不晋升到 `skills/`，也不删除 old rollback anchor。

下一次真实 inbox consume 是 correction observation window：

- 必须先把 raw、source、receipt、disposition 与 lineage 写入 history，再清除已处置 pending；
- 普通长期想法不得抢占当前 goal，候选路由不得冒充 owner、Run、research record 或 Plan 接受；
- 复杂批次应保留可回指的批次级关系，不能因逐条压缩丢失依赖；
- 如果再次出现 owner 被类型替代、raw 无法恢复、clear/complete 混淆、候选升级或批次关系丢失，
  立即 reopen；若只是 token 没下降，则记录为成本目标未证实，不单独构成语义 rollback。

完成真实 dogfood 和独立 review 前，planning-inbox 仍是 project-local incubating candidate，
behavior standing 只到本轮可见输出观察。
