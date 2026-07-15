import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { WikisourceSeedRetriever } from "../src/research/wikisource-seed-retriever";

test("runtime title retrieval preserves a source URL, locator, excerpt digest, and no catalog text", async () => {
  const calls: URL[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push(url);
    const action = url.searchParams.get("action");
    if (action === "query" && url.searchParams.get("list") === "search") {
      return json({ query: { search: [{ title: "莊子" }] } });
    }
    if (action === "parse") {
      return json({ parse: { links: [
        { ns: 0, title: "莊子/逍遙遊" },
        { ns: 0, title: "莊子/養生主" },
        { ns: 1, title: "Talk:莊子" },
      ] } });
    }
    if (action === "query" && url.searchParams.get("prop") === "extracts|info") {
      const title = url.searchParams.get("titles")!;
      const extract = `${title}。${"水行其间，器随用而变。".repeat(80)}`;
      return json({ query: { pages: [{
        title,
        extract,
        fullurl: `https://zh.wikisource.org/wiki/${encodeURIComponent(title)}`,
      }] } });
    }
    return new Response("unexpected request", { status: 500 });
  }) as typeof fetch;
  const retriever = new WikisourceSeedRetriever({ fetchImpl, excerptChars: 240, concurrency: 1, minIntervalMs: 0 });

  const evidence = await retriever.retrieve({
    entry: { id: "zhuangzi", title: "《庄子》" },
    randomSeed: "fixed-retrieval-seed",
  });

  expect(calls).toHaveLength(3);
  expect(evidence.titleId).toBe("zhuangzi");
  expect(["莊子/逍遙遊", "莊子/養生主"]).toContain(evidence.locator);
  expect(evidence.sourceUrl).toStartWith("https://zh.wikisource.org/wiki/");
  expect(evidence.excerpt.length).toBeGreaterThan(0);
  expect(evidence.sha256).toBe(createHash("sha256").update(evidence.excerpt).digest("hex"));
  expect(Object.keys(evidence).sort()).toEqual(["excerpt", "locator", "provider", "sha256", "sourceUrl", "titleId"]);
});

test("collection retrieval follows table-of-contents links instead of header navigation", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.searchParams.get("list") === "search") return json({ query: { search: [{ title: "吶喊" }] } });
    if (url.searchParams.get("action") === "parse") {
      return json({ parse: {
        links: [
          { ns: 0, title: "墳" },
          { ns: 0, title: "野草" },
          { ns: 0, title: "狂人日記" },
          { ns: 0, title: "孔乙己" },
        ],
        wikitext: "{{header|previous=[[墳]]|next=[[野草]]}}\n<div class=\"ws-summary\">*[[狂人日記]]\n*[[孔乙己]]</div>",
      } });
    }
    const title = url.searchParams.get("titles")!;
    return json({ query: { pages: [{
      title,
      extract: `${title}的正文材料。`.repeat(60),
      fullurl: `https://zh.wikisource.org/wiki/${encodeURIComponent(title)}`,
    }] } });
  }) as typeof fetch;
  const retriever = new WikisourceSeedRetriever({ fetchImpl, excerptChars: 240, minIntervalMs: 0 });

  const evidence = await retriever.retrieve({
    entry: { id: "call-to-arms", title: "《呐喊》" },
    randomSeed: "collection-seed",
  });

  expect(["狂人日記", "孔乙己"]).toContain(evidence.locator);
  expect(["墳", "野草"]).not.toContain(evidence.locator);
});

test("collection retrieval falls back to a readable root after transclusion-only contents", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.searchParams.get("list") === "search") return json({ query: { search: [{ title: "野艸" }] } });
    if (url.searchParams.get("action") === "parse") {
      const links = Array.from({ length: 9 }, (_, index) => ({ ns: 0, title: `篇目${index + 1}` }));
      return json({ parse: {
        links,
        wikitext: `<div class="ws-summary">${links.map((entry) => `*[[${entry.title}]]`).join("\n")}</div>`,
      } });
    }
    const title = url.searchParams.get("titles")!;
    return json({ query: { pages: [{
      title,
      extract: title === "野艸" ? "总页中保留的可读正文材料。".repeat(30) : "",
      fullurl: `https://zh.wikisource.org/wiki/${encodeURIComponent(title)}`,
    }] } });
  }) as typeof fetch;
  const retriever = new WikisourceSeedRetriever({ fetchImpl, excerptChars: 240, minIntervalMs: 0 });

  const evidence = await retriever.retrieve({
    entry: { id: "wild-grass", title: "《野草》" },
    randomSeed: "root-fallback-seed",
  });

  expect(evidence.locator).toBe("野艸");
  expect(evidence.excerpt).toContain("总页中保留的可读正文材料");
});

test("collection retrieval does not abandon a later readable table-of-contents entry", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.searchParams.get("list") === "search") return json({ query: { search: [{ title: "吶喊" }] } });
    if (url.searchParams.get("action") === "parse") {
      const links = Array.from({ length: 9 }, (_, index) => ({ ns: 0, title: `篇目${index + 1}` }));
      return json({ parse: {
        links,
        wikitext: `<div class="ws-summary">${links.map((entry) => `*[[${entry.title}]]`).join("\n")}</div>`,
      } });
    }
    const title = url.searchParams.get("titles")!;
    return json({ query: { pages: [{
      title,
      extract: title === "篇目9" ? "目录后部真正可读的正文材料。".repeat(30) : "",
      fullurl: `https://zh.wikisource.org/wiki/${encodeURIComponent(title)}`,
    }] } });
  }) as typeof fetch;
  const retriever = new WikisourceSeedRetriever({ fetchImpl, excerptChars: 240, minIntervalMs: 0 });

  const evidence = await retriever.retrieve({
    entry: { id: "call-to-arms", title: "《呐喊》" },
    randomSeed: "late-readable-entry-seed",
  });

  expect(evidence.locator).toBe("篇目9");
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
}
