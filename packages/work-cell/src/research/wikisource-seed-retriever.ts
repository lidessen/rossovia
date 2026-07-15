/** Research-only retrieval adapter; titles are manifests, not embedded source text. */
import { createHash } from "node:crypto";
import { z } from "zod";
import type { SeedEvidence, SeedMaterialRetriever } from "./candidate-field";

const SearchResponseSchema = z.object({
  query: z.object({
    search: z.array(z.object({ title: z.string().min(1) })),
  }),
});

const LinksResponseSchema = z.object({
  parse: z.object({
    links: z.array(z.object({ ns: z.number().int(), title: z.string().min(1) })),
    wikitext: z.string().optional().default(""),
  }),
});

const ExtractResponseSchema = z.object({
  query: z.object({
    pages: z.array(z.object({
      title: z.string().min(1),
      extract: z.string().optional(),
      fullurl: z.string().url().optional(),
      missing: z.boolean().optional(),
    })),
  }),
});

export interface WikisourceSeedRetrieverOptions {
  endpoint?: string;
  excerptChars?: number;
  timeoutMs?: number;
  concurrency?: number;
  minIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

interface WorkIndex {
  root: string;
  pages: string[];
}

interface SourcePage {
  title: string;
  extract: string;
  fullurl: string;
}

export class WikisourceSeedRetriever implements SeedMaterialRetriever {
  readonly descriptor = { provider: "zh-wikisource-action-api" };
  private readonly endpoint: string;
  private readonly excerptChars: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: RequestLimiter;
  private readonly workCache = new Map<string, Promise<WorkIndex>>();
  private readonly pageCache = new Map<string, Promise<SourcePage | undefined>>();

  constructor(options: WikisourceSeedRetrieverOptions = {}) {
    this.endpoint = options.endpoint ?? "https://zh.wikisource.org/w/api.php";
    this.excerptChars = boundedInteger(options.excerptChars ?? 800, 200, 2_000, "excerptChars");
    this.timeoutMs = boundedInteger(options.timeoutMs ?? 15_000, 1_000, 60_000, "timeoutMs");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.limiter = new RequestLimiter(
      boundedInteger(options.concurrency ?? 1, 1, 3, "concurrency"),
      boundedInteger(options.minIntervalMs ?? 350, 0, 5_000, "minIntervalMs"),
    );
  }

  async retrieve(
    request: Parameters<SeedMaterialRetriever["retrieve"]>[0],
    signal?: AbortSignal,
  ): Promise<SeedEvidence> {
    const index = await this.workIndex(request.entry.title, signal);
    const pages = [...new Set([
      ...seededOrder(index.pages, `${request.randomSeed}:pages`).slice(0, 32),
      index.root,
    ])];
    let selected: SourcePage | undefined;
    for (const pageTitle of pages) {
      selected = await this.sourcePage(pageTitle, signal);
      if (selected && selected.extract.trim().length >= 40) break;
    }
    if (!selected || selected.extract.trim().length < 40) throw new Error(`Wikisource returned no readable text for ${request.entry.title}`);
    const excerpt = excerptWindow(selected.extract, this.excerptChars, `${request.randomSeed}:${selected.title}`);
    return {
      titleId: request.entry.id,
      provider: this.descriptor.provider,
      locator: selected.title,
      sourceUrl: selected.fullurl,
      excerpt,
      sha256: createHash("sha256").update(excerpt).digest("hex"),
    };
  }

  private workIndex(title: string, signal?: AbortSignal): Promise<WorkIndex> {
    const cached = this.workCache.get(title);
    if (cached) return cached;
    const pending = this.loadWorkIndex(title, signal);
    this.workCache.set(title, pending);
    pending.catch(() => this.workCache.delete(title));
    return pending;
  }

  private async loadWorkIndex(title: string, signal?: AbortSignal): Promise<WorkIndex> {
    const query = title.replace(/[《》“”]/gu, "").trim();
    let search = await this.search(query, true, signal);
    if (search.length === 0) search = await this.search(query, false, signal);
    const root = search[0];
    if (!root) throw new Error(`Wikisource has no title match for ${title}`);
    const links = LinksResponseSchema.parse(await this.api({
      action: "parse",
      page: root,
      prop: "links|wikitext",
    }, signal));
    const mainLinks = links.parse.links
      .filter((entry) => entry.ns === 0)
      .map((entry) => entry.title);
    const subpages = mainLinks.filter((entry) => entry.startsWith(`${root}/`));
    const contents = summaryLinks(links.parse.wikitext);
    return { root, pages: [...new Set(subpages.length > 0 ? subpages : contents.length > 0 ? contents : [root])] };
  }

  private async search(query: string, exactPhrase: boolean, signal?: AbortSignal): Promise<string[]> {
    const response = SearchResponseSchema.parse(await this.api({
      action: "query",
      list: "search",
      srsearch: exactPhrase ? `intitle:"${query}"` : `intitle:${query}`,
      srnamespace: "0",
      srlimit: "8",
      srprop: "titlesnippet",
    }, signal));
    return response.query.search.map((entry) => entry.title);
  }

  private sourcePage(title: string, signal?: AbortSignal): Promise<SourcePage | undefined> {
    const cached = this.pageCache.get(title);
    if (cached) return cached;
    const pending = this.loadSourcePage(title, signal);
    this.pageCache.set(title, pending);
    pending.catch(() => this.pageCache.delete(title));
    return pending;
  }

