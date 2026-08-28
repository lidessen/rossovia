# Round 2 skill-formation 独立语义评审

## 隔离判定

**matched：no。** 两份运行都披露只接收了 `R2-SF` 的同一 task/source 标记区间，baseline 披露未加载候选载体，treatment 披露读取并仅凭候选 `SKILL.md` 与 task/source 作答；这些记录足以确认发生了两种可比较的行为观察。但运行记录没有核实精确模型与设置、harness、workspace state、实际工具与权限，也没有记录运行时 task/source/候选载体 hash 或可复核的运行身份。manifest 中这些承重项仍为 `unknown`，所以不能确认唯一变量，也不能把差异归因于候选方法。

## 语义评分

下表的 `yes` 表示满足该行正向关系，`no` 表示违反，`uncertain` 表示现有来源不足以决定。

| 关系 | baseline | treatment | 最强证据 |
| --- | --- | --- | --- |
| A 的 owner 边界：在查明同因性与现有方法覆盖前不确定案为新 skill 所有 | no | yes | baseline 正确识别潜在的任务条件判断，却仍建议先制作窄的实验候选；treatment 保持 `no-proposal`，并把局部规则、living 文档和现有 skill 列为须先排除的更近 owner。 |
| B 归局部文档修正或既有链接校验，而非 skill | yes | yes | 两者都以已完成的直接改链为最小处置，只把防复发交给已有 validator/CI。 |
| C 归带版本与来源的事实供应以及确定性查询工具，而非 skill | yes | yes | 两者都要求按目标版本固定离线数据，并让刷新、校验和查询由缓存、制品或工具链承担。 |
| D 归不可绕过、跨重启的 runtime/支付边界机制，而非 skill | yes | yes | 两者都要求稳定操作身份、持久状态或供应商幂等接口，并明确 prompt/skill 不能承担硬保证。 |
| A 在当前证据下保持 `no-proposal` | no | yes | 现有来源明确留下“七次是否同因”和“现有方法是否覆盖”两个未知；baseline 在查明前已允许写实验候选，treatment 先诊断和检查 owner，满足最小准入边界。 |
| 保留 A 的证据边界 | yes | yes | 两者都保留七次观察、一次临时提示后的单次正确重跑、未复现、成因未知、owner 未知和没有 matched 证据；都没有把单次重跑写成改善。 |
| 未把严重性或重复次数直接当作 skill 准入 | yes | yes | baseline 要求确认共同缺口并排除更近 owner；treatment 也把七次重复只当作待诊断信号。两者都没有因 D 严重而把它提升为 skill。 |
| 是否需要回读 P/theory 才能执行判断 | no | no | baseline 未加载候选载体；treatment 明确披露仅凭候选 `SKILL.md` 与 task/source 完成，并未回读 P/theory。没有观察到载体不自足缺陷。 |

比较级判定：treatment 相对 baseline 是否改变判断或行动，而非只改文风：**yes**。可观察变化集中在 A：baseline 的下一步包括制作窄的未采用实验候选，treatment 改为先做差距诊断、owner 覆盖检查与冻结条件下验证，当前不提出载体。B、C、D 的 owner 和最小动作基本不变。该差异是否由候选 skill 导致：**uncertain**，因为 matched 隔离未成立。

## 结论与 disposition

最强可用证据等级是 **`behavior-observed`**。A 的 `no-proposal` 边界在 treatment 中更清楚，并构成实质判断变化；B、C、D 没有显示同等幅度的变化。由于 matched 隔离不成立，任何 `matched-improvement`、`boundary-supported` 或载体因果主张均不可提出。

最小 disposition：**载体决定暂缓，先补齐运行身份后重跑 matched comparison；当前不据此 retain、rewrite、delete 或接受。** 重跑只需把模型与设置、harness、workspace、工具权限、三项运行时 hash、两次新鲜上下文及互不可见性变成可核实记录，并继续以 A 的“未知近邻 owner 时是否保持 no-proposal”作为主要判别点。最终接受仍归人类 owner，本评审不取得接受权。
