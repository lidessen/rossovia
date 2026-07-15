/**
 * Runs bounded asynchronous work while retaining input order in the result.
 * Completion order is deliberately not part of the caller-visible meaning.
 */
export async function mapConcurrent<T, R>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer");
  }
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      results[index] = await operation(values[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
