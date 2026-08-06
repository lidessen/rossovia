function stats(values) {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    mean: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function summarizeEvidence(records) {
  const passed = records.reduce((total, record) => total + (record.score?.passed ?? 0), 0);
  const questions = records.reduce((total, record) => total + (record.score?.total ?? 0), 0);
  const failures = {};
  for (const record of records) {
    for (const result of record.score?.results ?? []) {
      if (!result.pass) failures[result.id] = (failures[result.id] ?? 0) + 1;
    }
  }

  const costs = records.flatMap((record) => Number.isFinite(record.usage?.cost) ? [record.usage.cost] : []);
  const tokens = records.reduce((totals, record) => {
    const usage = record.usage?.tokens ?? {};
    for (const key of ["total", "input", "output", "reasoning"]) {
      totals[key] += usage[key] ?? 0;
    }
    totals.cacheWrite += usage.cache?.write ?? 0;
    totals.cacheRead += usage.cache?.read ?? 0;
    return totals;
  }, { total: 0, input: 0, output: 0, reasoning: 0, cacheWrite: 0, cacheRead: 0 });

  return {
    trials: records.length,
    passed,
    questions,
    accuracy: questions === 0 ? null : passed / questions,
    failures,
    latencyMs: stats(records.map((record) => record.durationMs)),
    observedCost: costs.length === 0 ? null : { total: costs.reduce((sum, value) => sum + value, 0), ...stats(costs) },
    tokens,
    inputBytes: Object.fromEntries(records.map((record) => [record.tier, (record.input ?? record.image)?.bytes])),
    parseFailures: records.filter((record) => !record.score).length,
  };
}
