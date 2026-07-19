import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(siteRoot, '..');
const generatedRoot = path.join(siteRoot, 'src/content/docs');
const generatedDataRoot = path.join(siteRoot, 'src/data');
const manifest = JSON.parse(
  await readFile(path.join(siteRoot, 'content-manifest.json'), 'utf8'),
);
const sourceRef =
  process.env.SOURCE_REF ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  manifest.repository.ref;
const editRef = process.env.SOURCE_EDIT_REF ?? manifest.repository.ref;

const sourcePages = new Map(
  manifest.pages
    .filter((page) => page.kind === 'source')
    .map((page) => [page.source, page]),
);
const sourceRoutes = new Map(
  [...sourcePages.values()]
    .filter((page) => page.route)
    .map((page) => [page.source, page.route]),
);

function githubUrl(sourcePath) {
  return `${manifest.repository.url}/blob/${sourceRef}/${sourcePath}`;
}

function githubEditUrl(sourcePath) {
  return `${manifest.repository.url}/edit/${editRef}/${sourcePath}`;
}

function repositorySpecifier() {
  return new URL(manifest.repository.url).pathname
    .replace(/^\//, '')
    .replace(/\.git$/, '');
}

function rewriteRelativeUrl(url, sourcePath) {
  if (
    !url ||
    url.startsWith('#') ||
    url.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:/i.test(url)
  ) {
    return url;
  }

  const match = url.match(/^([^?#]*)([?#].*)?$/);
  const target = match?.[1] ?? url;
  const suffix = match?.[2] ?? '';
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(sourcePath), target),
  );
  const projectedRoute = sourceRoutes.get(resolved);

  return projectedRoute ? `${projectedRoute}${suffix}` : `${githubUrl(resolved)}${suffix}`;
}

async function projectMarkdown(content, sourcePath) {
  const tree = unified().use(remarkParse).parse(content);
  visit(tree, ['link', 'image'], (node) => {
    node.url = rewriteRelativeUrl(node.url, sourcePath);
  });
  return unified()
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      listItemIndent: 'one',
    })
    .stringify(tree);
}

function removeLeadingTitle(content) {
  return content.replace(/^#\s+[^\n]+\n+/, '');
}

function nodeText(node) {
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(nodeText).join('');
}

function markdownSections(content) {
  const tree = unified().use(remarkParse).parse(content);
  const sections = new Map();
  let currentSection = null;

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) {
      currentSection = nodeText(node).trim();
      sections.set(currentSection, []);
      continue;
    }
    if (currentSection) sections.get(currentSection).push(node);
  }

  return sections;
}

function stringifyNodes(nodes) {
  return unified()
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      listItemIndent: 'one',
    })
    .stringify({ type: 'root', children: nodes })
    .trim();
}

function selectSection(sections, headings, { required = false, sourcePath } = {}) {
  for (const heading of headings) {
    const nodes = sections.get(heading);
    if (nodes?.length) return { heading, content: stringifyNodes(nodes) };
  }
  if (required) {
    throw new Error(
      `Skill guide requires one of [${headings.join(', ')}]: ${sourcePath}`,
    );
  }
  return null;
}

function renderGuidePart(title, selection, level = 2) {
  if (!selection) return '';
  return `${'#'.repeat(level)} ${title}\n\n${selection.content}\n\n`;
}

