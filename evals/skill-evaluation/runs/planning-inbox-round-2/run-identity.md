# planning-inbox round 2：run identity audit

本报告只做机械 identity / 可重建性核对，不做语义评分，不修改任何 run output、JSONL、
stderr、manifest 或 script。所有哈希均为当前文件整文件字节的 SHA-256；本报告不把运行
完成、模型名或输出差异解释成 matched improvement。

## 运行命令身份

- CLI：`codex-cli 0.149.1`（本地 `codex --version` 实测）。
- 请求模型：`gpt-5.6-luna`。
- reasoning：`-c 'model_reasoning_effort="high"'`。
- 共同 flags：`--ephemeral --ignore-user-config --ignore-rules --sandbox read-only
  --skip-git-repo-check --color never --json`。
- 临时工作目录：`/tmp/skills-pi-r2-{A|B|C|D|E}-{baseline|treatment}`；每臂目录均存在。
- B–E：由固定 `scripts/run-planning-inbox-round-2.sh` 执行；该 runner 使用上述命令、对应
  input、独立 `-C` temp dir、独立 `-o` output、JSONL stdout 和 stderr sidecar，并在返回
  成功前检查 output/events 非空以及 JSONL 含 `turn.completed`。
- A：按同参数手动运行；A 的 JSONL 与 output 已保存，但没有单独持久化 stderr sidecar，
  也没有独立保存手动命令 stdout/exit artifact。
- 精确 served model：`unknown`；JSONL 未暴露实际 served model 字段，不能由请求名推断。
- system/developer prompt 精确内容或 hash：`unknown`；JSONL 未提供。runner input 中 treatment
  的固定 wrapper 与候选 snapshot 可由下述输入校验重建，但这不等于完整 system prompt。
- 直接进程 exit code：未作为独立 artifact 保存；B–E 仅能确认 runner 的输出/JSONL 后置条件
  与 `turn.completed` 均满足，A 也有完整 output/JSONL。严格 identity standing 对 exit code
  保持 `unknown`。

## Payload 与 treatment 输入校验

逐项以 Ruby 二进制比较复核：

- 每个 `inputs/{item}-baseline.md` 与对应 `payloads/{item}.md` 完全相同；五项均 `true`。
- 每个 `inputs/{item}-treatment.md` 完全等于固定 wrapper + 当前候选
  `.agents/skills/planning-inbox/SKILL.md` snapshot + `\n# 本轮 runner payload\n\n` +
  对应 payload；五项均 `true`。
- 候选 snapshot SHA-256：
  `b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e`。
- 因此，输入字节层面的 baseline exact 与 treatment 唯一额外 snapshot 关系成立；这不核验
  runner 实际是否只看到了 input、是否有外部 system prompt 差异或是否真的完成一次激活。

## 每臂 identity、usage 与事件

表中 usage 顺序为 `input / cached / cache_write / output / reasoning` tokens；`turn.completed`
均为 `yes`。事件类型除表中 item 数量外，各臂均为：`thread.started×1`、`turn.started×1`、
`turn.completed×1`、`item.completed×N`。所有 JSONL 的 item 都是 `agent_message`，工具调用为
`none`；未发现 `tool_call`、`function_call` 或 MCP tool item。

