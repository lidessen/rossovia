# planning-inbox round 2：映射揭示与综合处置

本文在两份盲语义 review 完成后揭示 X/Y 映射，重连语义判断与机械 run identity。它不
倒写预注册、输出或盲评，也不把一轮单次运行升级为稳定 skill 能力。

## 盲映射与结果

| item | Output X | Output Y | 盲评选择 | 揭示后关系 |
|---|---|---|---|---|
| A | treatment | baseline | X | treatment 更好 |
| B | baseline | treatment | Y | treatment 更好 |
| C | treatment | baseline | X | treatment 更好 |
| D | baseline | treatment | Y | treatment 更好 |
| E | treatment | baseline | X | treatment 更好 |

盲评者在揭示前都没有读取 candidate、inputs、runs、logs、scripts、run identity 或映射。
A–C reviewer 判断 treatment 保留了 raw lineage、capture 停点、history 中断冲突以及
clear/complete 边界；D–E reviewer 判断 treatment 更好地保留 active-goal 中的普通输入、
接受边界修正、candidate/record 和 research standing。五项均不是因为篇幅、栏目或术语更多
而被选择；每项都有 baseline 中对应的 source、authority、owner 或 standing 缺陷。

## 机械证据与归因上限

`runs/planning-inbox-round-2/run-identity.md` 已核对：五个 baseline input 与各自 payload
逐字节相同；五个 treatment input 逐字节等于固定 wrapper、冻结 candidate snapshot 和同一
payload；十次运行都有可重建 final output、JSONL 和 `turn.completed`，可见事件中没有工具
调用。B–E 由同一个固定 runner 成对运行，A 用同参数手动运行。

仍未核实的承重关系包括实际 served model 身份、完整 system/developer prompt、直接 exit
artifact、完整 harness/权限边界和 candidate 是否在模型内部按预期“激活”；A 还没有独立
stderr sidecar。所有 B–E 运行都留下同形的 Cloudflare MCP `AuthRequired` 初始化警告，但
JSONL 没有 MCP/tool item，不能据此断言警告无影响，也不能把它解释为语义失败。

因此本轮最强 standing 是：**同一请求配置下的 `behavior-observed`，并有 output-level
`boundary-supported` 观察；不能提出 `matched-improvement`、稳定泛化或因果归因。** 五项
treatment 都被盲评选中是强方向信号，不足以单独接受 skill。

## Outcome、process 与 balancing cost

### Outcome

- A treatment 保留六条逐字 raw、候选地位、unknown 与未接受边界；baseline 改写/截断
  raw，并把候选写得更像正式路线。
- B treatment 保留原话、来源、批次、上下文并明确未写入；baseline 的“已记录”可能伪造
  持久效果。
- C treatment 识别 history 描述中的冲突，保持 hold、中断、重复、clear 与 complete 的
  区别；baseline 最终把 clear 绑定到完成条件。
- D treatment 同时保留普通 future input 与待复查的接受边界修正，不让新/长/紧急抢主线，
  也不声称 runtime 已接收。
- E treatment 分开 experiment/research candidate 与实际 Run/research record，不把 runner
  或 reviewer 推成 acceptance owner。

未观察到 treatment 的 oracle-level 重大缺陷。A 的“后续决定者”仍有一个非阻塞风险：
输出列出的工程、实验、理论等角色应更明确写成候选路由或 `owner unknown`，不能被误读为
source 已给出的正式 owner。

### Process

round 1 的 task leakage、marker-only 隔离和 D authority 矛盾先被独立 review 拦下，round 2
没有倒写旧预注册，而改用物理独立 payload、整文件 hash 和盲评。这支持 workflow 的
污染识别与恢复关系；它不证明 future runner 一定遵守相同隔离。

### Balancing cost

五项 baseline 总计 `input 78,791 / output 3,592 / reasoning 1,600` tokens；treatment 总计
`input 91,251 / output 6,525 / reasoning 2,726`。候选 snapshot 使 treatment input 增加
12,460 tokens；treatment output 增加 2,933 tokens，约为 baseline 的 1.82 倍。D treatment
反而更短，说明增量不是必然由 skill 造成；A、B、C、E 的额外内容多数承载了盲评实际使用的
source、unknown、owner 与 standing 边界，但当前表达仍偏模板化。

为降低负担而不回到 baseline 的信息损失，下一 candidate 只应作三个最小变化：

1. source 已稳定可回指且本轮不 clear 时，用 ID/path/lineage 回指，不机械重抄整段 raw；
   capture 或 clear 前 history 保留仍须逐字 raw。
2. 只展开会改变 disposition、authority、owner 或下一行动的 explicit/inferred/unknown；
   批次共同边界只说一次，不把所有语义区分渲染成固定字段模板。
3. source 没有给出真实 owner 时明确写 `owner unknown`，把工程/实验/研究等只称为候选路由，
   不把角色类型表达成已存在的责任人。

## 处置

**`adapt-and-retest`。** 当前不修改 living theory、哲学序列、inbox/history 形式，也不拆分
capture/process skill。上述缺口属于 skill 的行动表达和 balancing cost；先最小修订 candidate，
再用同 payload 比较旧 candidate 与新 candidate，检查 source fidelity、owner unknown、
capture-only、clear/complete、candidate/record 和表达负担。若压缩使任何承重关系退化，保留
旧 candidate 或回退；若新 candidate 在相称回归中保持边界且减少不必要展开，再由独立 review
决定是否 retain。