  private async loadSourcePage(title: string, signal?: AbortSignal): Promise<SourcePage | undefined> {
    const response = ExtractResponseSchema.parse(await this.api({
      action: "query",
      prop: "extracts|info",
      titles: title,
      explaintext: "1",
      exchars: "8000",
      inprop: "url",
      redirects: "1",
    }, signal));
    const page = response.query.pages[0];
    if (!page || page.missing || !page.extract?.trim() || !page.fullurl) return undefined;
    return { title: page.title, extract: page.extract, fullurl: page.fullurl };
  }

  private api(parameters: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
    return this.requestWithRetry(parameters, signal);
  }

  private async requestWithRetry(parameters: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.limiter.run(async () => {
        const url = new URL(this.endpoint);
        for (const [key, value] of Object.entries({
          ...parameters,
          format: "json",
          formatversion: "2",
          maxlag: "5",
        })) {
          url.searchParams.set(key, value);
        }
        const timeout = AbortSignal.timeout(this.timeoutMs);
        return this.fetchImpl(url, {
          headers: {
            "User-Agent": "lidessen-work-cell/0.1 (https://github.com/lidessen/skills; experimental title retrieval)",
          },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
      });
      const responseText = await response.text();
      let body: unknown;
      try {
        body = JSON.parse(responseText) as unknown;
      } catch {
        body = { nonJsonBody: responseText.slice(0, 500) };
      }
      const apiError = body && typeof body === "object" && "error" in body
        ? (body as { error?: { code?: unknown } }).error
        : undefined;
      const retryable = response.status === 429 || response.status === 503 || apiError?.code === "maxlag";
      if (!retryable) {
        if (!response.ok) throw new Error(`Wikisource API ${response.status} for ${parameters.action}`);
        return body;
      }
      const delayMs = retryDelayMs(response.headers.get("retry-after"), attempt);
      if (delayMs > 30_000) {
        throw new Error(`Wikisource API asked this client to retry after ${Math.ceil(delayMs / 1_000)} seconds`);
      }
      if (attempt === 2) throw new Error(`Wikisource API remained rate-limited for ${parameters.action}`);
      await delay(delayMs, signal);
    }
    throw new Error(`Wikisource API retry loop ended unexpectedly for ${parameters.action}`);
  }
}

function seededOrder(values: string[], seed: string): string[] {
  return [...values].sort((left, right) => rank(seed, left).localeCompare(rank(seed, right)));
}

function summaryLinks(wikitext: string): string[] {
  const marker = '<div class="ws-summary">';
  const start = wikitext.indexOf(marker);
  if (start < 0) return [];
  const end = wikitext.indexOf("</div>", start + marker.length);
  if (end < 0) return [];
  const summary = wikitext.slice(start + marker.length, end);
  const links: string[] = [];
  let cursor = 0;
  while (cursor < summary.length) {
    const open = summary.indexOf("[[", cursor);
    if (open < 0) break;
    const close = summary.indexOf("]]", open + 2);
    if (close < 0) break;
    const raw = summary.slice(open + 2, close).split("|", 1)[0]!.trim();
    const target = raw.split("#", 1)[0]!.trim();
    if (target && !target.startsWith("#") && !target.includes(":")) links.push(target);
    cursor = close + 2;
  }
  return [...new Set(links)];
}

function rank(seed: string, value: string): string {
  return createHash("sha256").update(`${seed}:${value}`).digest("hex");
}

function excerptWindow(text: string, maxChars: number, seed: string): string {
  const normalized = text.replace(/\r/gu, "").replace(/[ \t]+/gu, " ").replace(/\n{3,}/gu, "\n\n").trim();
  if (normalized.length <= maxChars) return normalized;
  const available = normalized.length - maxChars;
  const offset = Number.parseInt(rank(seed, "offset").slice(0, 8), 16) % (available + 1);
  const priorBoundary = Math.max(
    normalized.lastIndexOf("。", offset),
    normalized.lastIndexOf("！", offset),
    normalized.lastIndexOf("？", offset),
    normalized.lastIndexOf("\n", offset),
  );
  const start = priorBoundary >= Math.max(0, offset - 120) ? priorBoundary + 1 : offset;
  const provisionalEnd = Math.min(normalized.length, start + maxChars);
  const nextBoundaries = ["。", "！", "？", "\n"]
    .map((mark) => normalized.indexOf(mark, provisionalEnd - 80))
    .filter((position) => position >= provisionalEnd - 80 && position <= provisionalEnd + 120);
  const end = nextBoundaries.length > 0 ? Math.min(...nextBoundaries) + 1 : provisionalEnd;
  return normalized.slice(start, Math.min(end, normalized.length)).trim();
}

function boundedInteger(value: number, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

class RequestLimiter {
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private nextStartAt = 0;

  constructor(
    private readonly limit: number,
    private readonly minIntervalMs: number,
  ) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
    try {
      const waitMs = Math.max(0, this.nextStartAt - Date.now());
      if (waitMs > 0) await delay(waitMs);
      this.nextStartAt = Date.now() + this.minIntervalMs;
      return await operation();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

function retryDelayMs(value: string | null, attempt: number): number {
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 5_000 * (2 ** attempt);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error("aborted"));
    }, { once: true });
  });
}