| arm | thread id | input SHA-256 | output SHA-256 | events JSONL SHA-256 | stderr SHA-256 | usage | item.completed / exit |
|---|---|---|---|---|---|---|---|
| A baseline | `01a0364f-0ade-7802-87ef-e8e9c37979ee` | `d920d43f4a7c3562d9de1583793ea48891c3ccf97d8ca149e169d63d6b863078` | `fe387bddc86a57240e4f53efbec624ab0b6da50afbf670f75ddb5e0d93c9fc4c` | `6f1d12d0e34d762085e58330899c3821c6c47fc71bae80d266ab9fff9dbbcfff` | `unknown（stderr 未单独持久化）` | `17669 / 8960 / 0 / 1342 / 397` | `1 / direct exit unknown` |
| A treatment | `01a03667-8f7d-7283-9b4b-3f29d2cc4342` | `98dbde31a965bc8be39ffdf97ab6e5ae2eccc75b84cd7252fd11d5ad62000af0` | `73f105aa9dcc28e2b0d208792e288dee6458ccf6418cd41283e2d464e2a3ca6a` | `aa16146be256544ddf9fd11313af950d3b79402e1aebc3ac9d49c052cf9961bf` | `unknown（stderr 未单独持久化）` | `20161 / 5888 / 0 / 2733 / 561` | `2 / direct exit unknown` |
| B baseline | `01a03679-5ec8-7073-8ed3-96fb6a75f038` | `9a60494a01b5f0a0d3aba64eb956096a43e69f920dda19bb04590ad9a16768b4` | `9f8c2ce27efc8f98174bb3f5485795f4c544d63aa83ac355c190df7deac1f04e` | `2257da0387a9e7fea302cc969b50d484f99176e0d5ba25a4cbf214902869c431` | `b401188a115bb4f6aacaf6c72d9fa80e0a110a05eca62b27eae25c4d0dd5afdf` | `13024 / 5888 / 0 / 89 / 48` | `1 / runner gate passed, direct exit not persisted` |
| B treatment | `01a03679-5ec8-7873-ab24-5e28fc89eb72` | `59e144144e8ba89e7dc16675888dec2f912e7aa9161e2ff4ac0d6301c5b710bc` | `5598c284f8e533d9d47541c2bad79079171bee3a9ccb9e8632afa2bf2e01a1fc` | `432ffa46231039dada9c2a02d954de1335290a6af513feb5ab42f702d2a5fc97` | `b00c1e358b5ad134b1bcf4067fdc2217a69b621c6ddde5d0eb0789f746d67a47` | `15516 / 8960 / 0 / 421 / 266` | `2 / runner gate passed, direct exit not persisted` |
| C baseline | `01a03679-ba77-79d0-8978-4d8c05a4db37` | `f9574a759a6a42d8c361916c20d04a7905670d1573e658889803752ace936f8b` | `70faf16a78b875b754311f30fae1ca86ad280c827b3ff755197163824562e5f8` | `d8ed92eb0f1cd073492b0d10f48f17b862c1e1db43501b5b0c9f05604e41940a` | `12bf4612638c49b792fd70d0a4441214a4f9f2c6a2549738b76b60467f1f6b10` | `17454 / 8960 / 0 / 569 / 183` | `1 / runner gate passed, direct exit not persisted` |
| C treatment | `01a03679-ba48-7d02-8eb9-4258f82ee610` | `48a76876cd0f6c6b38c20803334e5c44686ef578aa6a5f0d05749c2debe51655` | `eda721ac09f5e7b9ddf77c85845435c876ba8eac46d358f21b1efaab2f9bea66` | `492cce6f227828b64d7444e4de2e62e48d2a4442d5ef3e7ba1ee617c449778d4` | `121d6244a68940075946504dcc78fb63dcd90964c3a40d6dd62e6a41851cc15b` | `19946 / 8960 / 0 / 1436 / 867` | `2 / runner gate passed, direct exit not persisted` |
| D baseline | `01a03679-ba39-70d1-8242-9f0f92c00675` | `37ae8a6e87fc640667022892f0f0f221226cef85fe88c0da599e5071feaef56e` | `a52f590a8e235882bd9a1ecd0fe5e94dbb464f8deb669087d138cd0f48c0e4d6` | `5a312853147d187a1e7c52137c3fdcce2ba8897bc4cce18f4dde7a46f73d992f` | `dabdc202a2fcca136b28fdeabcc74287c3f1a748bb259af33cffd6457476d57c` | `17459 / 8960 / 0 / 985 / 731` | `1 / runner gate passed, direct exit not persisted` |
| D treatment | `01a03679-babe-7772-9b3f-5d285c80fb47` | `1cb81f68650d17720beebe1e1b782f6debeffc66e20306b42b17adae164ca17b` | `4b7ecb09c6e35130f1d8994c74962bc44b8c0b213ac5b92a2559a05088973c91` | `5c644a2b4843253746595e891e1efb619b6d6a55531dc00bb089ffa72717771c` | `930b47fd62f92493025cf1d71ee4e37d65e2f5303ca821479ec4ba1791f53d2f` | `19951 / 8960 / 0 / 881 / 516` | `1 / runner gate passed, direct exit not persisted` |
| E baseline | `01a0367a-555f-7d81-a875-9b1e51bfe4f2` | `13458edde1ccc248ae98ef208722d801489515d52253a2133df019713a59e497` | `673e6e3a0778ebab17ecafe389e5042d21ec6fee96e50f623b9b0d7e2043eeee` | `779507bb5e542499802d6d16f78350a4f805ebb710f6b50c85c11bd62d2e8b74` | `cca430f0b88b6ec7fb03ca50daf4422212bf4679cb4ba5db5617b92a9faddb9f` | `13185 / 8960 / 0 / 607 / 241` | `1 / runner gate passed, direct exit not persisted` |
| E treatment | `01a0367a-555d-7102-af17-94a51b0dc05d` | `ef719bbf62f1d565d52f969a816da81e3134dd6343eb6873d68b8936ad6f007c` | `83ae04266afd98890afc452ad8b71368fa3f8fb641eaee7ce40b95872dd39f98` | `4f39dcf03803efc5c53183f6846e1943c3ecdab162cd4caaf98dbae00818281c` | `96947f10a419e35868f0f4ab820230c1b7ab38d3951e1a6663420d1049c26215` | `15677 / 0 / 0 / 1054 / 516` | `1 / runner gate passed, direct exit not persisted` |

