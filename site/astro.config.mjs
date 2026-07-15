import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const publicSite = process.env.SITE_URL ?? 'https://skills.angineer.dev';

export default defineConfig({
  site: publicSite,
  output: 'static',
  integrations: [
    starlight({
      disable404Route: true,
      title: 'Skills',
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
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/lidessen/skills',
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
            {
              label: 'Context Engineering',
              slug: 'docs/skills/context-engineering',
            },
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
