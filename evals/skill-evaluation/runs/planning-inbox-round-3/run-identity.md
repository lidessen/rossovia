# planning-inbox round 3：run identity / 机械审计

本报告只核对 round 3 的运行命令、输入输出字节、事件、stderr、token usage 和可核验边界；不评价 old/new 的语义优劣，不修改任何输入、输出、JSONL、stderr 或 manifest。所有哈希均为当前文件整文件字节的 SHA-256。报告中的“完成”不等于行为改善、matched、adopt 或接受。

## 运行命令与隔离声明

- CLI：`codex-cli 0.149.1`（本地版本核验）。
- 请求模型：`gpt-5.6-luna`；这是 runner 的请求值，实际 served model 在 JSONL 中没有字段，保持 `unknown`，不能从请求值推断。
- reasoning：`-c 'model_reasoning_effort="high"'`。
- 共同 flags：`--ephemeral --ignore-user-config --ignore-rules --sandbox read-only --skip-git-repo-check --color never --json`。
- runner：`scripts/run-planning-inbox-round-3.sh`；每个 item 同时启动 old/new，各自使用 `-C /tmp/skills-pi-r3-{item}-{old|new}`、独立 `-o` output、JSONL stdout 和 stderr sidecar，并在成功返回前检查 output/events 非空及 JSONL 含 `turn.completed`。
- runner 输出的十个正式臂均满足上述后置检查；runner 直接进程 exit code 没有单独持久化，严格记录为 `unknown`。因此不能把后置检查反推成可独立重建的 OS exit code。
- system/developer prompt 的完整内容或 hash、实际 harness、实际权限边界、实际是否只看到对应 input、candidate 是否确实被激活、fresh-context 隔离和工作目录隔离的运行时事实均未由 JSONL 暴露，保持 `unknown`。runner 命令和输入文件只支持声明预期配置，不证明完整运行时身份。

## 输入与 snapshot 锁

round 3 builder 的预期关系是：固定 wrapper + old/new snapshot + `\n# 本轮 runner payload\n\n` + 对应 round2 payload。manifest 中的五个 payload hash 已由 builder 的固定字节校验；本轮实际输入文件的 hash 如下。它们证明输入 artifact 可定位，不证明 runner 进程没有额外上下文。

| item | old input SHA-256 | new input SHA-256 |
|---|---|---|
| A | `792ef86689826fe6b838cc71a97ad6bbf6553daf9c46fd680a699876d4dd7592` | `6135e3d4478fce4ef985b504c9d8b68aed63de7fad3c48d11b2260aec0380641` |
| B | `aad5599ae024e890f88d6f6ab34b393ae1968108e3d34f072cbf00a9f947dbcb` | `4afe6e0cabc5360c50364bd7a8f955f990d68f6814ac7a91a63531ea2c81dda2` |
| C | `2436afea693c03768b72019c2718a30ae69441f4f4edbe29808d17baff6cefaa` | `f4fda90c77552fa9b0c91ee36230f2d8f845862b7b30d6c6f7c6a7e11782704d` |
| D | `2e8a5722b327a1acc0d805a57c6215f4ec5b38d5bfdc6d356ed321052ab2e929` | `f2cf8a069622b6d3741b21759d0c8eb81393f76b8f3b1adc484ebe447f56b9ae` |
| E | `63cfd2699c71d94e6051c75843edee0ebc4608ddedc504e2f39c9cb9d787f144` | `53e192773308e373f957c3deaaace5d789cfbc686f77283aa7ce810700739345` |

Snapshot hash（与 manifest）：old `b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`；new `53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e`。

## 正式运行的事件与 usage

usage 顺序为 `input / cached / cache_write / output / reasoning` tokens。十个正式 JSONL 均为非空，均有 `thread.started×1`、`turn.started×1`、`turn.completed×1`；所有 item 均为 `agent_message`。没有可见 `tool_call`、`function_call` 或 MCP tool item。`item.completed` 数量按事件文件记录。