机械完整性补充：每个 output 文件均等于 JSONL 中最后一个 `agent_message` 的文本去掉末尾
换行；这解释了 output 与事件文本的字节长度差异，不是内容改写证据。

## Cloudflare MCP AuthRequired 警告

B–E 的 baseline/treatment stderr 各出现一条相同形式的 Cloudflare MCP 警告，内容为
`rmcp::transport::worker ... AuthRequired(AuthRequiredError { www_authenticate_header:
Bearer realm="OAuth", resource_metadata="https://mcp.cloudflare.com/.well-known/oauth-protected-resource/mcp" })`。
每一对的 warning 时间接近且 stderr hash 已在表中记录；A 没有 stderr sidecar，不能证明其
没有同类初始化警告。

影响边界：十个 JSONL 都没有 MCP/tool item，只有 `agent_message`，因此从可见事件看没有
任务工具调用，也没有证据表明该 warning 直接改变了文字输出。另一方面，AuthRequired 表明
某个 MCP worker 初始化/传输通道未完成认证；由于 A 未保存 stderr、system prompt/完整
runtime 初始化也未核验，不能把“无工具调用”升级为工具环境完全相同、没有隐藏初始化差异
或 matched。该 warning 只降低 identity/runtime 可核验性，不构成语义评分。

## 结论与 standing

- manifest 中的 `frozen / not run` 是冻结时的 pre-run 状态；本报告不回写该字段，也不把它
  当作当前运行结果。当前 run artifact 的存在仅由本报告机械记录。
- 机械：五项 baseline payload exact；五项 treatment 均为固定 wrapper + candidate snapshot +
  payload；每臂都有 JSONL、非空 output 和 `turn.completed`；可见 item 全为 agent message，
  未见工具调用。
- 未核实：精确 served model、system/developer prompt、直接 exit code、A stderr、实际
  runner 可见边界、完整 harness/权限/隔离与候选激活事实。
- 证据上限：本报告只支持“运行产物在上述字节和事件层面可重建到该程度”。不支持
  `matched-improvement`、行为改善、`adopt` 或任何 planning-inbox 语义结论。
