# Backend fingerprint capture probe

**Date:** 2026-08-04

**Status:** provider-metadata path verified; model revision unverified

After the evaluation runs exposed that AI SDK omits response bodies from step
records by default, the DeepSeek provider middleware was changed to project the
top-level `system_fingerprint` into
`providerMetadata.deepseek.systemFingerprint`. A minimal official
`deepseek-v4-flash` call through `createDeepSeekModel` and AI SDK `generateText`
then returned the following. A second 11-token `streamText` call retained the
same fingerprint through the streaming finish metadata.

```json
{
  "modelId": "deepseek-v4-flash",
  "systemFingerprint": "fp_a18b46594c_prod0820_fp8_kvcache_20260402",
  "usage": {
    "inputTokens": 9,
    "outputTokens": 2,
    "totalTokens": 11
  }
}
```

The probes verify the acquisition and provider-metadata projection path for
both non-streaming and streaming calls. Deterministic tests additionally cover
removal of streaming raw chunks after projection and model-evaluation
aggregation from the exact provider metadata field. The fingerprint remains
opaque serving evidence and is not a mapping to `DeepSeek-V4-Flash-0731`.