| arm | thread id | output SHA-256 | events JSONL SHA-256 | stderr SHA-256 | usage | item.completed / direct exit |
|---|---|---|---|---|---|---|
| A-old | `01a03695-5c3f-73c2-a99d-52388f2271dd` | `9445673855353f7844abeda69f105c062071ddfc3c35e5996297acb582926c44` | `b70912705b6add6c6cff082f6e6bfa4f7490fd412909300b7dd92b95475d4ead` | `7aef290326d01772011509da846975d4e80ac72d49a0b59e403974673a223382` | `20164 / 8960 / 0 / 2448 / 462` | `1 / unknown` |
| A-new | `01a03695-5c82-7483-be07-d920fa233752` | `5b27c8bd5b0f70677815e053747ccd2261149292df1e51dde2ddcfa30e61f56b` | `49eebb3ce6b1608e148fa30f52909b5abbce97f3bdce8af98509edbc43ec0405` | `73aebf3ec9110839eb5dc8a0fd61fb33de676276fee613774515a2078180a487` | `20311 / 8960 / 0 / 3538 / 1540` | `2 / unknown` |
| B-old | `01a03695-e109-78a2-a4c8-62aec45d0a41` | `33bd4b3cc1b8e0faefda5ca4d361e6344f8457831a77edc1f03134ed92ee6e43` | `f8790fbfd2bfae78016aa79c51b4c5a65cefb9e5a8ae7ae3286a092339ada20f` | `4a08e5589364f9c0dfaffeb44352101bc6302c783ba68ad9724e1c878a1c1b65` | `15519 / 8960 / 0 / 451 / 325` | `1 / unknown` |
| B-new | `01a03695-e0f3-7612-a064-0f1f4d0cea13` | `a9020a65fb6c62d766b08c001c7fc9b0637eee5b774dd148d7f51b28b4a3f3fe` | `d90bc3e44453a9df54b0dbdd29d5d92fa181180f69d7a8a6aafd904486dd7874` | `1185dd8064770948212919ac4917babc786b6dc2dbedaa9370ac9534cf273217` | `15666 / 5888 / 0 / 301 / 165` | `1 / unknown` |
| C-old | `01a03695-e10a-7731-a1a8-19e8e90ac501` | `3b5913db92c6cf8ef4e83a8d9324ea5991e9f0a824bcb740a2930d71e468f11d` | `6702a6806ad8fd72eabc9a434ab11a767d50a50ddcee5f5dda43d45d9c4d73cd` | `06bda3d5afb5eaaaed036f78e09b82597d544a16d20c590969ef0372a26ed07a` | `15685 / 8960 / 0 / 1608 / 1151` | `2 / unknown` |
| C-new | `01a03695-e0f7-7ab3-bd04-3fa1d7420c50` | `6714de2a3a0608dd4046aa8ffe0dfe276807b29a0fa05f91c66dbfc20e293523` | `24f01eca3189d2b79c7dc12e680ead6db3ddc720b1c55e17cd2a36ff4bdc0214` | `4b4fe75edbe11a8e5fcc94a4f72178a92f45c78736ef499eb2a81f273ad54786` | `15832 / 8960 / 0 / 878 / 516` | `1 / unknown` |
| D-old | `01a03695-e130-7413-9d87-510869182e37` | `285df59140af5f32dd38b9a86614eb6b1b415a091912b133e155570305a501d6` | `090528b2b97d5bc6bfdc4ef675f90042e0f2ca623b3c47780403483f706f1b8d` | `cdcb9fd7eef836bc095bc8e72f9a24b44c2972bdccb28f5095a290ade950a450` | `15690 / 8960 / 0 / 960 / 441` | `1 / unknown` |
| D-new | `01a03695-e132-7751-85a8-204596f203b6` | `2b31099e594c9a9fb18e78aa93a0cbfb5f409cd5e1d12b760a14c36ff3ad3c25` | `36be3a4cfbd3e71906bfc4910a42b453e9f4e40da9dc794e73804457e47b8fe1` | `823e59a6a5c113a06e30f126c668c51fab6998fbce08d27f3ae444772eaaa990` | `15837 / 0 / 0 / 911 / 516` | `1 / unknown` |
| E-old | `01a03695-e0f6-73f2-aaff-a8f07489270a` | `e48b260a2fb10e6706dc89b8bb5fe61aab21ee4583bcc53db77fa7c381b8054a` | `c7668c32244f60dde7a0abd27e9f5e101416c702ba34463478f9f0e53f864fe4` | `be55095b0a683337eb8d25276b15d33defa512632c5a6759364f1e307a80e285` | `15680 / 0 / 0 / 945 / 380` | `1 / unknown` |
| E-new | `01a03695-e109-7293-bbcb-2804d4b21925` | `694e608df0c8d9f59155c31f7a97b0408606a1eaa02441b2207e56ea7ea53fd2` | `8502aa097d0e7d05c22e984a4741ed5c6df0f77006669694c1dfe9a92bab7565` | `fe8fa575b6848fa9557bd8894f4bab749cd7db195535e599d391dc25d8af3532` | `15827 / 8960 / 0 / 1289 / 744` | `1 / unknown` |

