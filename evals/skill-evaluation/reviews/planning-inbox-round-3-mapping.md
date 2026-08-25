# planning-inbox round 3：盲评映射揭示

本映射在 A–C 与 D–E 两份盲评完成后揭示。盲评者按任务边界没有读取 snapshot、run、log、
script 或映射；X/Y 仅用于抵消固定位置偏差。

| item | Output X | Output Y | 盲评选择 | 揭示后的选择 |
|---|---|---|---|---|
| A | new | old | Y 略优 | old 略优 |
| B | old | new | 打平 | 打平 |
| C | new | old | 打平 | 打平 |
| D | old | new | Y 小幅胜出 | new 小幅胜出 |
| E | new | old | 打平 | 打平 |

两臂总计为 old 一项略优、new 一项略优、三项打平；A–E 的 old/new 均未被盲评判为低于
semantic floor。该映射只重连 arm 身份，不授予 retain、rollback、matched-improvement 或
接受结论。

盲评输入 hash：

- A `433f42d2c364121f6757921546526abb889814025d086ef96a9dc4368e6098a1`
- B `c8df06cfeea6ee55b3a7aa442203e08a9f2d00a9a439bae64dcd6f697517efd4`
- C `0c62c2a8eb0c709ca8f393420425694e732ff2534d8cf9986c9cbacbf05ac5d4`
- D `515531f621b77934604a7042769d0d0b9d12f23b476ae11b913db663b0b27ee9`
- E `d132b4f3979dee442313a70c8b72dde7021c54a59afca8927fb230a6e8e15124`
