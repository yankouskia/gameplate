import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const ORG = 'yankouskia';
const REPO = 'gameplate';
const SITE_URL = `https://${ORG}.github.io`;
const BASE_URL = `/${REPO}/`;

const config: Config = {
  title: 'gameplate',
  tagline: 'Tiny, zero-dependency, fully-typed TypeScript framework for browser & headless games.',
  favicon: 'img/favicon.svg',

  url: SITE_URL,
  baseUrl: BASE_URL,

  organizationName: ORG,
  projectName: REPO,
  trailingSlash: false,

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
        searchBarShortcutHint: false,
        searchBarPosition: 'right',
        explicitSearchResultPath: true,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `https://github.com/${ORG}/${REPO}/edit/master/website/`,
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    metadata: [
      {
        name: 'keywords',
        content:
          'gameplate, game engine, typescript, game loop, fsm, state machine, headless game, canvas, webgl',
      },
      { name: 'theme-color', content: '#7c3aed' },
    ],
    announcementBar: {
      id: 'star-on-github',
      content:
        '⭐ Star <a target="_blank" rel="noopener" href="https://github.com/yankouskia/gameplate">gameplate on GitHub</a> if it saves you a weekend.',
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
      isCloseable: true,
    },
    navbar: {
      title: 'gameplate',
      logo: {
        alt: 'gameplate',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      hideOnScroll: true,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api',
          label: 'API',
          position: 'left',
        },
        {
          to: '/docs/examples/pong',
          label: 'Examples',
          position: 'left',
        },
        {
          href: 'https://www.npmjs.com/package/gameplate',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/yankouskia/gameplate',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Quickstart', to: '/docs/getting-started/quickstart' },
            { label: 'API Reference', to: '/docs/api' },
          ],
        },
        {
          title: 'Guides',
          items: [
            { label: 'State & Actions', to: '/docs/guides/state-and-actions' },
            { label: 'Game Loop', to: '/docs/guides/loop' },
            { label: 'Input', to: '/docs/guides/input' },
            { label: 'Scenes (FSM)', to: '/docs/guides/scenes' },
            { label: 'Selectors', to: '/docs/guides/selectors' },
            { label: 'Headless / Node', to: '/docs/guides/headless' },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/yankouskia/gameplate/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/yankouskia/gameplate/issues',
            },
            {
              label: 'Sponsor',
              href: 'https://github.com/sponsors/yankouskia',
            },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'npm', href: 'https://www.npmjs.com/package/gameplate' },
            { label: 'Source', href: 'https://github.com/yankouskia/gameplate' },
            { label: 'Changelog', href: 'https://github.com/yankouskia/gameplate/releases' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Alex Yankouski. Built with Docusaurus + ☕.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'json', 'tsx', 'diff'],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: false,
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