输出文件与 JSONL 中最后一个 `agent_message` 的文本逐字一致（按当前 artifact 检查；无额外内容改写）。

按臂合计：old `input 82738 / cached 35840 / cache_write 0 / output 6412 / reasoning 2759`；new `input 83473 / cached 32768 / cache_write 0 / output 6917 / reasoning 3481`。十臂合计：`input 166211 / cached 68608 / cache_write 0 / output 13329 / reasoning 6240`。这些是运行成本观测，不是通过阈值或语义评分。

## stderr 与 MCP 初始化边界

十个正式臂各有一个非空 stderr sidecar，均出现一次 Cloudflare MCP `AuthRequired` worker warning；stderr 内容为 `rmcp::transport::worker ... Transport channel closed ... AuthRequired(...)`，资源元数据指向 `https://mcp.cloudflare.com/.well-known/oauth-protected-resource/mcp`。每个 stderr 的字节数为 291，但时间戳不同，因此 hash 不同。

可见 JSONL 中没有 MCP/tool item；这只说明未观测到工具事件，不能推出完整工具环境、system prompt、权限或其他初始化完全相同。该 warning 降低 runtime identity 的可核验性；本报告不把它解释成语义失败或语义胜负。

## 失败 sandbox 尝试与正式样本分离

`failed-sandbox-attempt/` 中只保存 B、C、D、E 的 old/new 共八个尝试：每个 JSONL 为 0 字节，八个 stderr 均为 199 字节、SHA-256 为 `2d8b902fb51c4fb0108c58a40b037f3ed52641f00cdae67901d7cbda9b4b8473`。stderr 明确为：

```text
WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted (os error 1)
Error: failed to initialize in-process app-server client: Operation not permitted (os error 1)
```

这些尝试没有 output、没有事件、没有 `turn.completed`，不计入正式行为样本、usage 合计或 old/new 语义比较。正式样本是 `runs/planning-inbox-round-3/{A..E}-{old|new}.md` 与 `logs/` 下的十个有 `turn.completed` 的 artifact；不能把失败尝试与正式样本混合，也不能用失败尝试证明正式样本的 served model 或隔离事实。

## 机械结论与证据上限

- 已核验：十个正式 output、events、stderr 均非空；十个 JSONL 均有一个 `turn.completed`；可见 item 全是 `agent_message`，无可见工具事件；输入、输出、events、stderr hash 均已记录；round3 runner 请求值为 `gpt-5.6-luna`；失败 sandbox 尝试已单独归档。
- 保持 unknown：实际 served model、完整 system/developer prompt、直接 exit code、完整 runtime/harness/权限、实际 candidate activation、fresh-context 和物理文件系统隔离。
- 证据上限：本报告支持“round3 正式运行产物在上述字节、事件和 usage 层面可重建到该程度”；不支持 matched-improvement、行为改善、skill 接受、adopt/retain 或任何 planning-inbox 语义结论。