async function renderSkillGuide(page, parsed) {
  const sections = markdownSections(parsed.content);
  const sourceUrl = githubUrl(page.source);
  const section = (headings, required = false) =>
    selectSection(sections, headings, { required, sourcePath: page.source });
  const userInteraction = section(['User interaction']);
  const start = section(['Start', 'Starting point', 'Entry']);
  const dispatch = section(['Dispatch', 'Operations', 'Commands']);
  const vocabulary = section(['Domain vocabulary', 'Vocabulary']);
  const sourceDeclaresBoundaries = [...sections.keys()].some((heading) =>
    /\b(boundary|boundaries|ownership)\b/i.test(heading),
  );
  const boundaries = section([
    'Boundaries',
    'Boundaries and routing',
    'Operating boundaries',
    'Ownership boundaries',
    'Ownership and routing',
    'Ownership and non-scope',
  ], sourceDeclaresBoundaries);
  const agentUse = [
    renderGuidePart('启动信息', start, 3),
    renderGuidePart('调度入口', dispatch, 3),
  ].join('');
  const boundaryBody = [
    renderGuidePart('职责与边界', boundaries, 3),
    renderGuidePart('术语', vocabulary, 3),
    renderGuidePart(
      '完成标准',
      section(['Completion standard', 'Acceptance', 'Readiness'], true),
      3,
    ),
  ].join('');
  const interactionBody = userInteraction
    ? userInteraction.content
    : '安装后直接向 agent 描述目标；只有在需要强制选择时才显式点名 skill 或内部 operation。';
  const readerBody = `> **源文件边界**
>
> 本页为人类读者重排 [\`${page.source}\`](${sourceUrl}) 中的关键判断，不替代可安装的完整 prompt；事实、修改权和未展示的运行说明仍属于源文件。

## 安装与日常使用

\`\`\`bash
npx skills add ${repositorySpecifier()} --skill ${parsed.data.name}
\`\`\`

${interactionBody}

## 它负责的判断

${section(['Scope'], true).content}

## 原则脉络

${section(['Principle expression'], true).content}

## 如何工作

${section(['Core method', 'Method'], true).content}

${agentUse ? `## 交给 Agent 使用\n\n${agentUse}` : ''}

## 边界与完成

${boundaryBody}

## 阅读完整技能

本页有意省略 prompt 的内部装配说明。需要安装、审查或修改这个技能时，请回到 [完整源文件](${sourceUrl})。
`;
  const projectedBody = await projectMarkdown(readerBody, page.source);
  const output = matter.stringify(projectedBody, {
    title: page.title ?? parsed.data.title ?? parsed.data.name,
    description: page.description ?? parsed.data.description,
    editUrl: githubEditUrl(page.source),
    source: sourceUrl,
    head: [
      {
        tag: 'meta',
        attrs: { name: 'skills-presentation', content: page.presentation },
      },
    ],
    hero: {
      title: page.title ?? parsed.data.title ?? parsed.data.name,
      tagline: page.description ?? parsed.data.description,
      actions: [
        { text: '安装与使用', link: '#安装与日常使用', variant: 'primary' },
        { text: '查看源文件', link: sourceUrl, variant: 'minimal' },
        { text: '返回技能目录', link: '/docs/skills/', variant: 'minimal' },
      ],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 3,
    },
  });

  await writeGenerated(page.output, output);
}

async function writeGenerated(relativePath, content) {
  const destination = path.join(generatedRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, 'utf8');
}

async function renderPage(page) {
  const absoluteSource = path.join(repositoryRoot, page.source);
  const raw = await readFile(absoluteSource, 'utf8');

  if (page.kind === 'local') {
    const localPage = matter(raw);
    if (localPage.data.editUrl !== false) {
      localPage.data.editUrl = githubEditUrl(page.source);
    }
    await writeGenerated(
      page.output,
      matter.stringify(localPage.content, localPage.data),
    );
    return;
  }

  const parsed = matter(raw);
  const title = page.title ?? parsed.data.title ?? parsed.data.name;
  if (!title) {
    throw new Error(`Projected page has no title: ${page.source}`);
  }

  if (page.presentation === 'skill-guide') {
    await renderSkillGuide(page, parsed);
    return;
  }

  const projectedBody = await projectMarkdown(
    removeLeadingTitle(parsed.content),
    page.source,
  );
  const sourceNote = `> 这是 [\`${page.source}\`](${githubUrl(page.source)}) 的只读构建投影；源文件仍拥有事实与修改权。`;
  const output = matter.stringify(`${sourceNote}\n\n${projectedBody}`, {
    title,
    description: page.description ?? parsed.data.description,
    editUrl: githubEditUrl(page.source),
    source: githubUrl(page.source),
  });

  await writeGenerated(page.output, output);
}

async function readSkill(sourcePath) {
  const raw = await readFile(path.join(repositoryRoot, sourcePath), 'utf8');
  const parsed = matter(raw);
  if (typeof parsed.data.name !== 'string' || typeof parsed.data.description !== 'string') {
    throw new Error(`Skill frontmatter is incomplete: ${sourcePath}`);
  }

  return {
    name: parsed.data.name,
    description: parsed.data.description.trim().replace(/\s+/g, ' '),
    sourcePath,
    sourceUrl: githubUrl(sourcePath),
    publicPath: sourceRoutes.get(sourcePath) ?? null,
  };
}

function renderCatalog(skills) {
  const entries = skills
    .map((skill, index) => {
      const destination = skill.publicPath ?? skill.sourceUrl;
      const presentation = sourcePages.get(skill.sourcePath)?.presentation;
      const label = skill.publicPath
        ? presentation === 'skill-guide'
          ? '阅读指南'
          : '阅读投影'
        : '查看源文件';
      return `## ${String(index + 1).padStart(2, '0')} · ${skill.name}\n\n${skill.description}\n\n[${label}](${destination}) · [GitHub 源文件](${skill.sourceUrl})`;
    })
    .join('\n\n---\n\n');

  return `---
title: 技能目录
description: 当前可安装的方法，以及每种方法负责的判断。
editUrl: ${githubEditUrl('site/content-manifest.json')}
sidebar:
  order: 2
---

这里列出的技能来自检查入库的活动清单，并在构建时读取各自的结构化 frontmatter。目录帮助选择方法，不改变技能本身。

${entries}
`;
}

await rm(generatedRoot, { recursive: true, force: true });
await mkdir(generatedRoot, { recursive: true });

for (const page of manifest.pages) {
  await renderPage(page);
}

const skills = await Promise.all(manifest.catalog.skills.map(readSkill));
await writeGenerated(manifest.catalog.output, renderCatalog(skills));
await mkdir(generatedDataRoot, { recursive: true });
await writeFile(
  path.join(generatedDataRoot, 'skills.json'),
  `${JSON.stringify(skills, null, 2)}\n`,
  'utf8',
);

console.log(`Projected ${manifest.pages.length + 1} pages and ${skills.length} skills.`);
