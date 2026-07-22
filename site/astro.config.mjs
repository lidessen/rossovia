import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';

const publicSite = process.env.SITE_URL ?? 'https://rossovia.dev';
const contentManifest = JSON.parse(
  readFileSync(new URL('./content-manifest.json', import.meta.url), 'utf8'),
);
const skillGuideItems = contentManifest.pages
  .filter((page) => page.presentation === 'skill-guide' && page.route)
  .map((page) => ({
    label: page.title,
    slug: page.route.replace(/^\//, '').replace(/\/$/, ''),
  }));

export default defineConfig({
  site: publicSite,
  output: 'static',
  integrations: [
    starlight({
      disable404Route: true,
      title: 'Rossovia',
      description: '让可验证、可替换的 AI 生产方法成为公共能力。',
      defaultLocale: 'root',
      locales: {
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      customCss: ['./src/styles/starlight.css'],
      components: {
        Head: './src/components/DocsHead.astro',
        Header: './src/components/DocsHeader.astro',
        MobileMenuFooter: './src/components/DocsMobileMenuFooter.astro',
        ThemeProvider: './src/components/DocsThemeProvider.astro',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/lidessen/rossovia',
        },
      ],
      sidebar: [
        {
          label: '开始',
          items: [
            { label: '文档入口', slug: 'docs' },
            { label: '原则序列', slug: 'docs/principles/sequence' },
          ],
        },
        {
          label: '方法',
          items: [
            { label: '技能目录', slug: 'docs/skills' },
            ...skillGuideItems,
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#f3eddf' },
        },
      ],
    }),
  ],
});
