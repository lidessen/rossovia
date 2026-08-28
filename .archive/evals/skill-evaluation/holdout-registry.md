# Optional sealed holdout registry

本 registry 只在 core card 的 `confirmation / fresh holdout` phase 启用时建立。普通 core card
不包含题目 identity，只引用本 registry 的 opaque commitment、选择规则和 owner。registry 与
[`trial-manifest.md`](trial-manifest.md) 的 card snapshot、[`trial-ledger.md`](trial-ledger.md)
的运行/污染/rerun entry 互相链接。

## 保密边界

protocol 的 prose 不能强制保密、不可见或不可变；真实封存、访问控制、审计和锁定机制必须由
存储、权限或 runner 提供并记录。若机制、访问日志或结果前未见性无法核验，写 `unknown`，不得
把自报“未见”当作 fresh holdout 证据，也不得给出 `matched-improvement` 的泛化主张。

## Pre-run sealed entry（结果锁定前）

- registry id / trial id / round id / owner：
- opaque commitment（写入 core card 的同一值）：
- selection rule 与 rule hash（不暴露题目 identity）：
- 封存 artifact/snapshot hash：
- sealing mechanism、锁定时间、执行者与可验证证据：
- permitted accessors/roles、访问控制与审计 log hash：
- runner/harness identity 与 card snapshot hash：
- commitment record hash、previous entry hash、append mechanism：
- 未提供或无法核验的机制/日志：`unknown`，并记录影响：

## Result-lock entry（结果锁定后追加）

- lock event id / 时间 / appender / lock mechanism：
- lock 前的访问者、访问日志和污染检查 artifact/hash：
- holdout identity 的 reveal 或 identity hash（仅此时出现）：
- revealed dataset/source hash 与 commitment verification：
- 实际使用时点、baseline/treatment/reviewer 可见性：
- 暴露、筛选、调参、泄漏或不可重建观察：
- fresh standing、归因上限、污染后的集合降级和责任 owner：

## Rerun / recovery entry

- contamination/stale event id、影响的 card/run/output hash：
- 原 holdout 是否作废、保留的历史 commitment/reveal：
- 新 sealed registry id/commitment、刷新 owner、封存机制与访问者：
- rerun id、新 card snapshot hash、结果锁定关系：
- 仍未知及其对 fresh、boundary、regression 或 matched 主张的限制：

每条 entry 追加 entry id、previous entry hash、record hash、UTC time、appender 和真实 append
mechanism；机制未知时如实记录 `unknown`。旧 commitment、reveal 和污染事件不能编辑或删除。
